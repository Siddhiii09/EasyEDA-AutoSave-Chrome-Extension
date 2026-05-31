# EasyEDA AutoSave — Chrome Extension

Automatically saves your EasyEDA PCB/schematic projects every 10 seconds. Works with both **EasyEDA Standard** and **EasyEDA Pro**.

---

## Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `easyeda-autosave/` folder
5. Navigate to any EasyEDA project — the extension activates automatically

---

## File Structure

```
easyeda-autosave/
├── manifest.json              # Manifest V3 config
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── logger.js              # Centralized log bus
│   ├── storageManager.js      # Versioned atomic storage (schema v2)
│   ├── editorDetector.js      # MutationObserver + retry detection
│   ├── saveTrigger.js         # Ctrl+S KeyboardEvent dispatch
│   ├── intervalManager.js     # 10s autosave loop with perf guards
│   ├── stateWatcher.js        # Popup ↔ content message bridge
│   └── content.js             # Bootstrap orchestrator
└── popup/
    ├── popup.html             # Extension popup UI
    └── popup.js               # Popup controller
```

---

## Architecture

### Save Strategy
The extension simulates `Ctrl+S` via `KeyboardEvent` dispatch on `document` (and `activeElement` when focused). This triggers EasyEDA's native save handler without any private API access.

### Editor Detection
`editorDetector.js` tries a set of known CSS selectors for both Standard and Pro. If none match on load, it:
1. Sets up a `MutationObserver` watching `childList`, `subtree`, and `class`/`id` attributes
2. Runs an exponential back-off retry loop (up to 20 attempts, ~8s max delay)

### Health Check
A 5-second health check loop verifies the editor is still present (handles SPA navigation). If the editor disappears, autosave is paused and re-detection is attempted.

### Storage
Chrome `storage.local` with an atomic load/patch/save API. Schema version tracked — v1→v2 migration runs automatically.

### Popup ↔ Content Communication
- Popup → Content: `chrome.tabs.sendMessage` (GET_STATE, SET_ENABLED, SAVE_NOW, RESET_STATS)
- Content → Popup: `chrome.runtime.sendMessage` (STATE_UPDATE push after each save)

---

## Console Logging
Filter DevTools console by `[AutoSave]` to see all extension logs:

```
[AutoSave] [INFO] EasyEDA AutoSave content script loaded
[AutoSave] [INFO] Editor detected immediately  standard
[AutoSave] [INFO] Autosave started  {intervalMs: 10000, editorType: "standard"}
[AutoSave] [INFO] Save triggered  {editorType: "standard"}
[AutoSave] [INFO] Save success  {durationMs: 312}
```

---

## Configuration

To change the save interval, edit `storageManager.js` → `defaultState()`:

```js
intervalMs: 10000,  // Change to e.g. 5000 for 5-second saves
```

Or patch it directly from the DevTools console (on an EasyEDA tab):
```js
window.__autoSaveStorage.patch({ intervalMs: 5000 });
```

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist save stats and settings |
| `scripting` | Content script injection |
| `tabs` | Identify active tab for popup messaging |
| `*.easyeda.com` | Standard editor |
| `*.lceda.cn` | EasyEDA Pro (Chinese domain) |
