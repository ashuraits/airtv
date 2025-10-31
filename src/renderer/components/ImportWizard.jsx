import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';

// Minimal Add Source wizard (modal)

export default function ImportWizard({ open, onClose, groups, onCreated }) {
  if (!open) return null;

  const [type, setType] = useState('url');
  const [name, setName] = useState('');
  const [uri, setUri] = useState('');
  const [xtServer, setXtServer] = useState('');
  const [xtUser, setXtUser] = useState('');
  const [xtPass, setXtPass] = useState('');
  const [mode, setMode] = useState('create-from-categories');
  const [singleGroupId, setSingleGroupId] = useState('');
  const [singleGroupNew, setSingleGroupNew] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [mappingCats, setMappingCats] = useState([]);
  const [mapping, setMapping] = useState({});

  // Reset errors when switching source type
  useEffect(() => {
    setTouched({});
    setFieldErrors({});
  }, [type]);

  // Simple validators (comments in English only)
  const isHttpUrl = (u) => {
    try { const o = new URL(u); return o.protocol === 'http:' || o.protocol === 'https:'; } catch { return false; }
  };
  const looksLikeFile = (p) => !!p && /\.(m3u8?|txt)$/i.test(p.trim());
  const validXtreamServer = (s) => !!s && /^(https?:\/\/)?[a-z0-9.-]+(?::\d{1,5})?(?:\/.*)?$/i.test(s.trim());

  const validateField = (field) => {
    // Validate individual field
    if (field === 'file' && type === 'file') {
      if (!uri) return 'Select .m3u/.m3u8 file';
      if (!looksLikeFile(uri)) return 'File should look like .m3u or .m3u8';
    }
    if (field === 'url' && type === 'url') {
      if (!uri) return 'Enter URL';
      if (!isHttpUrl(uri)) return 'URL must start with http/https';
    }
    if (field === 'server' && type === 'xtream') {
      if (!validXtreamServer(xtServer)) return 'Enter valid server';
    }
    if (field === 'user' && type === 'xtream') {
      if (!xtUser) return 'Username required';
    }
    if (field === 'pass' && type === 'xtream') {
      if (!xtPass) return 'Password required';
    }
    return null;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const validate = () => {
    // Full validation on submit
    if (type === 'file') {
      if (!uri) return 'Select .m3u/.m3u8 file';
      if (!looksLikeFile(uri)) return 'File should look like .m3u or .m3u8';
    }
    if (type === 'url') {
      if (!uri) return 'Enter URL';
      if (!isHttpUrl(uri)) return 'URL must start with http/https';
    }
    if (type === 'xtream') {
      if (!validXtreamServer(xtServer)) return 'Enter valid server';
      if (!xtUser) return 'Username required';
      if (!xtPass) return 'Password required';
    }
    if (mode === 'mapping' && mappingCats.length === 0) {
      return 'Load categories first';
    }
    return null;
  };

  const ensureSingleGroupId = async () => {
    // Ensure group exists for single-group mode
    if (mode !== 'single-group') return undefined;
    if (singleGroupId) return singleGroupId;
    if (singleGroupNew.trim()) {
      const created = await window.electronAPI.groupCreate(singleGroupNew.trim());
      return created?.id;
    }
    return undefined;
  };

  const buildPayload = async () => {
    // Build sources:add payload
    const importConfig = { mode };
    if (mode === 'single-group') {
      const gid = await ensureSingleGroupId();
      importConfig.targetGroupId = gid || null;
    }
    if (mode === 'mapping') {
      importConfig.categoryMap = mapping || {};
    }

    const base = {
      type,
      name: name || defaultName(),
      enabled: true,
      autoSyncOnLaunch: type !== 'file' ? autoSync : false,
      importConfig,
    };

    if (type === 'file') return { ...base, uri };
    if (type === 'url') return { ...base, uri };
    if (type === 'xtream') return { ...base, meta: { origin: { server: xtServer, user: xtUser, pass: xtPass } } };
    throw new Error('Unknown type');
  };

  const defaultName = () => {
    if (type === 'file') return uri ? `File: ${uri.split('/').pop()}` : 'File Source';
    if (type === 'url') try { return new URL(uri).hostname; } catch { return 'URL Source'; }
    if (type === 'xtream') return xtServer || 'Xtream';
    return 'Source';
  };

  const pickFile = async () => {
    const path = await window.electronAPI.openM3UDialog();
    if (path) setUri(path);
  };

  const testConnection = async () => {
    // Test connection without adding source
    const validationError = validate();
    if (validationError) {
      show(validationError, 'error');
      return;
    }

    try {
      setBusy(true);
      const payload = await buildPayload();

      const res = await window.electronAPI.sourcesTestConnection(payload);
      if (res && res.success) {
        show('Connection successful', 'success');
      } else {
        throw new Error(res?.error || 'Connection failed');
      }
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      show(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    // Validate first
    const validationError = validate();
    if (validationError) {
      show(validationError, 'error');
      return;
    }

    try {
      setBusy(true);
      const payload = await buildPayload();

      // Test connection first
      const testRes = await window.electronAPI.sourcesTestConnection(payload);
      if (!testRes || !testRes.success) {
        throw new Error(testRes?.error || 'Connection test failed - please check your settings');
      }

      const src = await window.electronAPI.sourcesAdd(payload);
      if (!src || !src.id) throw new Error('Failed to add source');
      await window.electronAPI.sourcesResync(src.id);
      show('Source added', 'success');
      await onCreated?.();
      onClose();
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      show(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal">
        <h2>Add Source</h2>

        <div className="modal-section">
          <label>Source Type</label>
          <div className="radio-row">
            <label>
              <input type="radio" checked={type==='file'} onChange={() => setType('file')} /> File
            </label>
            <label>
              <input type="radio" checked={type==='url'} onChange={() => setType('url')} /> URL
            </label>
            <label>
              <input type="radio" checked={type==='xtream'} onChange={() => setType('xtream')} /> Xtream
            </label>
          </div>
        </div>

        <div className="modal-section">
          <label>Source Name</label>
          <input className="search-input" value={name} onChange={(e)=>setName(e.target.value)} placeholder={defaultName()} />
        </div>

        {type === 'file' && (
          <div className="modal-section">
            <label>M3U File</label>
            <div className="row-gap">
              <input
                className="search-input"
                value={uri}
                onChange={(e)=>setUri(e.target.value)}
                onBlur={()=>handleBlur('file')}
                placeholder="/path/to/playlist.m3u"
              />
              <button className="btn-secondary" onClick={pickFile}>Browse</button>
            </div>
            {touched.file && fieldErrors.file && <div className="error-text" style={{ marginTop: 6 }}>{fieldErrors.file}</div>}
          </div>
        )}

        {type === 'url' && (
          <div className="modal-section">
            <label>M3U URL</label>
            <input
              className="search-input"
              value={uri}
              onChange={(e)=>setUri(e.target.value)}
              onBlur={()=>handleBlur('url')}
              placeholder="https://example.com/playlist.m3u8"
            />
            {touched.url && fieldErrors.url && <div className="error-text" style={{ marginTop: 6 }}>{fieldErrors.url}</div>}
          </div>
        )}

        {type === 'xtream' && (
          <>
            <div className="modal-section">
              <label>Server</label>
              <input
                className="search-input"
                value={xtServer}
                onChange={(e)=>setXtServer(e.target.value)}
                onBlur={()=>handleBlur('server')}
                placeholder="server:port or https://server"
              />
              {touched.server && fieldErrors.server && <div className="error-text" style={{ marginTop: 6 }}>{fieldErrors.server}</div>}
            </div>
            <div className="modal-section">
              <label>Credentials</label>
              <div className="row-gap">
                <input
                  className="search-input"
                  value={xtUser}
                  onChange={(e)=>setXtUser(e.target.value)}
                  onBlur={()=>handleBlur('user')}
                  placeholder="Username"
                />
                <input
                  className="search-input"
                  type="password"
                  value={xtPass}
                  onChange={(e)=>setXtPass(e.target.value)}
                  onBlur={()=>handleBlur('pass')}
                  placeholder="Password"
                />
              </div>
              {((touched.user && fieldErrors.user) || (touched.pass && fieldErrors.pass)) && (
                <div className="error-text" style={{ marginTop: 6 }}>{fieldErrors.user || fieldErrors.pass}</div>
              )}
            </div>
          </>
        )}

        <div className="modal-section modal-section-divider">
          <label>Import Mode</label>
          <select className="search-input" value={mode} onChange={(e)=>setMode(e.target.value)}>
            <option value="create-from-categories">Create groups from categories</option>
            <option value="single-group">Import into single group</option>
            <option value="mapping">Mapping (category → group)</option>
            <option value="no-groups">No groups</option>
          </select>
        </div>

        {mode === 'mapping' && (
          <div className="modal-section">
            <div className="row-gap" style={{ alignItems: 'center', marginBottom: 8 }}>
              <button
                className="btn-secondary"
                onClick={async () => {
                  try {
                    setBusy(true);
                    const payload = {
                      type,
                      uri,
                      meta: { origin: { server: xtServer, user: xtUser, pass: xtPass } }
                    };
                    const res = await window.electronAPI.sourcesPreviewCategories(payload);
                    if (res && res.categories) {
                      setMappingCats(res.categories);
                      const init = {}; res.categories.forEach(c => { init[c] = null; });
                      setMapping(init);
                      show('Categories loaded', 'success');
                    } else {
                      throw new Error(res?.error || 'Failed to preview categories');
                    }
                  } catch (e) {
                    const msg = String(e && e.message ? e.message : e);
                    show(msg, 'error');
                  } finally { setBusy(false); }
                }}
                disabled={type==='file' ? !uri : (type==='url' ? !uri : (!xtServer||!xtUser||!xtPass))}
              >
                Load categories
              </button>
              <span className="settings-hint">Map each category to an existing group or leave blank for Ungrouped.</span>
            </div>
            {mappingCats.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #333', borderRadius: 8, padding: 8 }}>
                {mappingCats.map(cat => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ flex: 1, color: '#ddd', fontSize: 13 }}>{cat}</div>
                    <select
                      className="search-input"
                      value={mapping[cat] || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, [cat]: e.target.value || null }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="">Ungrouped</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'single-group' && (
          <div className="modal-section">
            <label>Target Group</label>
            <select className="search-input" value={singleGroupId} onChange={(e)=>setSingleGroupId(e.target.value)} style={{ marginBottom: '8px' }}>
              <option value="">Select existing group...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input className="search-input" value={singleGroupNew} onChange={(e)=>setSingleGroupNew(e.target.value)} placeholder="Or create new group" />
          </div>
        )}

        {type !== 'file' && (
          <div className="modal-section">
            <label className="checkbox-label">
              <input type="checkbox" checked={autoSync} onChange={(e)=>setAutoSync(e.target.checked)} />
              Auto sync on launch
            </label>
          </div>
        )}


        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-secondary" onClick={testConnection} disabled={busy}>
            Test Connection
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Adding...' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  );
}
