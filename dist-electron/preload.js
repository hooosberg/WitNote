"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 平台信息
  platform: process.platform,
  // IPC 通信（预留）
  send: (channel, data) => {
    const validChannels = ["note:save", "note:load"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, callback) => {
    const validChannels = ["note:loaded", "note:saved"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  }
});
console.log("🔗 Preload 脚本已加载");
