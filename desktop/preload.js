const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("app:version"),
  checkUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdate: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on("update:status", handler);
    ipcRenderer.invoke("update:last").then((s) => s && cb(s));
    return () => ipcRenderer.removeListener("update:status", handler);
  },
});
