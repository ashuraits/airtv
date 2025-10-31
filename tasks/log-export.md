# Log Export Implementation Plan

## Current State
- **electron-log** installed but only used in autoUpdater
- Main code uses `console.log/error` (not saved to files)
- No centralized logging system

## Implementation Plan

### 1. Configure electron-log Globally
**File:** `src/index.js`

- Import and configure electron-log at app startup
- Set log levels (info, warn, error)
- Configure transports (file + console)
- Set file rotation (max size, number of old logs to keep)
- Format: `[timestamp] [level] message`
- Log app version and platform on startup

### 2. Replace console.* with log.*
- `src/main/ipcHandlers.js` - replace console.error with log.error
- `src/main/importer.js` - add logging for load/parse errors
- `src/main/sourcesStore.js` - log CRUD operations
- Renderer processes - keep console or configure separate transport

### 3. Log Storage Location
- Default: `~/Library/Logs/tvapp/main.log` (macOS)
- Can customize path via `log.transports.file.resolvePathFn`

### 4. UI Implementation - Help Menu Option
**Menu:** Help → Export Logs

- Add menu item in `src/main/menu.js`
- Show `dialog.showSaveDialog()` to let user choose export location
- Default filename: `tvapp-logs-{timestamp}.txt`
- Show success/error toast after export

### 5. IPC Handlers
**File:** `src/main/ipcHandlers.js`

Add handlers:
- `logs:get-path` → returns path to log file
- `logs:export` → copies log to specified location
- `logs:get-content` → reads last N lines (optional, for preview)

### 6. What to Log
- Application startup/shutdown
- Add/remove sources
- Resync operations (start/end/errors)
- HTTP errors (401, 403, timeout, etc)
- Playlist parsing errors
- Player window creation/closing
- Auto-update events (already implemented)
- Critical errors with stack traces

### 7. Security & Privacy
- **Sanitize logs** - do NOT log passwords/tokens
- Check URL query params before logging
- Strip sensitive data from error messages

### 8. Additional Features (Optional)
- Show log file size in UI
- "Clear Logs" option to delete old logs
- "Open Log Folder" option
- Copy logs to clipboard option

## Implementation Steps

1. Setup electron-log in `src/index.js`
2. Replace console.* calls throughout codebase
3. Add IPC handlers for log export
4. Add "Export Logs" menu item in Help menu
5. Test log export functionality
6. Verify no sensitive data in logs
