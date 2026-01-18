"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const db_1 = require("./db");
const mm = __importStar(require("music-metadata"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const url_1 = require("url");
// Register privileges
electron_1.protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);
let mainWindow = null;
// --- Helpers (Ported from server/index.ts) ---
function generateId(filePath) {
    return crypto_1.default.createHash('md5').update(filePath).digest('hex');
}
async function getLibraryFolders() {
    const db = (0, db_1.getDB)();
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['libraryFolders']);
    if (setting && setting.value) {
        try {
            return JSON.parse(setting.value);
        }
        catch (e) {
            return [];
        }
    }
    return [];
}
async function saveLibraryFolders(folders) {
    const db = (0, db_1.getDB)();
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['libraryFolders', JSON.stringify(folders)]);
}
async function scanDirectory(dir, fileList = []) {
    try {
        const files = await fs_1.default.promises.readdir(dir);
        for (const file of files) {
            const filePath = path_1.default.join(dir, file);
            try {
                const stat = await fs_1.default.promises.stat(filePath);
                if (stat.isDirectory()) {
                    await scanDirectory(filePath, fileList);
                }
                else {
                    const ext = path_1.default.extname(file).toLowerCase();
                    if (['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext)) {
                        fileList.push(filePath);
                    }
                }
            }
            catch (err) {
                // Ignore errors accessing specific files
            }
        }
    }
    catch (err) {
        console.warn(`Could not access directory: ${dir}`);
    }
    return fileList;
}
async function syncLibrary() {
    console.log('Starting library sync...');
    const db = (0, db_1.getDB)();
    const folders = await getLibraryFolders();
    const allFoundFiles = new Set();
    let addedCount = 0;
    let deletedCount = 0;
    for (const folder of folders) {
        const files = await scanDirectory(folder);
        for (const filePath of files) {
            allFoundFiles.add(filePath);
            const existing = await db.get('SELECT id FROM tracks WHERE filePath = ?', [filePath]);
            if (!existing) {
                try {
                    const metadata = await mm.parseFile(filePath);
                    const id = generateId(filePath);
                    const title = metadata.common.title || path_1.default.basename(filePath, path_1.default.extname(filePath));
                    const artist = metadata.common.artist || 'Unknown Artist';
                    const album = metadata.common.album || 'Unknown Album';
                    const duration = metadata.format.duration || 0;
                    const genre = metadata.common.genre ? metadata.common.genre[0] : 'Unknown';
                    // Use custom protocol or just file ID for frontend to request
                    const audioUrl = `media://audio/${id}`;
                    const coverUrl = `media://cover/${id}`;
                    const lyricsStatus = (title && artist && artist !== 'Unknown Artist') ? 'pending' : 'none';
                    await db.run(`
            INSERT INTO tracks (id, title, artist, album, coverUrl, audioUrl, duration, genre, mood, lyrics, lyricsStatus, trackNumber, favorite, filePath)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                        id, title, artist, album, coverUrl, audioUrl, duration, genre, JSON.stringify([]), '',
                        lyricsStatus, metadata.common.track.no || 0, 0, filePath
                    ]);
                    addedCount++;
                }
                catch (err) {
                    console.error(`Failed to parse ${filePath}`, err);
                }
            }
        }
    }
    const allTracks = await db.all('SELECT id, filePath FROM tracks');
    for (const track of allTracks) {
        if (!allFoundFiles.has(track.filePath)) {
            await db.run('DELETE FROM tracks WHERE id = ?', [track.id]);
            deletedCount++;
        }
    }
    console.log(`Library sync complete. Added: ${addedCount}, Deleted: ${deletedCount}`);
    return { addedCount, deletedCount };
}
// --- Window Setup ---
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        icon: path_1.default.join(__dirname, '../../build/icon.png'), // Set window icon
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        },
        frame: true, // Frameless for tiling WMs
        autoHideMenuBar: true, // Hide menu bar
    });
    if (electron_is_dev_1.default) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        const indexPath = path_1.default.join(__dirname, '../../dist/index.html');
        mainWindow.loadURL((0, url_1.pathToFileURL)(indexPath).toString());
    }
}
// --- App Lifecycle ---
electron_1.app.whenReady().then(async () => {
    // 1. Initialize DB
    await (0, db_1.initDB)();
    // 2. Register Custom Protocol for Media
    electron_1.protocol.handle('media', async (request) => {
        const url = request.url.replace('media://', '');
        const [type, id] = url.split('/');
        console.log(`Media Request: ${type} ${id}`);
        // Safety check
        if (!id)
            return new Response('Not Found', { status: 404 });
        try {
            const db = (0, db_1.getDB)();
            const track = await db.get('SELECT filePath FROM tracks WHERE id = ?', [id]);
            if (!track || !track.filePath) {
                return new Response('Track not found', { status: 404 });
            }
            if (type === 'audio') {
                // Serve the file directly
                return electron_1.net.fetch((0, url_1.pathToFileURL)(track.filePath).toString());
            }
            else if (type === 'cover') {
                // Extract cover art
                try {
                    const metadata = await mm.parseFile(track.filePath);
                    const picture = metadata.common.picture ? metadata.common.picture[0] : null;
                    if (picture) {
                        return new Response(picture.data, {
                            headers: { 'Content-Type': picture.format }
                        });
                    }
                }
                catch (e) {
                    // ignore
                }
                return new Response('No cover', { status: 404 });
            }
        }
        catch (e) {
            console.error("Protocol error", e);
        }
        return new Response('Error', { status: 500 });
    });
    // 3. Create Window
    createWindow();
    // 4. Initial Sync
    syncLibrary();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// --- IPC Handlers ---
electron_1.ipcMain.handle('get-tracks', async () => {
    const db = (0, db_1.getDB)();
    const tracks = await db.all('SELECT * FROM tracks');
    return tracks.map(t => ({
        ...t,
        mood: t.mood ? JSON.parse(t.mood) : [],
        favorite: !!t.favorite
    }));
});
electron_1.ipcMain.handle('get-library-folders', async () => {
    return getLibraryFolders();
});
electron_1.ipcMain.handle('add-library-folder', async (_, folderPath) => {
    const folders = await getLibraryFolders();
    if (!folders.includes(folderPath)) {
        folders.push(folderPath);
        await saveLibraryFolders(folders);
        syncLibrary(); // Trigger sync in background
    }
    return folders;
});
electron_1.ipcMain.handle('remove-library-folder', async (_, folderPath) => {
    let folders = await getLibraryFolders();
    folders = folders.filter(f => f !== folderPath);
    await saveLibraryFolders(folders);
    syncLibrary(); // Trigger cleanup
    return folders;
});
electron_1.ipcMain.handle('update-track', async (_, id, updates) => {
    const db = (0, db_1.getDB)();
    const allowedFields = ['title', 'artist', 'album', 'genre', 'lyrics', 'favorite', 'mood', 'lyricsStatus'];
    const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));
    if (fieldsToUpdate.length > 0) {
        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
        const values = fieldsToUpdate.map(field => {
            if (field === 'mood')
                return JSON.stringify(updates[field]);
            if (field === 'favorite')
                return updates[field] ? 1 : 0;
            return updates[field];
        });
        await db.run(`UPDATE tracks SET ${setClause} WHERE id = ?`, [...values, id]);
    }
    return { success: true };
});
electron_1.ipcMain.handle('scan-library', async () => {
    return syncLibrary();
});
electron_1.ipcMain.handle('open-folder-dialog', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});
