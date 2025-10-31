// Importer for sources: file, url, xtream

const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { randomUUID } = require('crypto');
const { parseM3UContent } = require('./playlistParser');

const DEFAULT_UA = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function now() { return Date.now(); }

function ensureHttpPrefix(server) {
  // Add protocol if missing
  if (!/^https?:\/\//i.test(server)) {
    return `http://${server}`;
  }
  return server;
}

function buildXtreamUrl(server, user, pass) {
  // Build m3u_plus URL for Xtream Codes
  const base = ensureHttpPrefix(server).replace(/\/$/, '');
  const u = new URL(base + '/get.php');
  u.searchParams.set('username', user);
  u.searchParams.set('password', pass);
  u.searchParams.set('type', 'm3u_plus');
  u.searchParams.set('output', 'ts');
  return u.toString();
}

function fetchText(urlStr, { headers = {}, timeoutMs = 15000 } = {}) {
  // Simple Node http(s) GET returning text
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('Invalid URL')); }
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(u, { method: 'GET', headers }, (res) => {
      if (res.statusCode >= 400) {
        const msg = res.statusCode === 401 || res.statusCode === 403
          ? `HTTP ${res.statusCode} - Check username/password`
          : `HTTP ${res.statusCode}`;
        return reject(new Error(msg));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('Request timeout')); });
    req.end();
  });
}

async function loadM3UForSource(store, source) {
  // Read m3u content depending on source type
  if (source.type === 'file') {
    const p = source.uri;
    if (!p) throw new Error('Empty file path');
    return fs.readFileSync(p, 'utf-8');
  }
  if (source.type === 'url' || source.type === 'xtream') {
    let urlStr = source.uri;
    if (source.type === 'xtream') {
      const origin = source.meta?.origin || {};
      if (!origin.server || !origin.user || !origin.pass) {
        throw new Error('Missing Xtream credentials');
      }
      urlStr = buildXtreamUrl(origin.server, origin.user, origin.pass);
    }
    const ua = store.get('userAgent', DEFAULT_UA);
    return await fetchText(urlStr, { headers: { 'User-Agent': ua } });
  }
  throw new Error('Unknown source type');
}

function upsertGroupsForCategories(store, categories) {
  // Ensure a group exists for each category name.
  const groups = store.get('groups', []);
  const byName = new Map(groups.map(g => [g.name, g]));
  const created = [];
  Object.keys(categories).forEach((name) => {
    if (!byName.has(name)) {
      const g = { id: randomUUID(), name, order: groups.length + created.length };
      created.push(g);
      byName.set(name, g);
    }
  });
  if (created.length) store.set('groups', groups.concat(created));
  // Return name -> groupId
  const final = store.get('groups', []);
  const map = {};
  final.forEach(g => { map[g.name] = g.id; });
  return map;
}

function removeChannelsOfSource(store, sourceId) {
  const channels = store.get('channels', []);
  const filtered = channels.filter(c => c.sourceId !== sourceId);
  store.set('channels', filtered);
}

function addChannels(store, sourceId, items) {
  const channels = store.get('channels', []);
  const nowTs = now();
  const mapped = items.map(ch => ({
    id: randomUUID(),
    name: ch.name || 'Channel',
    url: ch.url,
    logo: ch.logo || '',
    tvgId: ch.tvgId || '',
    sourceId,
    groupId: ch.groupId ?? null,
    createdAt: nowTs,
    updatedAt: nowTs,
  }));
  store.set('channels', channels.concat(mapped));
  return mapped.length;
}

function applyImportConfig(store, sourceId, parsed, importConfig) {
  // Build target channel list based on import strategy.
  const items = [];

  if (!parsed || !parsed.categories) return 0;
  const categories = parsed.categories;

  switch (importConfig?.mode) {
    case 'create-from-categories': {
      const nameToId = upsertGroupsForCategories(store, categories);
      Object.entries(categories).forEach(([cat, list]) => {
        const gid = nameToId[cat] || null;
        list.forEach(ch => items.push({ ...ch, groupId: gid }));
      });
      break;
    }
    case 'single-group': {
      const gid = importConfig.targetGroupId || null;
      Object.values(categories).forEach((list) => {
        list.forEach(ch => items.push({ ...ch, groupId: gid }));
      });
      break;
    }
    case 'mapping': {
      const cmap = importConfig.categoryMap || {};
      Object.entries(categories).forEach(([cat, list]) => {
        const gid = cmap[cat] ?? null;
        list.forEach(ch => items.push({ ...ch, groupId: gid }));
      });
      break;
    }
    case 'no-groups':
    default: {
      Object.values(categories).forEach((list) => {
        list.forEach(ch => items.push({ ...ch, groupId: null }));
      });
    }
  }

  removeChannelsOfSource(store, sourceId);
  return addChannels(store, sourceId, items);
}

async function importSource(store, sourceId) {
  // Import a single source by id
  const sources = store.get('sources', []);
  const src = sources.find(s => s.id === sourceId);
  if (!src) throw new Error('Source not found');
  const content = await loadM3UForSource(store, src);
  const parsed = parseM3UContent(content);
  const count = applyImportConfig(store, src.id, parsed, src.importConfig);
  // Update lastSync
  const idx = sources.findIndex(s => s.id === src.id);
  sources[idx] = { ...src, lastSync: now() };
  store.set('sources', sources);
  return { success: true, count };
}

async function testConnection(store, payload) {
  // Test if source is accessible without saving to store.
  // payload: { type: 'file'|'url'|'xtream', uri?, meta?.origin? }
  try {
    let content = '';
    if (payload.type === 'file') {
      if (!payload.uri) throw new Error('File path is required');
      if (!fs.existsSync(payload.uri)) throw new Error('File not found');
      content = fs.readFileSync(payload.uri, 'utf-8');
    } else if (payload.type === 'url') {
      if (!payload.uri) throw new Error('URL is required');
      const ua = store.get('userAgent', DEFAULT_UA);
      content = await fetchText(payload.uri, { headers: { 'User-Agent': ua }, timeoutMs: 10000 });
    } else if (payload.type === 'xtream') {
      const origin = payload.meta?.origin || {};
      if (!origin.server) throw new Error('Xtream server is required');
      if (!origin.user) throw new Error('Xtream username is required');
      if (!origin.pass) throw new Error('Xtream password is required');
      const urlStr = buildXtreamUrl(origin.server, origin.user, origin.pass);
      const ua = store.get('userAgent', DEFAULT_UA);
      content = await fetchText(urlStr, { headers: { 'User-Agent': ua }, timeoutMs: 10000 });
    } else {
      throw new Error('Unknown source type');
    }

    // Try to parse content to verify it's valid M3U
    if (!content || content.trim().length === 0) {
      throw new Error('Empty response received');
    }

    const parsed = parseM3UContent(content);
    if (!parsed || !parsed.categories || Object.keys(parsed.categories).length === 0) {
      throw new Error('No channels found in playlist');
    }

    // Count total channels
    let totalChannels = 0;
    Object.values(parsed.categories).forEach(list => {
      totalChannels += list.length;
    });

    return { success: true, channels: totalChannels };
  } catch (e) {
    throw new Error(String(e && e.message ? e.message : e));
  }
}

module.exports = {
  buildXtreamUrl,
  importSource,
  // new incremental API
  diffSource,
  applyDiff,
  previewCategories,
  testConnection,
};

// ------------ Incremental sync (diff + apply) ------------

function keyFor(item) {
  // Prefer tvgId, fallback to normalized URL (without query params for stability)
  if (item.tvgId) return `tvg:${item.tvgId}`;

  // Normalize URL: remove query params that might change (like tokens, timestamps)
  // Keep only protocol + host + path for more stable matching
  try {
    const u = new URL(item.url);
    return `url:${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    // If URL parsing fails, use exact URL
    return `url:${item.url}`;
  }
}

async function previewCategories(store, payload) {
  // Returns unique category names from provided source payload (without saving).
  // payload: { type: 'file'|'url'|'xtream', uri?, meta?.origin? }
  let content = '';
  if (payload.type === 'file') {
    if (!payload.uri) throw new Error('Empty file path');
    content = fs.readFileSync(payload.uri, 'utf-8');
  } else if (payload.type === 'url' || payload.type === 'xtream') {
    let urlStr = payload.uri;
    if (payload.type === 'xtream') {
      const origin = payload.meta?.origin || {};
      if (!origin.server || !origin.user || !origin.pass) {
        throw new Error('Missing Xtream credentials');
      }
      urlStr = buildXtreamUrl(origin.server, origin.user, origin.pass);
    }
    const ua = store.get('userAgent', DEFAULT_UA);
    content = await fetchText(urlStr, { headers: { 'User-Agent': ua } });
  } else {
    throw new Error('Unknown source type');
  }

  const parsed = parseM3UContent(content);
  const names = parsed && parsed.categories ? Object.keys(parsed.categories) : [];
  return { categories: names, total: names.length };
}

function flattenParsed(parsed) {
  // Convert { category: [ { name, url, logo, tvgId } ] } to flat list with category
  const out = [];
  if (!parsed || !parsed.categories) return out;
  Object.entries(parsed.categories).forEach(([cat, arr]) => {
    arr.forEach(ch => out.push({ ...ch, category: cat }));
  });
  return out;
}

function indexExisting(store, sourceId) {
  const all = store.get('channels', []);
  const mine = all.filter(c => c.sourceId === sourceId);
  const byKey = new Map();
  mine.forEach(c => {
    const k = keyFor(c); // Use same keyFor function for consistency
    if (!byKey.has(k)) byKey.set(k, c); // first wins
  });
  return { mine, byKey };
}

async function diffSource(store, sourceId) {
  // Build diff without modifying store
  const sources = store.get('sources', []);
  const src = sources.find(s => s.id === sourceId);
  if (!src) throw new Error('Source not found');
  const content = await loadM3UForSource(store, src);
  const parsed = parseM3UContent(content);
  const parsedList = flattenParsed(parsed);
  const { byKey } = indexExisting(store, sourceId);

  const seen = new Set();
  const added = [];
  const updated = [];

  for (const ch of parsedList) {
    const k = keyFor(ch);

    // Skip duplicates within the same playlist (first occurrence wins)
    if (seen.has(k)) continue;

    const ex = byKey.get(k);
    if (!ex) {
      added.push({ ...ch, key: k });
      seen.add(k);
    } else {
      seen.add(k);
      // Detect changes
      const nameChanged = (ex.name || '').trim() !== (ch.name || '').trim();
      const logoChanged = (ex.logo || '') !== (ch.logo || '');
      const urlChanged = (ex.url || '') !== (ch.url || '');

      if (nameChanged || logoChanged || urlChanged) {
        updated.push({
          id: ex.id,
          name: ch.name,
          logo: ch.logo || '',
          url: ch.url || '',
          key: k,
          prevUrl: ex.url || '',
          tvgId: ex.tvgId || ''
        });
      }
    }
  }

  const removed = [];
  byKey.forEach((ex, k) => {
    if (!seen.has(k)) removed.push({ id: ex.id, key: k, name: ex.name || '' });
  });

  return {
    added,
    updated,
    removed,
    counts: { added: added.length, updated: updated.length, removed: removed.length },
    sample: {
      added: added.slice(0, 5).map(a => a.name),
      updated: updated.slice(0, 5).map(u => u.name),
      removed: removed.slice(0, 5).map(r => r.name || ''),
    }
  };
}

function updateChannels(store, updates) {
  const channels = store.get('channels', []);
  const byId = new Map(channels.map(c => [c.id, c]));
  updates.forEach(u => {
    const ex = byId.get(u.id);
    if (ex) {
      ex.name = u.name;
      ex.logo = u.logo || '';
      ex.url = u.url || ex.url;
      ex.updatedAt = now();
    }
  });
  store.set('channels', channels);
}

function assignGroupIdForAdded(store, importConfig, ch, nameToIdCache) {
  // Determine target groupId for an added item based on importConfig.
  const mode = importConfig?.mode || 'no-groups';
  if (mode === 'no-groups') return null;
  if (mode === 'single-group') return importConfig.targetGroupId || null;
  if (mode === 'create-from-categories') {
    // ensure group for category
    const cat = ch.category || 'Uncategorized';
    if (nameToIdCache[cat]) return nameToIdCache[cat];
    const idMap = upsertGroupsForCategories(store, { [cat]: [] });
    nameToIdCache[cat] = idMap[cat];
    return nameToIdCache[cat] || null;
  }
  return null;
}

const { cleanupFavoritesByUrls } = require('./sourcesStore');

async function applyDiff(store, sourceId, importConfig, diff) {
  // Apply diff: add/update/remove; preserve manual group for existing channels
  const sources = store.get('sources', []);
  const srcIdx = sources.findIndex(s => s.id === sourceId);
  if (srcIdx === -1) throw new Error('Source not found');

  // Update existing
  if (diff.updated && diff.updated.length) {
    // Update channels first
    updateChannels(store, diff.updated);
    // Update favorites: if tvg-id matches, or previous URL matches
    try {
      const favs = store.get('favorites', []);
      if (Array.isArray(favs) && favs.length) {
        const byTvg = new Map();
        const byPrev = new Map();
        diff.updated.forEach(u => {
          if (u.tvgId) byTvg.set(u.tvgId, u);
          if (u.prevUrl) byPrev.set(u.prevUrl, u);
        });
        let changed = false;
        for (let i = 0; i < favs.length; i++) {
          const f = favs[i];
          if (!f) continue;
          let u = null;
          if (f.tvgId && byTvg.has(f.tvgId)) u = byTvg.get(f.tvgId);
          else if (f.url && byPrev.has(f.url)) u = byPrev.get(f.url);
          if (u) {
            if (u.url && f.url !== u.url) { f.url = u.url; changed = true; }
            if (u.name && f.name !== u.name) { f.name = u.name; changed = true; }
            if (u.logo !== undefined && f.logo !== u.logo) { f.logo = u.logo; changed = true; }
          }
        }
        if (changed) store.set('favorites', favs);
      }
    } catch (_) {}
  }

  // Remove channels
  if (diff.removed && diff.removed.length) {
    const channels = store.get('channels', []);
    const removeIds = new Set(diff.removed.map(r => r.id));
    const removed = channels.filter(c => removeIds.has(c.id));
    const remaining = channels.filter(c => !removeIds.has(c.id));
    store.set('channels', remaining);
    // Cleanup favorites by URL for removed
    cleanupFavoritesByUrls(store, new Set(removed.map(c => c.url).filter(Boolean)));
  }

  // Add channels
  if (diff.added && diff.added.length) {
    const nameToIdCache = {};
    const prepared = diff.added.map(ch => ({
      name: ch.name,
      url: ch.url,
      logo: ch.logo || '',
      tvgId: ch.tvgId || '',
      groupId: assignGroupIdForAdded(store, importConfig, ch, nameToIdCache),
    }));
    addChannels(store, sourceId, prepared);
  }

  // Update lastSync
  const src = sources[srcIdx];
  sources[srcIdx] = { ...src, lastSync: now() };
  store.set('sources', sources);

  return {
    success: true,
    counts: {
      added: diff.added?.length || 0,
      updated: diff.updated?.length || 0,
      removed: diff.removed?.length || 0,
    }
  };
}
