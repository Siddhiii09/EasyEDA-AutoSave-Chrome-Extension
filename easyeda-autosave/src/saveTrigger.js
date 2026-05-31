/**
 * saveTrigger.js — Triggers a save by dispatching Ctrl+S keyboard events.
 *
 * Strategy:
 *  - Dispatch keydown + keypress + keyup on the document.
 *  - Listen for any "dirty-cleared" signals EasyEDA emits post-save.
 *  - Provide a result (success/failure) via Promise with a timeout guard.
 *
 * Works for both Standard (listens on document) and Pro (may require canvas focus).
 */

(function (global) {
  "use strict";

  const log = global.__autoSaveLogger;
  const SAVE_TIMEOUT_MS = 3000;

  /**
   * Known DOM signals that indicate a successful save in EasyEDA.
   * These are empirically observed — we check them as heuristics.
   */
  const SUCCESS_SIGNALS = [
    // Title bar loses asterisk (*) after save
    () => !document.title.includes("*"),
    // EasyEDA Standard: save progress indicator disappears
    () => !document.querySelector(".save-loading, .saving-indicator, [class*='saving']"),
  ];

  function checkSuccessSignals() {
    return SUCCESS_SIGNALS.every((fn) => {
      try { return fn(); } catch (_) { return true; }
    });
  }

  /**
   * Dispatch a Ctrl+S keyboard event sequence on the document.
   */
  function dispatchCtrlS() {
    const opts = {
      key: "s",
      code: "KeyS",
      keyCode: 83,
      which: 83,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    };

    ["keydown", "keypress", "keyup"].forEach((type) => {
      document.dispatchEvent(new KeyboardEvent(type, opts));
      // Also dispatch on active element in case editor has focus
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.dispatchEvent(new KeyboardEvent(type, opts));
      }
    });
  }

  /**
   * Trigger a save and return a Promise<{ success: boolean, durationMs: number }>.
   */
  async function triggerSave(editorInfo) {
    const start = performance.now();
    log.info("Save triggered", { editorType: editorInfo?.type });

    // For Pro: try to focus the canvas before Ctrl+S
    if (editorInfo?.type === "pro" && editorInfo.element) {
      try { editorInfo.element.focus(); } catch (_) {}
    }

    dispatchCtrlS();

    // Wait briefly then assess success via heuristics
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = checkSuccessSignals();
        const durationMs = Math.round(performance.now() - start);
        if (success) {
          log.info("Save success", { durationMs });
        } else {
          log.warn("Save result uncertain (heuristic check failed)", { durationMs });
        }
        resolve({ success, durationMs });
      }, SAVE_TIMEOUT_MS);
    });
  }

  global.__autoSaveTrigger = { triggerSave, dispatchCtrlS };
})(window);
