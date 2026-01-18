import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getTracks: () => ipcRenderer.invoke('get-tracks'),
  getLibraryFolders: () => ipcRenderer.invoke('get-library-folders'),
  addLibraryFolder: (path: string) => ipcRenderer.invoke('add-library-folder', path),
  removeLibraryFolder: (path: string) => ipcRenderer.invoke('remove-library-folder', path),
  updateTrack: (id: string, updates: any) => ipcRenderer.invoke('update-track', id, updates),
  scanLibrary: () => ipcRenderer.invoke('scan-library'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  // We can add a listener for progress if needed, but for now scan is one-shot promise in UI
});
