import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  pingDb: async () => {
    return await ipcRenderer.invoke('db:ping');
  },
});
