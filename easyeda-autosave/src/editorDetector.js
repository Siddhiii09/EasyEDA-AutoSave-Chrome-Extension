/**
 * editorDetector.js — Detects EasyEDA Standard and Pro editor environments.
 *
 * Multi-strategy approach (in order of reliability):
 *  1. URL pattern match — if we're on an EasyEDA editor URL, we ARE in an editor.
 *  2. Canvas/SVG element presence — actual drawing surface.
 *  3. EasyEDA global JS objects — window.EasyEDA, window.eda, etc.
 *  4. Toolbar/menu DOM — editor chrome elements.
 *
 * Falls back gracefully: if URL confirms editor context, resolves with
 * type:'unknown' so saves still fire even if canvas selector misses.
 */

(function (global) {
  "use strict";

  const log = global.__autoSaveLogger;

  // ── URL patterns ──────────────────────────────────────────────────────────
  // EasyEDA Standard:  https://easyeda.com/editor  or  /...#id=...
  // EasyEDA Pro:       https://pro.easyeda.com/editor  or  /page/...
  // LCEDA (CN):        https://lceda.cn/editor
  const EDITOR_URL_PATTERNS = [
    /easyeda\.com\/editor/i,
    /easyeda\.com\/.*#/i,           // hash-routed project
    /pro\.easyeda\.com/i,
    /lceda\.cn\/editor/i,
    /lceda\.cn\/.*#/i,
    /easyeda\.com\/page\//i,
    /pro\.easyeda\.com\/page\//i,
  ];

  // ── Canvas / SVG selectors (broad — catches any version) ─────────────────
  const CANVAS_SELECTORS = [
    "canvas",                         // any <canvas> = drawing surface
    "svg[id]",                        // EasyEDA Standard renders to a named SVG
    "#editorSvg",
    "#graph",
    "[id*='canvas']",
    "[id*='Canvas']",
    "[class*='canvas']",
    "[class*='Canvas']",
    "[id*='editor']",
    "[class*='editor-wrap']",
    "[class*='schematic']",
    "[class*='pcb']",
    ".eda-canvas",
    "#svgEditor",
    "svg.graph",
  ];

  // ── EasyEDA global JS object keys ─────────────────────────────────────────
  const GLOBAL_KEYS = [
    "EasyEDA",
    "eda",
    "edaApp",
    "EASYEDA",
    "easyeda",
    "lceda",
    "EDA",
  ];

  // ── Toolbar / save button selectors ───────────────────────────────────────
  const TOOLBAR_SELECTORS = [
    "[title*='Save']",
    "[title*='save']",
    "[aria-label*='Save']",
    "[aria-label*='save']",
    "button[class*='save']",
    "[class*='toolbar']",
    "[class*='Toolbar']",
    "[id*='toolbar']",
    "[id*='topbar']",
  ];

  function checkURL() {
    const url = location.href;
    for (const pat of EDITOR_URL_PATTERNS) {
      if (pat.test(url)) return true;
    }
    return false;
  }

  function checkCanvas() {
    for (const sel of CANVAS_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function checkGlobals() {
    for (const key of GLOBAL_KEYS) {
      if (window[key] !== undefined) return key;
    }
    return null;
  }

  function checkToolbar() {
    for (const sel of TOOLBAR_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function detectType() {
    const url = location.href;
    if (/pro\.easyeda\.com/i.test(url)) return "pro";
    if (/lceda\.cn/i.test(url)) return "pro"; // Pro CN
    return "standard";
  }

  /**
   * Run all detection strategies and return result or null.
   */
  function detectNow() {
    const urlMatch = checkURL();
    const canvasEl = checkCanvas();
    const globalKey = checkGlobals();
    const toolbarEl = checkToolbar();

    if (canvasEl) {
      return { type: detectType(), element: canvasEl, strategy: "canvas" };
    }
    if (globalKey) {
      return { type: detectType(), element: document.body, strategy: "global:" + globalKey };
    }
    if (toolbarEl) {
      return { type: detectType(), element: toolbarEl, strategy: "toolbar" };
    }
    // URL match alone is enough — we know we're in an editor, save will work
    if (urlMatch) {
      return { type: detectType(), element: document.body, strategy: "url-only" };
    }
    return null;
  }

  const MAX_RETRIES = 40;   // more retries, EasyEDA Pro SPA loads slowly
  const BASE_DELAY_MS = 800;

  function waitForEditor() {
    return new Promise((resolve, reject) => {
      const immediate = detectNow();
      if (immediate) {
        log.info("Editor detected immediately", { strategy: immediate.strategy, type: immediate.type });
        return resolve(immediate);
      }

      let attempt = 0;
      let resolved = false;
      let retryTimer = null;

      // MutationObserver — fires on any DOM change
      const observer = new MutationObserver(() => {
        if (resolved) return;
        const found = detectNow();
        if (found) {
          resolved = true;
          observer.disconnect();
          clearTimeout(retryTimer);
          log.info("Editor detected via MutationObserver", { strategy: found.strategy, type: found.type });
          resolve(found);
        }
      });

      try {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["id", "class", "src"],
        });
      } catch (_) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      function scheduleRetry() {
        if (resolved) return;
        if (attempt >= MAX_RETRIES) {
          observer.disconnect();
          // Last resort: if URL matches, resolve anyway so saves still fire
          if (checkURL()) {
            log.warn("Canvas not found but URL matches — proceeding with url-only detection");
            resolved = true;
            resolve({ type: detectType(), element: document.body, strategy: "url-fallback" });
          } else {
            log.warn("Editor not detected after max retries", { maxRetries: MAX_RETRIES });
            reject(new Error("EasyEDA editor not found after retries"));
          }
          return;
        }
        const delay = Math.min(BASE_DELAY_MS * Math.pow(1.3, attempt), 6000);
        attempt++;
        log.debug(`Detector: canvas not found (attempt ${attempt})`);
        retryTimer = setTimeout(() => {
          if (resolved) return;
          const found = detectNow();
          if (found) {
            resolved = true;
            observer.disconnect();
            log.info("Editor detected via retry", { attempt, strategy: found.strategy, type: found.type });
            resolve(found);
          } else {
            scheduleRetry();
          }
        }, delay);
      }

      scheduleRetry();
    });
  }

  global.__autoSaveEditorDetector = { waitForEditor, detectNow, checkURL };
})(window);
