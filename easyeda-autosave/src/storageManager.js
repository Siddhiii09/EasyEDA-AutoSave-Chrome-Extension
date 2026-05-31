/**
 * storageManager.js — Versioned, atomic Chrome storage wrapper
 * Schema version: 2
 * Performs migration if older schema detected.
 */

(function (global) {
  "use strict";

  const SCHEMA_VERSION = 2;
  const STORAGE_KEY = "easyeda_autosave_state";

  /**
   * Default state factory — always returns a clean object.
   */
  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: true,
      intervalMs: 10000,
      saveCount: 0,
      lastSaveAt: null,        // ISO string or null
      lastSaveSuccess: null,   // true | false | null
      sessionSaveCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Migrate older schema versions to current.
   * Returns a fully-shaped state object.
   */
  function migrate(raw) {
    if (!raw || typeof raw !== "object") return defaultState();

    const v = raw.schemaVersion ?? 1;
    let state = { ...raw };

    // v1 → v2: added sessionSaveCount + createdAt
    if (v < 2) {
      state.sessionSaveCount = 0;
      state.createdAt = new Date().toISOString();
      state.schemaVersion = 2;
    }

    // Ensure all expected keys exist (forward-safe defaults)
    const defaults = defaultState();
    for (const key of Object.keys(defaults)) {
      if (!(key in state)) state[key] = defaults[key];
    }

    return state;
  }

  /**
   * Load state atomically. Never resolves with partial/corrupt data.
   * Returns a fully-shaped state object.
   */
  async function load() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
          if (chrome.runtime.lastError) {
            resolve(defaultState());
            return;
          }
          const raw = result[STORAGE_KEY];
          resolve(migrate(raw));
        });
      } catch (_) {
        resolve(defaultState());
      }
    });
  }

  /**
   * Save a full state snapshot atomically.
   */
  async function save(state) {
    return new Promise((resolve, reject) => {
      try {
        const payload = { [STORAGE_KEY]: { ...state, schemaVersion: SCHEMA_VERSION } };
        chrome.storage.local.set(payload, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Atomically patch specific fields. Performs load → merge → save.
   */
  async function patch(updates) {
    const current = await load();
    const next = { ...current, ...updates };
    await save(next);
    return next;
  }

  /**
   * Reset state to defaults.
   */
  async function reset() {
    const fresh = defaultState();
    await save(fresh);
    return fresh;
  }

  global.__autoSaveStorage = { load, save, patch, reset, defaultState };
})(window);
