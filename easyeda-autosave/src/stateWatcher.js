/**
 * stateWatcher.js — Observes storage state and bridges content ↔ popup messages.
 *
 * Responsibilities:
 *  - Listen for chrome.runtime messages from popup (enable/disable, saveNow, getState).
 *  - Relay state updates back to popup.
 *  - Subscribe to intervalManager save events to push live stats.
 *  - Handle storage.onChanged for cross-tab consistency.
 */

(function (global) {
  "use strict";

  const log = global.__autoSaveLogger;
  const storage = global.__autoSaveStorage;
  const manager = global.__autoSaveIntervalManager;

  // Cached editor info set by content.js after detection
  let _editorInfo = null;
  let _initialized = false;

  function setEditorInfo(info) {
    _editorInfo = info;
  }

  /**
   * Push current state snapshot to popup (fire-and-forget).
   */
  async function pushStateToPopup() {
    try {
      const state = await storage.load();
      const payload = {
        type: "STATE_UPDATE",
        state: {
          ...state,
          isRunning: manager.isRunning(),
          editorType: _editorInfo?.type ?? null,
        },
      };
      chrome.runtime.sendMessage(payload).catch(() => {
        // Popup may be closed — ignore
      });
    } catch (_) {}
  }

  /**
   * Handle messages from popup.js
   */
  function handleMessage(message, _sender, sendResponse) {
    (async () => {
      try {
        switch (message.type) {
          case "GET_STATE": {
            const state = await storage.load();
            sendResponse({
              ok: true,
              state: {
                ...state,
                isRunning: manager.isRunning(),
                editorType: _editorInfo?.type ?? null,
              },
            });
            break;
          }

          case "SET_ENABLED": {
            const { enabled } = message;
            await storage.patch({ enabled });
            if (enabled) {
              const state = await storage.load();
              manager.start(_editorInfo, state.intervalMs);
            } else {
              manager.stop();
            }
            log.info(enabled ? "Autosave enabled via popup" : "Autosave disabled via popup");
            sendResponse({ ok: true });
            pushStateToPopup();
            break;
          }

          case "SAVE_NOW": {
            await manager.saveNow();
            sendResponse({ ok: true });
            pushStateToPopup();
            break;
          }

          case "SET_INTERVAL": {
            const { intervalMs } = message;
            const secs = Math.round(intervalMs / 1000);
            if (!intervalMs || secs < 3 || secs > 3600) {
              sendResponse({ ok: false, error: "intervalMs out of range (3000–3600000)" });
              break;
            }
            await storage.patch({ intervalMs });
            // Restart interval immediately with new timing if currently running
            if (manager.isRunning()) {
              manager.restart(_editorInfo, intervalMs);
            }
            log.info(`Save interval updated to ${secs}s via popup`);
            sendResponse({ ok: true });
            pushStateToPopup();
            break;
          }

          case "RESET_STATS": {
            await storage.patch({ saveCount: 0, sessionSaveCount: 0, lastSaveAt: null });
            sendResponse({ ok: true });
            pushStateToPopup();
            break;
          }

          default:
            sendResponse({ ok: false, error: "Unknown message type" });
        }
      } catch (err) {
        log.error("stateWatcher handleMessage error", err.message);
        sendResponse({ ok: false, error: err.message });
      }
    })();

    return true; // Keep channel open for async sendResponse
  }

  /**
   * Subscribe to intervalManager save events to push live stats to popup.
   */
  function _subscribeToSaveEvents() {
    manager.on("onSave", () => {
      pushStateToPopup();
    });
  }

  /**
   * Initialize the state watcher. Called once by content.js.
   */
  function init() {
    if (_initialized) return;
    _initialized = true;

    chrome.runtime.onMessage.addListener(handleMessage);
    _subscribeToSaveEvents();

    log.debug("stateWatcher initialized");
  }

  global.__autoSaveStateWatcher = { init, setEditorInfo, pushStateToPopup };
})(window);
