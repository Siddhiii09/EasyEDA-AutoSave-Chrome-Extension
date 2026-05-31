# 🚀 EasyEDA AutoSave Chrome Extension

Chrome extension that automatically saves EasyEDA PCB & schematic projects at configurable intervals.

**Never lose your PCB design progress again.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=googlechrome)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)


---

## 📌 Overview

EasyEDA AutoSave is a production-ready Chrome Extension built specifically for EasyEDA users.

The extension automatically triggers project saves at regular intervals using keyboard shortcut simulation, ensuring that your PCB and schematic designs are continuously protected from accidental browser crashes, power failures, network interruptions, or forgotten manual saves.

### Supported Platforms

- ✅ EasyEDA Standard
- ✅ EasyEDA Pro
- ✅ Chrome Manifest V3
- ✅ Persistent Save Statistics
- ✅ Automatic Editor Detection
- ✅ Manual Save Button
- ✅ Custom Save Intervals

---

## ✨ Features

| Feature | Description |
|----------|------------|
| Auto Save | Automatically saves projects every 10 seconds |
| Save Now | Manual save button from popup |
| Editor Detection | Automatically detects EasyEDA editors |
| EasyEDA Standard Support | Works on standard EasyEDA |
| EasyEDA Pro Support | Works on EasyEDA Pro |
| Persistent Storage | Settings saved across browser sessions |
| Statistics Tracking | Tracks total and session saves |
| Health Monitoring | Verifies extension is running correctly |
| Retry Logic | Handles delayed editor loading |
| Manifest V3 | Modern Chrome Extension architecture |

---

## 🏗️ Architecture

```text
EasyEDA AutoSave
│
├── Editor Detector
│
├── Save Trigger
│
├── Interval Manager
│
├── State Watcher
│
├── Storage Manager
│
└── Popup UI
```

### Core Workflow

1. Detect EasyEDA editor
2. Start autosave timer
3. Trigger Ctrl + S every 10 seconds
4. Record statistics
5. Update popup UI
6. Continue monitoring editor health

---

## 📂 Project Structure

```text
easyeda-autosave/
│
├── manifest.json
│
├── src/
│   ├── content.js
│   ├── editorDetector.js
│   ├── saveTrigger.js
│   ├── intervalManager.js
│   ├── stateWatcher.js
│   ├── storageManager.js
│   └── logger.js
│
├── popup/
│   ├── popup.html
│   └── popup.js
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── README.md
```

---

## ⚙️ How It Works

### Editor Detection

The extension continuously monitors EasyEDA pages and automatically detects when an editor becomes available.

### Auto Save Trigger

Every 10 seconds:

```javascript
Ctrl + S
```

is simulated using JavaScript Keyboard Events.

### Statistics Tracking

The extension stores:

- Total Saves
- Session Saves
- Last Save Timestamp
- Extension Status

using Chrome Storage API.

---

## 🖥 Popup Features

### Toggle Autosave

Enable or disable autosave instantly.

### Save Count

View:

- Total Saves
- Current Session Saves

### Save Now

Trigger an immediate save without waiting for the interval.

---

## 📋 Console Logs

The extension generates structured logs:

```text
[AutoSave] Editor detected
[AutoSave] Autosave started
[AutoSave] Save triggered
[AutoSave] Save success
[AutoSave] Save failure
```

---

## 🚀 Installation

### Load Unpacked Extension

1. Download the repository

```bash
git clone https://github.com/Siddhii09/EasyEDA-AutoSave-Chrome-Extension.git
```

2. Open:

```text
chrome://extensions
```

3. Enable:

```text
Developer Mode
```

4. Click:

```text
Load Unpacked
```

5. Select project folder

6. Open EasyEDA

7. Extension activates automatically

---

## 🔒 Permissions

| Permission | Purpose |
|------------|----------|
| storage | Save settings and statistics |
| tabs | Communicate with active EasyEDA tab |
| scripting | Inject content scripts |
| host_permissions | Access EasyEDA pages |

---

## 🛠 Development

Built using:

- Vanilla JavaScript
- Chrome Extensions API
- Manifest V3
- MutationObserver
- Chrome Storage API

No external frameworks required.

---

## 🔮 Future Enhancements

- Custom keyboard shortcuts
- Backup history
- Cloud sync
- Notification system
- Advanced analytics
- Export save statistics

---

## 🤝 Contributing

Contributions are welcome.

1. Fork Repository
2. Create Branch
3. Commit Changes
4. Push Changes
5. Create Pull Request


---

## ⭐ Support

If this project saves your PCB design, consider giving the repository a star.

It helps support future development.

**Built for EasyEDA users who never want to lose their work again.**
