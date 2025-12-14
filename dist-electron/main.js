"use strict";
const electron = require("electron");
const path = require("path");
electron.app.commandLine.appendSwitch("enable-features", "Vulkan");
electron.app.commandLine.appendSwitch("use-vulkan");
electron.app.commandLine.appendSwitch("enable-unsafe-webgpu");
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    // macOS 原生视觉效果
    vibrancy: "sidebar",
    visualEffectState: "active",
    transparent: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 18 },
    // 窗口圆角
    frame: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // 启用 WebGPU
      experimentalFeatures: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
console.log("🧘 禅意笔记本启动中...");
