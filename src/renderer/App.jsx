import React, { useState, useEffect } from 'react';
import './App.css';
import { Loading, MainContent } from './components';
import GroupsTree from './components/GroupsTree';
import SourceFilter from './components/SourceFilter';
import SearchInput from '../shared/components/SearchInput';
import ImportWizard from './components/ImportWizard';
import MoveToGroup from './components/MoveToGroup';
import { FavoriteIcon } from '../shared/components/FavoriteButton';
import StartupSyncModal from './components/StartupSyncModal';
import { ToastProvider, useToast } from './components/Toast';

function AppInner() {
  const { show } = useToast();
  const [globalSearch, setGlobalSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  // Multi-source state
  const [sources, setSources] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sourceFilter, setSourceFilter] = useState(undefined); // undefined == all
  const [selectedGroupId, setSelectedGroupId] = useState('__favorites__'); // default to Favorites
  const [channels, setChannels] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [startupPreviews, setStartupPreviews] = useState([]);
  const [showStartupModal, setShowStartupModal] = useState(false);
  // no legacy flag

  useEffect(() => {
    init();
  }, []);

  // Listen for library refresh notifications from main (e.g., Settings re-sync)
  useEffect(() => {
    const unsubscribe = window.electronAPI.onFromMain('library:refresh', async () => {
      try {
        const srcs = await window.electronAPI.sourcesList();
        const grps = await window.electronAPI.groupsList();
        setSources(srcs || []);
        setGroups(grps || []);
        await refreshChannels(srcs, sourceFilter);
      } catch (e) {
        console.error('Failed to refresh library:', e);
      }
    });
    return () => { try { unsubscribe && unsubscribe(); } catch (_) {} };
  }, [sourceFilter]);

  // legacy default removed

  const init = async () => {
    try {
      const srcs = await window.electronAPI.sourcesList();
      const grps = await window.electronAPI.groupsList();
      setSources(srcs || []);
      setGroups(grps || []);
      await refreshChannels(srcs, undefined);
      const favs = await window.electronAPI.getFavorites();
      setFavorites(favs || []);
      // Startup auto-sync preview — disabled for now.
      // Reason: channel/group restoration on re-sync can recreate groups/channels
      // after user deletes or rearranges them. We'll re-enable after improved
      // incremental rules (mapping/overrides) are in place.
      const ENABLE_STARTUP_SYNC = false; // feature toggle
      if (ENABLE_STARTUP_SYNC) {
        const auto = (srcs || []).filter(s => s.autoSyncOnLaunch && (s.type === 'url' || s.type === 'xtream'));
        const previews = [];
        for (const s of auto) {
          try {
            const res = await window.electronAPI.sourcesResyncPreview(s.id);
            if (res && res.success && res.counts && (res.counts.added || res.counts.updated || res.counts.removed)) {
              previews.push({ source: s, counts: res.counts });
            }
          } catch (_) {}
        }
        if (previews.length > 0) {
          setStartupPreviews(previews);
          setShowStartupModal(true);
        }
      }
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshChannels = async (srcsArg, srcFilterArg) => {
    // Fetch channels for current or provided filter
    const effectiveSrcs = srcsArg !== undefined ? srcsArg : sources;
    const effectiveFilter = (srcFilterArg !== undefined) ? srcFilterArg : sourceFilter;
    const filters = {};
    if (effectiveFilter) filters.sourceId = effectiveFilter;
    const list = await window.electronAPI.channelsList(filters);
    setChannels(list || []);
    if (effectiveSrcs) setSources(effectiveSrcs);
  };

  const refreshGroups = async () => {
    const grps = await window.electronAPI.groupsList();
    setGroups(grps || []);
  };

  const toggleFavorite = async (channel) => {
    const isFav = favorites.find(f => f.url === channel.url);
    if (isFav) {
      const updated = await window.electronAPI.removeFavorite(channel.url);
      setFavorites(updated);
    } else {
      const updated = await window.electronAPI.addFavorite(channel);
      setFavorites(updated);
    }
  };

  // legacy load removed

  const handlePlayChannel = async (channel, explicitList) => {
    try {
      // Use provided list from UI when available to avoid mismatch
      const channelList = explicitList || getDisplayChannelsMultiSource();
      const currentIndex = channelList.findIndex(c => c.url === channel.url);
      const isFavorite = favorites.some(f => f.url === channel.url);

      await window.electronAPI.playChannel({
        channel,
        channelList,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        isFavorite
      });
    } catch (error) {
      console.error('Error playing channel:', error);
      alert('Failed to open player window.');
    }
  };

  const getDisplayChannelsMultiSource = () => {
    const listForSource = sourceFilter ? channels.filter(c => c.sourceId === sourceFilter) : channels;
    if (globalSearch) {
      return listForSource.filter(c => c.name.toLowerCase().includes(globalSearch.toLowerCase()));
    }
    let display = listForSource;
    if (selectedGroupId !== undefined) {
      if (selectedGroupId === null) display = listForSource.filter(c => !c.groupId);
      else display = listForSource.filter(c => c.groupId === selectedGroupId);
      if (categorySearch) display = display.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    }
    return display;
  };

  // legacy helpers removed

  if (loading) {
    return <Loading />;
  }

  // Show empty state if no sources
  if (sources.length === 0) {
    return (
      <>
        <EmptyState onLoadSource={() => setShowWizard(true)} />
        <ImportWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          groups={groups}
          onCreated={async () => {
            const srcs = await window.electronAPI.sourcesList();
            const grps = await window.electronAPI.groupsList();
            setSources(srcs || []);
            setGroups(grps || []);
            await refreshChannels(srcs, sourceFilter);
          }}
        />
      </>
    );
  }

  // Multi-source UI (always)
    // Compute display channels
    const listForSource = sourceFilter ? channels.filter(c => c.sourceId === sourceFilter) : channels;
    const byGroup = new Map();
    let ungrouped = 0;
    listForSource.forEach(c => {
      if (c.groupId) {
        byGroup.set(c.groupId, (byGroup.get(c.groupId) || 0) + 1);
      } else {
        ungrouped += 1;
      }
    });
    const counts = Object.fromEntries(byGroup.entries());
    counts['__ungrouped__'] = ungrouped;

    // Attach source info for badge
    const srcMap = new Map((sources || []).map(s => [s.id, s]));
    let display = listForSource.map(c => ({
      ...c,
      sourceInfo: srcMap.has(c.sourceId) ? { label: (srcMap.get(c.sourceId).name || 'SRC').slice(0, 2).toUpperCase(), title: srcMap.get(c.sourceId).name } : undefined
    }));
    if (globalSearch) {
      display = display.filter(c => c.name.toLowerCase().includes(globalSearch.toLowerCase()));
    } else if (selectedGroupId !== undefined) {
      if (selectedGroupId === '__favorites__') {
        const favUrls = new Set(favorites.map(f => f.url));
        display = display.filter(c => favUrls.has(c.url));
      } else if (selectedGroupId === null) {
        display = display.filter(c => !c.groupId);
      } else {
        display = display.filter(c => c.groupId === selectedGroupId);
      }
      if (categorySearch) display = display.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    }

    const displayCategoryText = globalSearch
      ? `Search: "${globalSearch}"`
      : selectedGroupId === undefined
        ? 'All Channels'
        : selectedGroupId === '__favorites__'
          ? 'Favorites'
          : selectedGroupId === null
            ? 'Ungrouped'
            : (groups.find(g => g.id === selectedGroupId)?.name || 'Group');

    const displayCategory = selectedGroupId === '__favorites__' ? (
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FavoriteIcon filled={true} size={24} />
        {displayCategoryText}
      </span>
    ) : displayCategoryText;

    const onAddSource = () => setShowWizard(true);
    const onToggle = async (s) => {
      const updated = await window.electronAPI.sourcesUpdate(s.id, { enabled: !s.enabled });
      const srcs = await window.electronAPI.sourcesList();
      setSources(srcs);
      await refreshChannels(srcs, sourceFilter);
    };
    const onResync = async (s) => {
      await window.electronAPI.sourcesResync(s.id);
      await refreshChannels();
    };
    const onDelete = async (s) => {
      if (!confirm('Delete source and its channels?')) return;
      await window.electronAPI.sourcesDelete(s.id);
      const srcs = await window.electronAPI.sourcesList();
      setSources(srcs);
      await refreshChannels(srcs, sourceFilter && srcs.find(x => x.id === sourceFilter) ? sourceFilter : undefined);
    };

    const handleOpenSettings = async () => {
      // Open settings window via IPC
      await window.electronAPI.openSettings();
    };

    return (
      <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="app-title">AirTV</h1>
            <div className="header-actions">
              <button onClick={onAddSource} className="settings-btn" title="Add Source">+</button>
              <button onClick={handleOpenSettings} className="settings-btn" title="Settings">⚙</button>
            </div>
          </div>

          {/* sources section removed */}

          <div className="search-box">
            <SearchInput
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search all channels..."
              className="search-input"
            />
          </div>
          <div className="search-box">
            <SourceFilter
              sources={sources}
              value={sourceFilter}
              onChange={(v) => {
                setSourceFilter(v);
                // Pass null to explicitly clear filter when selecting 'All'
                refreshChannels(undefined, v === undefined ? null : v);
              }}
            />
          </div>

          <GroupsTree
            groups={groups}
            counts={counts}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            favoritesCount={favorites.length}
            totalChannels={channels.length}
            onRenameGroup={async (id, name) => {
              await window.electronAPI.groupRename(id, name);
              await refreshGroups();
            }}
            onDeleteGroup={async (id, strategy) => {
              await window.electronAPI.groupDelete(id, strategy);
              await refreshGroups();
              await refreshChannels();
              if (selectedGroupId === id) setSelectedGroupId(undefined);
            }}
          />
        </aside>
        <MainContent
          displayCategory={displayCategory}
          globalSearch={globalSearch}
          categorySearch={categorySearch}
          setCategorySearch={setCategorySearch}
          filteredChannels={display}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onPlayChannel={handlePlayChannel}
          selectedIds={selectedIds}
          onToggleSelect={(ch) => {
            setSelectedIds((prev) => prev.includes(ch.id) ? prev.filter(id => id !== ch.id) : [...prev, ch.id]);
          }}
          onMoveRequested={() => setShowMoveDialog(true)}
          onUngroupRequested={async () => {
            if (selectedIds.length === 0) return;
            await window.electronAPI.channelsMove(selectedIds, null);
            setSelectedIds([]);
            await refreshChannels();
            show('Ungrouped');
          }}
          onClearSelection={() => setSelectedIds([])}
          onSelectAll={() => setSelectedIds(display.map(ch => ch.id))}
          onDeleteSelected={async () => {
            if (selectedIds.length === 0) return;
            // Add note: deleting channels can remove empty groups
            const msg = `Delete ${selectedIds.length} channel(s)?\n\nNote: groups that become empty after this action will be deleted.`;
            if (!confirm(msg)) return;
            await window.electronAPI.channelsDelete(selectedIds);
            setSelectedIds([]);
            const grps = await window.electronAPI.groupsList();
            setGroups(grps || []);
            await refreshChannels();
            setSelectedGroupId('__favorites__');
            show('Deleted');
          }}
        />
      </div>
        <ImportWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          groups={groups}
          onCreated={async () => {
            const srcs = await window.electronAPI.sourcesList();
            const grps = await window.electronAPI.groupsList();
            setSources(srcs || []);
            setGroups(grps || []);
            await refreshChannels(srcs, sourceFilter);
          }}
        />
        <MoveToGroup
          open={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          groups={groups}
          onConfirm={async (targetGroupId) => {
            if (selectedIds.length === 0) return;
            await window.electronAPI.channelsMove(selectedIds, targetGroupId);
            setSelectedIds([]);
            const grps = await window.electronAPI.groupsList();
            setGroups(grps || []);
            await refreshChannels();
            show('Moved');
          }}
        />
        <StartupSyncModal
          open={showStartupModal}
          previews={startupPreviews}
          onSkipAll={() => setShowStartupModal(false)}
          onApplyAll={async () => {
            try {
              for (const p of startupPreviews) {
                await window.electronAPI.sourcesResyncApply(p.source.id);
              }
              setShowStartupModal(false);
              const grps = await window.electronAPI.groupsList();
              setGroups(grps || []);
              await refreshChannels();
            } catch (e) {
              console.error(e);
              setShowStartupModal(false);
            }
          }}
          onApplyOne={async (sourceId) => {
            await window.electronAPI.sourcesResyncApply(sourceId);
            const nxt = startupPreviews.filter(p => p.source.id !== sourceId);
            setStartupPreviews(nxt);
            if (nxt.length === 0) setShowStartupModal(false);
            const grps = await window.electronAPI.groupsList();
            setGroups(grps || []);
            await refreshChannels();
          }}
        />
      </>
    );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
