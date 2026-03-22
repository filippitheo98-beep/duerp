const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("duerp", {
  saveServerUrl: (url) => ipcRenderer.invoke("duerp-save-server-url", url),
});
