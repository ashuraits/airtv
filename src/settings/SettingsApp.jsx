import React, { useState, useEffect } from 'react';
import './settings.css';
import ResyncModal from './components/ResyncModal';
import { ToastProvider, useToast } from '../renderer/components/Toast';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function SettingsAppInner() {
  const [activeSection, setActiveSection] = useState('player');
  const [userAgent, setUserAgent] = useState(DEFAULT_USER_AGENT);
  const [tempUserAgent, setTempUserAgent] = useState(DEFAULT_USER_AGENT);
  const [sources, setSources] = useState([]);
  const [resyncState, setResyncState] = useState({ open: false, source: null, counts: null });
  const { show } = useToast();

  useEffect(() => {
    loadSettings();
    loadSources();
  }, []);

  const loadSettings = async () => {
    const settings = await window.electronAPI.getSettings();
    const ua = settings.userAgent || DEFAULT_USER_AGENT;
    setUserAgent(ua);
    setTempUserAgent(ua);
  };

  const handleSave = async () => {
    await window.electronAPI.saveSettings({ userAgent: tempUserAgent });
    setUserAgent(tempUserAgent);
  };

  const handleReset = () => {
    setTempUserAgent(DEFAULT_USER_AGENT);
  };

  // Sources management
  
  const loadSources = async () => {
    try {
      const list = await window.electronAPI.sourcesList();
      setSources(list || []);
    } catch (_) {}
  };

  const toggleAutoSync = async (s) => {
    await window.electronAPI.sourcesUpdate(s.id, { autoSyncOnLaunch: !s.autoSyncOnLaunch });
    await loadSources();
  };

  const deleteSource = async (s) => {
    if (!confirm('Delete source and its channels?')) return;
    await window.electronAPI.sourcesDelete(s.id);
    await loadSources();
    show('Source deleted');
  };

  const resyncWithPreview = async (s) => {
    const res = await window.electronAPI.sourcesResyncPreview(s.id);
    if (!res || !res.success) {
      alert('Failed to preview re-sync');
      return;
    }
    const counts = res.counts || { added: 0, updated: 0, removed: 0 };
    if (!counts.added && !counts.updated && !counts.removed) {
      alert('No changes');
      return;
    }
    setResyncState({ open: true, source: s, counts, sample: res.sample });
  };

  const sections = [
    { id: 'player', label: 'Player', icon: '▶' },
    { id: 'sources', label: 'Sources', icon: 'sources' },
  ];

  return (
    <div className="settings-app">
      <div className="settings-sidebar">
        <div className="settings-header">
          <h1>Settings</h1>
        </div>
        <div className="settings-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">
                {section.icon === 'sources' ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
                    <path d="M5 5L7 7M13 5L11 7M5 13L7 11M13 13L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M3 3L6 6M15 3L12 6M3 15L6 12M15 15L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <path d="M9 2V4M9 14V16M2 9H4M14 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  section.icon
                )}
              </span>
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-content">
        {activeSection === 'player' && (
          <div className="settings-section">
            <h2>Player Settings</h2>

            <div className="settings-group">
              <div className="settings-card">
                <label className="settings-label">
                  User-Agent
                  <span className="settings-hint">Custom User-Agent string used for HLS stream requests</span>
                </label>
                <textarea
                  className="settings-textarea"
                  value={tempUserAgent}
                  onChange={(e) => setTempUserAgent(e.target.value)}
                  rows={4}
                  placeholder="Enter custom User-Agent..."
                />
                <div className="settings-actions">
                  <button
                    className="btn-secondary"
                    onClick={handleReset}
                    disabled={tempUserAgent === DEFAULT_USER_AGENT}
                  >
                    Reset to Default
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={tempUserAgent === userAgent}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'sources' && (
          <div className="settings-section">
            <h2>Sources</h2>

            <div className="settings-group">
              {(!sources || sources.length === 0) && (
                <div style={{ color: '#999', fontSize: '14px', padding: '40px 20px', textAlign: 'center' }}>
                  No sources yet. Use + button in main window.
                </div>
              )}
              {sources && sources.map((s) => (
                <div key={s.id} className="source-item">
                  <div className="source-info">
                    <div className="source-name">{s.name}</div>
                    <div className="source-meta">
                      <span className="source-type">{s.type.toUpperCase()}</span>
                      <span className="source-sync">{s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Never synced'}</span>
                    </div>
                  </div>
                  <div className="source-controls">
                    {(s.type === 'url' || s.type === 'xtream') && (
                      <label className="source-toggle">
                        <input type="checkbox" checked={!!s.autoSyncOnLaunch} onChange={() => toggleAutoSync(s)} />
                        <span>Auto sync</span>
                      </label>
                    )}
                  </div>
                  <div className="source-actions">
                    <button className="btn-secondary" onClick={() => resyncWithPreview(s)}>Re-sync</button>
                    <button className="btn-secondary btn-danger" onClick={() => deleteSource(s)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <ResyncModal
              open={resyncState.open}
              source={resyncState.source}
              counts={resyncState.counts}
              sample={resyncState.sample}
              onCancel={() => setResyncState({ open: false, source: null, counts: null })}
              onApply={async () => {
                if (!resyncState.source) return;
                const apply = await window.electronAPI.sourcesResyncApply(resyncState.source.id);
                setResyncState({ open: false, source: null, counts: null });
                await loadSources();
                if (!apply || !apply.success) show('Re-sync failed', 'error');
                else show('Re-sync applied');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
export default function SettingsApp() {
  return (
    <ToastProvider>
      <SettingsAppInner />
    </ToastProvider>
  );
}
