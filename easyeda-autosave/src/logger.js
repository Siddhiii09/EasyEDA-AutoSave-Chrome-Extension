/**
 * logger.js — Centralized log bus for EasyEDA AutoSave
 * All log output is prefixed and can be filtered in DevTools via "[AutoSave]"
 */

(function (global) {
  "use strict";

  const PREFIX = "[AutoSave]";
  const LEVELS = { INFO: "INFO", WARN: "WARN", ERROR: "ERROR", DEBUG: "DEBUG" };

  const LogBus = {
    _subscribers: [],

    subscribe(fn) {
      this._subscribers.push(fn);
    },

    _emit(level, message, data) {
      const entry = {
        level,
        message,
        data: data ?? null,
        timestamp: new Date().toISOString(),
      };
      this._subscribers.forEach((fn) => {
        try { fn(entry); } catch (_) {}
      });
    },

    info(message, data) {
      console.log(`${PREFIX} [${LEVELS.INFO}]`, message, ...(data !== undefined ? [data] : []));
      this._emit(LEVELS.INFO, message, data);
    },

    warn(message, data) {
      console.warn(`${PREFIX} [${LEVELS.WARN}]`, message, ...(data !== undefined ? [data] : []));
      this._emit(LEVELS.WARN, message, data);
    },

    error(message, data) {
      console.error(`${PREFIX} [${LEVELS.ERROR}]`, message, ...(data !== undefined ? [data] : []));
      this._emit(LEVELS.ERROR, message, data);
    },

    debug(message, data) {
      console.debug(`${PREFIX} [${LEVELS.DEBUG}]`, message, ...(data !== undefined ? [data] : []));
      this._emit(LEVELS.DEBUG, message, data);
    },
  };

  global.__autoSaveLogger = LogBus;
})(window);
