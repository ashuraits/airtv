// Simple mock Xtream API server - no dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8000;

// Read sample playlist file
let samplePlaylist = '';
try {
  samplePlaylist = fs.readFileSync(path.join(__dirname, 'sample-playlist.m3u'), 'utf8');
} catch (err) {
  console.warn('Could not read sample-playlist.m3u, using hardcoded examples');
}

// Parse M3U playlist to extract real channels
function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      const extinf = line;
      const nextLine = lines[i + 1];

      if (nextLine && (nextLine.startsWith('http://') || nextLine.startsWith('https://'))) {
        // Extract tvg-id
        const tvgIdMatch = extinf.match(/tvg-id="([^"]*)"/);
        const tvgId = tvgIdMatch ? tvgIdMatch[1] : '';

        // Extract channel name - everything after the last comma
        const lastCommaIndex = extinf.lastIndexOf(',');
        let name = 'Unknown Channel';
        if (lastCommaIndex !== -1) {
          name = extinf.substring(lastCommaIndex + 1).trim();
        }

        channels.push({ tvgId, name, url: nextLine.trim() });
      }
    }
  }

  return channels;
}

// Parse channels from sample playlist or use fallback
const allChannels = samplePlaylist
  ? parseM3U(samplePlaylist)
  : [
      { tvgId: '00sReplay', name: '00s Replay', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/62ba60f059624e000781c436/master.m3u8' },
      { tvgId: '48Hours.us@SD', name: '48 Hours', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/6176f39e709f160007ec61c3/master.m3u8' },
      { tvgId: '70sCinema.us@SD', name: '70s Cinema', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5f4d878d3d19b30007d2e782/master.m3u8' },
      { tvgId: '80sRewind.us@SD', name: '80s Rewind', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5ca525b650be2571e3943c63/master.m3u8' },
      { tvgId: '90sThrowback.us@SD', name: '90s Throwback', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5f4d86f519358a00072b978e/master.m3u8' },
      { tvgId: 'ABCNewsLive.us@SD', name: 'ABC News Live', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/6508be683a0d700008c534e4/master.m3u8' },
      { tvgId: 'AnimeAllDay.us@US', name: 'Anime All Day', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5812b7d3249444e05d09cc49/master.m3u8' },
      { tvgId: 'BBCNews.uk@NorthAmerica', name: 'BBC News', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/65d92a8c8b24c80008e285c0/master.m3u8' },
      { tvgId: 'Baywatch.us@US', name: 'Baywatch', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5d815eb889bca2ce7b746fdd/master.m3u8' },
      { tvgId: 'BloombergTV.us@US', name: 'Bloomberg TV', url: 'http://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/5ff0fbf110cd76000851e268/master.m3u8' }
    ];

console.log(`Loaded ${allChannels.length} channels from ${samplePlaylist ? 'sample-playlist.m3u' : 'hardcoded examples'}`);

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Parse query params
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  const type = url.searchParams.get('type');

  // Handle /get.php endpoint - this is what your app uses
  if (url.pathname === '/get.php') {
    // Check credentials (optional, can be removed if you want)
    if (username !== 'demo' || password !== 'demo') {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Invalid credentials');
      return;
    }

    // Build M3U playlist with real channels from sample-playlist.m3u
    let m3uContent = '#EXTM3U\n';

    // Use first 50 channels or all if less
    const channelsToUse = allChannels.slice(0, Math.min(50, allChannels.length));

    channelsToUse.forEach((channel, index) => {
      const groupTitle = index % 3 === 0 ? 'News' : index % 3 === 1 ? 'Entertainment' : 'Movies';
      m3uContent += `#EXTINF:-1 tvg-id="${channel.tvgId}" group-title="${groupTitle}",${channel.name}\n`;
      m3uContent += `${channel.url}\n`;
    });

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(m3uContent);
    return;
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mock Xtream server running on http://localhost:${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/get.php?username=demo&password=demo&type=m3u_plus&output=ts`);
});
