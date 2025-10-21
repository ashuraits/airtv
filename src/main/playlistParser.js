const fs = require('fs');
const { Parser } = require('m3u8-parser');

/**
 * Parse M3U/M3U8 playlist file
 * @param {string} filePath - Path to the .m3u file
 * @returns {Object} Parsed playlist with categories and channels
 */
function parseM3UFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseM3UContent(content);
}

/**
 * Parse M3U content string
 * @param {string} content - M3U file content
 * @returns {Object} Parsed playlist with categories and channels
 */
function parseM3UContent(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const categories = {};
  const uncategorized = [];

  let currentChannel = null;
  let pendingGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse #EXTGRP line
    if (line.startsWith('#EXTGRP:')) {
      pendingGroup = line.substring(8).trim();
    }
    // Parse #EXTINF line
    else if (line.startsWith('#EXTINF:')) {
      const info = line.substring(8); // Remove '#EXTINF:'

      // Extract channel name (after comma)
      const commaIndex = info.indexOf(',');
      const attributes = commaIndex > 0 ? info.substring(0, commaIndex) : info;
      const channelName = commaIndex > 0 ? info.substring(commaIndex + 1).trim() : 'Unknown Channel';

      // Extract group-title or use pendingGroup
      const groupMatch = attributes.match(/group-title="([^"]+)"/i);
      const groupTitle = groupMatch ? groupMatch[1] : (pendingGroup || 'Uncategorized');

      // Extract tvg-logo
      const logoMatch = attributes.match(/tvg-logo="([^"]+)"/i);
      const logo = logoMatch ? logoMatch[1] : '';

      // Extract tvg-id
      const idMatch = attributes.match(/tvg-id="([^"]+)"/i);
      const tvgId = idMatch ? idMatch[1] : '';

      currentChannel = {
        name: channelName,
        group: groupTitle,
        logo: logo,
        tvgId: tvgId,
        url: null
      };

      pendingGroup = null;
    }
    // Parse URL line
    else if (currentChannel && (line.startsWith('http://') || line.startsWith('https://'))) {
      currentChannel.url = line;

      // Add to category
      const group = currentChannel.group;
      if (!categories[group]) {
        categories[group] = [];
      }
      categories[group].push({
        name: currentChannel.name,
        url: currentChannel.url,
        logo: currentChannel.logo,
        tvgId: currentChannel.tvgId
      });

      currentChannel = null;
    }
  }

  return {
    categories: categories,
    totalChannels: Object.values(categories).reduce((sum, channels) => sum + channels.length, 0),
    totalCategories: Object.keys(categories).length
  };
}

module.exports = {
  parseM3UFile,
  parseM3UContent
};
