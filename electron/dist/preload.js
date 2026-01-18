"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getTracks: () => electron_1.ipcRenderer.invoke('get-tracks'),
    getLibraryFolders: () => electron_1.ipcRenderer.invoke('get-library-folders'),
    addLibraryFolder: (path) => electron_1.ipcRenderer.invoke('add-library-folder', path),
    removeLibraryFolder: (path) => electron_1.ipcRenderer.invoke('remove-library-folder', path),
    updateTrack: (id, updates) => electron_1.ipcRenderer.invoke('update-track', id, updates),
    scanLibrary: () => electron_1.ipcRenderer.invoke('scan-library'),
    openFolderDialog: () => electron_1.ipcRenderer.invoke('open-folder-dialog'),
    // We can add a listener for progress if needed, but for now scan is one-shot promise in UI
});
