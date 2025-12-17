"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("fs", {
  // Vault 路径管理
  getVaultPath: () => electron.ipcRenderer.invoke("fs:getVaultPath"),
  setVaultPath: (path) => electron.ipcRenderer.invoke("fs:setVaultPath", path),
  selectDirectory: () => electron.ipcRenderer.invoke("fs:selectDirectory"),
  disconnectVault: () => electron.ipcRenderer.invoke("fs:disconnectVault"),
  // 文件操作
  readDirectory: (path) => electron.ipcRenderer.invoke("fs:readDirectory", path),
  readFile: (path) => electron.ipcRenderer.invoke("fs:readFile", path),
  writeFile: (path, content) => electron.ipcRenderer.invoke("fs:writeFile", path, content),
  createFile: (path) => electron.ipcRenderer.invoke("fs:createFile", path),
  createDirectory: (path) => electron.ipcRenderer.invoke("fs:createDirectory", path),
  deleteFile: (path) => electron.ipcRenderer.invoke("fs:deleteFile", path),
  renameFile: (oldPath, newPath) => electron.ipcRenderer.invoke("fs:renameFile", oldPath, newPath),
  // 文件监听
  watch: (path) => electron.ipcRenderer.invoke("fs:watch", path),
  unwatch: () => electron.ipcRenderer.invoke("fs:unwatch"),
  onFileChange: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on("fs:change", handler);
    return () => {
      electron.ipcRenderer.removeListener("fs:change", handler);
    };
  }
});
electron.contextBridge.exposeInMainWorld("chat", {
  load: (filePath) => electron.ipcRenderer.invoke("chat:load", filePath),
  save: (filePath, messages) => electron.ipcRenderer.invoke("chat:save", filePath, messages)
});
electron.contextBridge.exposeInMainWorld("platform", {
  os: process.platform,
  isMac: process.platform === "darwin"
});
electron.contextBridge.exposeInMainWorld("appWindow", {
  setWidth: (width) => electron.ipcRenderer.invoke("window:setWidth", width)
});
electron.contextBridge.exposeInMainWorld("settings", {
  get: () => electron.ipcRenderer.invoke("settings:get"),
  set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
  reset: () => electron.ipcRenderer.invoke("settings:reset")
});
console.log("🔗 Preload 脚本已加载");
