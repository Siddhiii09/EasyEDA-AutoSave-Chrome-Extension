/**
 * intervalManager.js — Manages the autosave interval loop.
 *
 * Features:
 *  - Clean start/stop/restart lifecycle.
 *  - Guards against overlapping save calls (no concurrent saves).
 *  - Performance guard: skips save if document is hidden (tab in background).
 *  - Emits lifecycle events for stateWatcher to consume.
 */

(function (global) {
  "use strict";

  const log = global.__autoSaveLogger;
  const storage = global.__autoSaveStorage;
  const trigger = global.__autoSaveTrigger;

  let _intervalId = null;
  let _isSaving = false;
  let _editorInfo = null;
  let _listeners = { onSave: [] };

  function on(event, fn) {
    if (_listeners[event]) _listeners[event].push(fn);
  }

  function _emit(event, data) {
    (_listeners[event] || []).forEach((fn) => { try { fn(data); } catch (_) {} });
  }

  async function _doSave() {
    if (_isSaving) {
      log.debug("Save skipped: previous save still in progress");
      return;
    }

    // Performance guard: don't save when tab is hidden
    if (document.visibilityState === "hidden") {
      log.debug("Save skipped: tab is hidden");
      return;
    }

    _isSaving = true;
    try {
      const result = await trigger.triggerSave(_editorInfo);

      // Persist stats atomically
      const current = await storage.load();
      const next = await storage.patch({
        saveCount: current.saveCount + 1,
        sessionSaveCount: (current.sessionSaveCount || 0) + 1,
        lastSaveAt: new Date().toISOString(),
        lastSaveSuccess: result.success,
      });

      _emit("onSave", { result, state: next });
    } catch (err) {
      log.error("Save failed with exception", err.message);
      await storage.patch({ lastSaveSuccess: false }).catch(() => {});
    } finally {
      _isSaving = false;
    }
  }

  /**
   * Start the autosave interval.
   * @param {object} editorInfo - { type, element } from editorDetector
   * @param {number} intervalMs - milliseconds between saves
   */
  function start(editorInfo, intervalMs = 10000) {
    if (_intervalId !== null) stop();

    _editorInfo = editorInfo;
    log.info("Autosave started", { intervalMs, editorType: editorInfo?.type });

    _intervalId = setInterval(() => _doSave(), intervalMs);
  }

  /**
   * Stop the autosave interval.
   */
  function stop() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
      log.info("Autosave stopped");
    }
  }

  /**
   * Restart with (optionally new) interval.
   */
  function restart(editorInfo, intervalMs) {
    stop();
    start(editorInfo ?? _editorInfo, intervalMs);
  }

  /**
   * Trigger an immediate save (e.g. from popup "Save Now" button).
   */
  async function saveNow() {
    log.info("Manual save triggered");
    await _doSave();
  }

  function isRunning() {
    return _intervalId !== null;
  }

  global.__autoSaveIntervalManager = { start, stop, restart, saveNow, isRunning, on };
})(window);
