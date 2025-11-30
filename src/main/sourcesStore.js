const { randomUUID } = require('crypto');

function now() {
  return Date.now();
}

function ensureArrays(store) {
  if (!store.has('sources')) store.set('sources', []);
  if (!store.has('groups')) store.set('groups', []);
  if (!store.has('channels')) store.set('channels', []);
}

function initialize(store) {
  ensureArrays(store);
}

// Favorites helper (kept here as part of storage domain)
function cleanupFavoritesByUrls(store, urls) {
  if (!urls || urls.size === 0) return;
  try {
    const favs = store.get('favorites', []);
    if (!Array.isArray(favs) || favs.length === 0) return;
    const kept = favs.filter(f => f && f.url && !urls.has(f.url));
    if (kept.length !== favs.length) store.set('favorites', kept);
  } catch (_) {}
}

function migrateIfNeeded(store) {
  ensureArrays(store);
  const migrated = store.get('multiSourceMigrated', false);
  if (migrated) return { migrated: false };

  const legacy = store.get('currentPlaylist', null);
  if (!legacy || !legacy.categories) return { migrated: false };

  const groups = store.get('groups');
  const channels = store.get('channels');
  const sources = store.get('sources');

  if (sources.length || groups.length || channels.length) {
    store.set('multiSourceMigrated', true);
    return { migrated: false };
  }

  const sourceId = randomUUID();
  const playlistPath = store.get('playlistPath', '');
  const source = {
    id: sourceId,
    type: 'file',
    name: playlistPath ? `File: ${playlistPath.split('/').pop()}` : 'Legacy Playlist',
    enabled: true,
    lastSync: now(),
    autoSyncOnLaunch: false,
    uri: playlistPath || '',
    importConfig: { mode: 'create-from-categories' }
  };

  const newGroups = [];
  const groupIdByName = {};
  Object.keys(legacy.categories).forEach((name, idx) => {
    const gid = randomUUID();
    groupIdByName[name] = gid;
    newGroups.push({ id: gid, name, order: idx });
  });

  const newChannels = [];
  const urlToChannel = new Map(); // Track URL → channel for favorites migration

  Object.entries(legacy.categories).forEach(([cat, list]) => {
    const gid = groupIdByName[cat];
    list.forEach((ch) => {
      const channel = {
        id: randomUUID(),
        name: ch.name || 'Channel',
        url: ch.url,
        logo: ch.logo || '',
        tvgId: ch.tvgId || '',
        sourceId,
        groupId: gid,
        createdAt: now(),
        updatedAt: now(),
      };
      newChannels.push(channel);
      if (ch.url) urlToChannel.set(ch.url, channel);
    });
  });

  // Migrate favorites: update structure to match new channels
  try {
    const oldFavs = store.get('favorites', []);
    if (Array.isArray(oldFavs) && oldFavs.length > 0) {
      const newFavs = [];
      oldFavs.forEach(fav => {
        if (!fav || !fav.url) return;
        const ch = urlToChannel.get(fav.url);
        if (ch) {
          // Update favorite with new channel structure
          newFavs.push({
            id: ch.id,
            name: ch.name,
            url: ch.url,
            logo: ch.logo,
            tvgId: ch.tvgId,
            sourceId: ch.sourceId,
            groupId: ch.groupId,
          });
        }
        // Skip favorites that don't exist in migrated channels
      });
      store.set('favorites', newFavs);
    }
  } catch (_) {}

  store.set('sources', [source]);
  store.set('groups', newGroups);
  store.set('channels', newChannels);
  store.set('multiSourceMigrated', true);

  // Cleanup old data after successful migration
  try {
    store.delete('currentPlaylist');
    store.delete('playlistPath');
  } catch (_) {}

  return { migrated: true, sourceId, groups: newGroups.length, channels: newChannels.length };
}

function listSources(store) {
  return store.get('sources', []);
}

function addSource(store, payload) {
  const src = {
    id: randomUUID(),
    type: payload.type,
    name: payload.name || 'Source',
    enabled: payload.enabled !== false,
    lastSync: null,
    autoSyncOnLaunch: !!payload.autoSyncOnLaunch,
    uri: payload.uri || '',
    meta: payload.meta || undefined,
    importConfig: payload.importConfig || { mode: 'no-groups' },
  };
  const list = store.get('sources', []);
  list.push(src);
  store.set('sources', list);
  return src;
}

function updateSource(store, sourceId, data) {
  const list = store.get('sources', []);
  const idx = list.findIndex(s => s.id === sourceId);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  store.set('sources', list);
  return list[idx];
}

function deleteSource(store, sourceId) {
  const sources = store.get('sources', []);
  const filtered = sources.filter(s => s.id !== sourceId);
  store.set('sources', filtered);
  const channels = store.get('channels', []);
  const removed = channels.filter(c => c.sourceId === sourceId);
  const remaining = channels.filter(c => c.sourceId !== sourceId);
  store.set('channels', remaining);

  // cleanup favorites for removed channels
  cleanupFavoritesByUrls(store, new Set(removed.map(c => c.url).filter(Boolean)));
  return { success: true };
}

async function resyncSource(store, sourceId) {
  // Incremental by default: diff + apply
  const importer = require('./importer');
  try {
    const sources = store.get('sources', []);
    const src = sources.find(s => s.id === sourceId);
    if (!src) return { success: false, error: 'Source not found' };
    const diff = await importer.diffSource(store, sourceId);
    return await importer.applyDiff(store, sourceId, src.importConfig, diff);
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

async function resyncPreview(store, sourceId) {
  const importer = require('./importer');
  try {
    const diff = await importer.diffSource(store, sourceId);
    return { success: true, counts: diff.counts, sample: diff.sample };
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

async function resyncApply(store, sourceId) {
  const importer = require('./importer');
  try {
    const sources = store.get('sources', []);
    const src = sources.find(s => s.id === sourceId);
    if (!src) return { success: false, error: 'Source not found' };
    const diff = await importer.diffSource(store, sourceId);
    return await importer.applyDiff(store, sourceId, src.importConfig, diff);
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

function listGroups(store) {
  return store.get('groups', []);
}

function createGroup(store, name) {
  const groups = store.get('groups', []);
  const g = { id: randomUUID(), name, order: groups.length };
  groups.push(g);
  store.set('groups', groups);
  return g;
}

function renameGroup(store, groupId, name) {
  const groups = store.get('groups', []);
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) return null;
  groups[idx] = { ...groups[idx], name };
  store.set('groups', groups);
  return groups[idx];
}

function deleteGroup(store, groupId, strategy) {
  const groups = store.get('groups', []);
  const channels = store.get('channels', []);
  const remainingGroups = groups.filter(g => g.id !== groupId);
  store.set('groups', remainingGroups);
  if (strategy === 'delete-channels') {
    const removed = channels.filter(c => c.groupId === groupId);
    const remainingChannels = channels.filter(c => c.groupId !== groupId);
    store.set('channels', remainingChannels);
    // cleanup favorites for removed channels
    cleanupFavoritesByUrls(store, new Set(removed.map(c => c.url).filter(Boolean)));
  } else {
    const updated = channels.map(c => (c.groupId === groupId ? { ...c, groupId: null, updatedAt: now() } : c));
    store.set('channels', updated);
  }
  return { success: true };
}

function listChannels(store, filters = {}) {
  const { sourceId, groupId, search } = filters;
  let list = store.get('channels', []);
  if (sourceId) list = list.filter(c => c.sourceId === sourceId);
  if (groupId !== undefined && groupId !== null) list = list.filter(c => c.groupId === groupId);
  if (search) list = list.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()));
  return list;
}

function moveChannels(store, channelIds, targetGroupId) {
  const channels = store.get('channels', []);
  const setIds = new Set(channelIds);
  const updated = channels.map(c => (setIds.has(c.id) ? { ...c, groupId: targetGroupId || null, updatedAt: now() } : c));
  store.set('channels', updated);
  return { success: true };
}

function deleteChannels(store, channelIds) {
  const channels = store.get('channels', []);
  const setIds = new Set(channelIds);
  // collect URLs for favorites cleanup
  const toDelete = channels.filter(c => setIds.has(c.id));
  const deletedUrls = new Set(toDelete.map(c => c.url).filter(Boolean));

  const filtered = channels.filter(c => !setIds.has(c.id));
  store.set('channels', filtered);

  // cleanup favorites by URL match
  cleanupFavoritesByUrls(store, deletedUrls);

  // Auto-delete only affected groups that became empty (optimized check)
  try {
    const removedGroupIds = new Set(toDelete.map(c => c.groupId).filter(Boolean));
    if (removedGroupIds.size) {
      const stillUsed = new Set(filtered.map(c => c.groupId).filter(Boolean));
      const toDeleteGroupIds = [...removedGroupIds].filter(id => !stillUsed.has(id));
      if (toDeleteGroupIds.length) {
        const delSet = new Set(toDeleteGroupIds);
        const groups = store.get('groups', []);
        const newGroups = groups.filter(g => !delSet.has(g.id));
        if (newGroups.length !== groups.length) store.set('groups', newGroups);
      }
    }
  } catch (_) {}

  return { success: true };
}

function reorderGroups(store, newOrderIds) {
  const groups = store.get('groups', []);
  if (!groups.length) return { success: true };

  // Create a map for quick lookup
  const groupMap = new Map(groups.map(g => [g.id, g]));
  
  // Create new array based on order IDs
  const newGroups = [];
  newOrderIds.forEach((id, index) => {
    const group = groupMap.get(id);
    if (group) {
      newGroups.push({ ...group, order: index });
      groupMap.delete(id);
    }
  });

  // Append any remaining groups that weren't in the order list (safety fallback)
  groupMap.forEach((group) => {
    newGroups.push({ ...group, order: newGroups.length });
  });

  store.set('groups', newGroups);
  return { success: true };
}

module.exports = {
  initialize,
  migrateIfNeeded,
  listSources,
  addSource,
  updateSource,
  deleteSource,
  resyncSource,
  resyncPreview,
  resyncApply,
  listGroups,
  createGroup,
  renameGroup,
  deleteGroup,
  listChannels,
  moveChannels,
  deleteChannels,
  cleanupFavoritesByUrls,
  reorderGroups,
};
