const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (...args) => ipcRenderer.invoke(...args),
});
