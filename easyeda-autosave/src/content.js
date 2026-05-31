/**
 * content.js — Entry point for EasyEDA AutoSave extension.
 *
 * Orchestration order:
 *  1. Initialize stateWatcher (message bridge)
 *  2. Load persisted state from storage
 *  3. Wait for editor to be detected
 *  4. Start autosave interval (if enabled)
 *  5. Begin health check loop
 */

(function () {
  "use strict";

  const log = window.__autoSaveLogger;
  const storage = window.__autoSaveStorage;
  const detector = window.__autoSaveEditorDetector;
  const manager = window.__autoSaveIntervalManager;
  const watcher = window.__autoSaveStateWatcher;

  const HEALTH_CHECK_MS = 5000;

  let _editorInfo = null;
  let _healthCheckId = null;
  let _state = null;

  /**
   * Health check: re-detect editor if it disappears (SPA navigation).
   */
  function startHealthCheck() {
    if (_healthCheckId) clearInterval(_healthCheckId);

    _healthCheckId = setInterval(async () => {
      const found = detector.detectNow();

      if (!found && manager.isRunning()) {
        log.warn("Editor lost during health check — pausing autosave");
        manager.stop();
        // Re-attempt detection
        try {
          const redetected = await detector.waitForEditor();
          log.info("Editor re-detected after loss", redetected.type);
          _editorInfo = redetected;
          watcher.setEditorInfo(redetected);
          if (_state?.enabled) {
            manager.start(_editorInfo, _state.intervalMs);
          }
        } catch (_) {
          log.warn("Editor not re-detected after loss");
        }
      }
    }, HEALTH_CHECK_MS);
  }

  /**
   * Main bootstrap function.
   */
  async function bootstrap() {
    log.info("EasyEDA AutoSave content script loaded", {
      url: location.href,
      time: new Date().toISOString(),
    });

    // 1. Init message bridge
    watcher.init();

    // 2. Load persisted state
    try {
      _state = await storage.load();
      log.info("State loaded", {
        enabled: _state.enabled,
        saveCount: _state.saveCount,
        intervalMs: _state.intervalMs,
      });
    } catch (err) {
      log.error("Failed to load state, using defaults", err.message);
      _state = storage.defaultState();
    }

    // 3. Detect editor with retry logic
    try {
      _editorInfo = await detector.waitForEditor();
      watcher.setEditorInfo(_editorInfo);
      log.info("Editor ready", { type: _editorInfo.type, strategy: _editorInfo.strategy });
    } catch (err) {
      // Final fallback: if URL looks like an editor, proceed with body as target
      if (detector.checkURL()) {
        log.warn("Canvas detection failed but URL matches editor — using URL fallback");
        _editorInfo = { type: "standard", element: document.body, strategy: "emergency-fallback" };
        watcher.setEditorInfo(_editorInfo);
      } else {
        log.warn("Editor detection failed — autosave will not start", err.message);
        return; // Not an EasyEDA editor page
      }
    }

    // 4. Start autosave if enabled
    if (_state.enabled) {
      manager.start(_editorInfo, _state.intervalMs);
    } else {
      log.info("Autosave is disabled — not starting interval");
    }

    // 5. Health check loop
    startHealthCheck();

    // Push initial state to popup if open
    watcher.pushStateToPopup();
  }

  // Run after DOM is fully ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
