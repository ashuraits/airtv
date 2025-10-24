import React, { useState, useEffect } from 'react';
import './settings.css';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function SettingsApp() {
  const [activeSection, setActiveSection] = useState('player');
  const [userAgent, setUserAgent] = useState(DEFAULT_USER_AGENT);
  const [tempUserAgent, setTempUserAgent] = useState(DEFAULT_USER_AGENT);

  useEffect(() => {
    loadSettings();
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

  const sections = [
    { id: 'player', label: 'Player', icon: '▶' },
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
              <span className="nav-icon">{section.icon}</span>
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
              <label className="settings-label">
                User-Agent
                <span className="settings-hint">Used for HLS stream requests</span>
              </label>
              <textarea
                className="settings-textarea"
                value={tempUserAgent}
                onChange={(e) => setTempUserAgent(e.target.value)}
                rows={3}
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
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsApp;
