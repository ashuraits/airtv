# Changelog

## [0.6.1] - 2026-03-21

### Improvements
- Improved compatibility with Xtream providers — channels now load more reliably by using the JSON API first, with legacy fallback

## [0.6.0] - 2026-03-20

### New Features
- "Move to Group" button in the player — reassign a channel to a different group without opening the main window
- PageUp/PageDown and media key support for channel switching

### Improvements
- Double-click video to toggle fullscreen
- Fixed: clicking video no longer accidentally unmutes muted playback
- Add to Favorites button now syncs with the main window instantly
- Duplicate player opens with the currently playing channel

## [0.5.2] - 2026-03-19

### New Features
- Added proxy support for video streams
  - Open Settings and find the Proxy section
  - Enable the toggle, select protocol (HTTP, HTTPS, or SOCKS5), enter host and port
  - Click "Save Changes" — the proxy is applied immediately

### Improvements
- Clicking on empty space in the sidebar now closes it

## [0.5.1] - 2026-03-19

### New Features
- Added "Duplicate window" button in the player — opens the same channel in a second muted window

### Improvements
- Release notes are now shown automatically after each update

## [0.5.0] - 2026-03-19

### Improvements
- Added support for TS streams — more channels will now play without issues
- Keyboard navigation in the player: use arrow keys to switch channels and control volume
- Added fallback for Xtream providers that previously failed to load channels
- Volume is now saved automatically a moment after you change it
- Clearer error messages when a stream is unavailable or access is denied
- Updated HLS library to the latest version for better stream compatibility
