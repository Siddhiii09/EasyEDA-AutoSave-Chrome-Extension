/**
 * popup.js — Popup UI controller for EasyEDA AutoSave
 */
"use strict";

// ── DOM refs ──
const statusBadge     = document.getElementById("statusBadge");
const statusText      = document.getElementById("statusText");
const enableToggle    = document.getElementById("enableToggle");
const intervalLabel   = document.getElementById("intervalLabel");
const intervalCurrent = document.getElementById("intervalCurrent");
const presetChips     = document.getElementById("presetChips");
const customInput     = document.getElementById("customInput");
const applyBtn        = document.getElementById("applyBtn");
const errorMsg        = document.getElementById("errorMsg");
const totalSaves      = document.getElementById("totalSaves");
const sessionSaves    = document.getElementById("sessionSaves");
const lastSaveTime    = document.getElementById("lastSaveTime");
const saveResultDot   = document.getElementById("saveResultDot");
const saveNowBtn      = document.getElementById("saveNowBtn");
const resetBtn        = document.getElementById("resetBtn");
const editorTypeLabel = document.getElementById("editorTypeLabel");
const noEditorWarn    = document.getElementById("noEditorWarn");
const savingFlash     = document.getElementById("savingFlash");

// ── Helpers ──

function formatRelativeTime(isoString) {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 5000)    return "Just now";
  if (diff < 60000)   return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatInterval(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem ? `${m}m ${rem}s` : `${m}m`;
  }
  return `${Math.floor(s / 3600)}h`;
}

function updateChipHighlight(ms) {
  const secs = Math.round(ms / 1000);
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", parseInt(chip.dataset.secs) === secs);
  });
}

function applyState(state) {
  if (!state) return;

  const running   = state.isRunning;
  const hasEditor = !!state.editorType;
  const enabled   = state.enabled;
  const ms        = state.intervalMs || 10000;

  // Toggle
  enableToggle.checked = enabled;

  // Interval display
  const fmt = formatInterval(ms);
  intervalLabel.textContent  = `every ${fmt}`;
  intervalCurrent.textContent = fmt;
  updateChipHighlight(ms);

  // Status badge
  statusBadge.className = "status-badge";
  if (!hasEditor) {
    statusBadge.classList.add("no-editor");
    statusText.textContent = "No Editor";
  } else if (running) {
    statusBadge.classList.add("active");
    statusText.textContent = "Active";
  } else {
    statusBadge.classList.add("inactive");
    statusText.textContent = "Paused";
  }

  // No editor warning
  noEditorWarn.classList.toggle("visible", !hasEditor);

  // Stats
  totalSaves.textContent   = (state.saveCount ?? 0).toLocaleString();
  sessionSaves.textContent = (state.sessionSaveCount ?? 0).toLocaleString();
  lastSaveTime.textContent = formatRelativeTime(state.lastSaveAt);

  // Save result dot
  saveResultDot.className = "save-result-dot";
  if (state.lastSaveSuccess === true)       saveResultDot.classList.add("success");
  else if (state.lastSaveSuccess === false) saveResultDot.classList.add("failure");
  else                                      saveResultDot.classList.add("unknown");

  // Editor type footer
  editorTypeLabel.textContent = hasEditor
    ? (state.editorType === "pro" ? "EasyEDA Pro" : "EasyEDA Standard")
    : "No editor detected";

  saveNowBtn.disabled = !hasEditor;
}

// ── Messaging ──

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0] ?? null));
  });
}

async function sendToContent(message) {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      resolve(chrome.runtime.lastError ? null : response);
    });
  });
}

// ── Apply interval ──

async function applyInterval(ms) {
  errorMsg.textContent = "";
  customInput.classList.remove("error");

  const secs = Math.round(ms / 1000);
  if (secs < 3) {
    errorMsg.textContent = "Minimum is 3 seconds.";
    customInput.classList.add("error");
    return;
  }
  if (secs > 3600) {
    errorMsg.textContent = "Maximum is 3600s (1 hour).";
    customInput.classList.add("error");
    return;
  }

  applyBtn.textContent = "✓";
  applyBtn.classList.add("applied");

  await sendToContent({ type: "SET_INTERVAL", intervalMs: secs * 1000 });

  const r = await sendToContent({ type: "GET_STATE" });
  if (r?.ok) applyState(r.state);

  setTimeout(() => {
    applyBtn.textContent = "Apply";
    applyBtn.classList.remove("applied");
  }, 1500);
}

// ── Event Handlers ──

// Toggle enable/disable
enableToggle.addEventListener("change", async () => {
  await sendToContent({ type: "SET_ENABLED", enabled: enableToggle.checked });
});

// Preset chip clicks
presetChips.addEventListener("click", async (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const secs = parseInt(chip.dataset.secs);
  customInput.value = secs;
  await applyInterval(secs * 1000);
});

// Custom input — apply on Enter
customInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const val = parseInt(customInput.value);
    if (!isNaN(val)) await applyInterval(val * 1000);
  }
  // Clear error on typing
  errorMsg.textContent = "";
  customInput.classList.remove("error");
});

// Apply button
applyBtn.addEventListener("click", async () => {
  const val = parseInt(customInput.value);
  if (isNaN(val) || customInput.value.trim() === "") {
    errorMsg.textContent = "Enter a number of seconds.";
    customInput.classList.add("error");
    return;
  }
  await applyInterval(val * 1000);
});

// Save Now
saveNowBtn.addEventListener("click", async () => {
  saveNowBtn.disabled = true;
  savingFlash.classList.add("visible");
  await sendToContent({ type: "SAVE_NOW" });
  setTimeout(async () => {
    const r = await sendToContent({ type: "GET_STATE" });
    if (r?.ok) applyState(r.state);
    saveNowBtn.disabled = false;
    savingFlash.classList.remove("visible");
  }, 3500);
});

// Reset stats
resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset all save statistics?")) return;
  await sendToContent({ type: "RESET_STATS" });
  const r = await sendToContent({ type: "GET_STATE" });
  if (r?.ok) applyState(r.state);
});

// Push updates from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_UPDATE") applyState(message.state);
});

// ── Init ──
async function init() {
  const r = await sendToContent({ type: "GET_STATE" });
  if (r?.ok) applyState(r.state);

  // Refresh timestamps every 10s
  setInterval(async () => {
    const r2 = await sendToContent({ type: "GET_STATE" });
    if (r2?.ok) applyState(r2.state);
  }, 10000);
}

init();
