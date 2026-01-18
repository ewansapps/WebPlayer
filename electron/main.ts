import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { initDB, getDB } from './db';
import * as mm from 'music-metadata';
import fs from 'fs';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

// Register privileges
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

let mainWindow: BrowserWindow | null = null;

// --- Helpers (Ported from server/index.ts) ---

function generateId(filePath: string): string {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

async function getLibraryFolders(): Promise<string[]> {
  const db = getDB();
  const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['libraryFolders']);
  if (setting && setting.value) {
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      return [];
    }
  }
  return [];
}

async function saveLibraryFolders(folders: string[]): Promise<void> {
  const db = getDB();
  await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['libraryFolders', JSON.stringify(folders)]);
}

async function scanDirectory(dir: string, fileList: string[] = []) {
  try {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
          await scanDirectory(filePath, fileList);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (['.mp3', '.wav', '.ogg', '.flac', '.m4a'].includes(ext)) {
            fileList.push(filePath);
          }
        }
      } catch (err) {
        // Ignore errors accessing specific files
      }
    }
  } catch (err) {
    console.warn(`Could not access directory: ${dir}`);
  }
  return fileList;
}

async function syncLibrary() {
  console.log('Starting library sync...');
  const db = getDB();
  const folders = await getLibraryFolders();
  const allFoundFiles = new Set<string>();
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
          
          const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
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
        } catch (err) {
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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../../build/icon.png'), // Set window icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false 
    },
    frame: true, // Frameless for tiling WMs
    autoHideMenuBar: true, // Hide menu bar
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadURL(pathToFileURL(indexPath).toString());
  }
}

// --- App Lifecycle ---

app.whenReady().then(async () => {
  // 1. Initialize DB
  await initDB();

  // 2. Register Custom Protocol for Media
  protocol.handle('media', async (request) => {
    const url = request.url.replace('media://', '');
    const [type, id] = url.split('/');
    
    console.log(`Media Request: ${type} ${id}`);

    // Safety check
    if (!id) return new Response('Not Found', { status: 404 });

    try {
        const db = getDB();
        const track = await db.get('SELECT filePath FROM tracks WHERE id = ?', [id]);
        
        if (!track || !track.filePath) {
            return new Response('Track not found', { status: 404 });
        }

        if (type === 'audio') {
            // Serve the file directly
            return net.fetch(pathToFileURL(track.filePath).toString());
        } else if (type === 'cover') {
            // Extract cover art
            try {
                const metadata = await mm.parseFile(track.filePath);
                const picture = metadata.common.picture ? metadata.common.picture[0] : null;
                if (picture) {
                    return new Response(picture.data, {
                        headers: { 'Content-Type': picture.format }
                    });
                }
            } catch (e) {
                // ignore
            }
            return new Response('No cover', { status: 404 });
        }
    } catch (e) {
        console.error("Protocol error", e);
    }
    
    return new Response('Error', { status: 500 });
  });

  // 3. Create Window
  createWindow();
  
  // 4. Initial Sync
  syncLibrary();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.handle('get-tracks', async () => {
    const db = getDB();
    const tracks = await db.all('SELECT * FROM tracks');
    return tracks.map(t => ({
      ...t,
      mood: t.mood ? JSON.parse(t.mood) : [],
      favorite: !!t.favorite
    }));
});

ipcMain.handle('get-library-folders', async () => {
    return getLibraryFolders();
});

ipcMain.handle('add-library-folder', async (_, folderPath) => {
    const folders = await getLibraryFolders();
    if (!folders.includes(folderPath)) {
        folders.push(folderPath);
        await saveLibraryFolders(folders);
        syncLibrary(); // Trigger sync in background
    }
    return folders;
});

ipcMain.handle('remove-library-folder', async (_, folderPath) => {
    let folders = await getLibraryFolders();
    folders = folders.filter(f => f !== folderPath);
    await saveLibraryFolders(folders);
    syncLibrary(); // Trigger cleanup
    return folders;
});

ipcMain.handle('update-track', async (_, id, updates) => {
  const db = getDB();
  const allowedFields = ['title', 'artist', 'album', 'genre', 'lyrics', 'favorite', 'mood', 'lyricsStatus'];
  const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));
  
  if (fieldsToUpdate.length > 0) {
      const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
      const values = fieldsToUpdate.map(field => {
          if (field === 'mood') return JSON.stringify(updates[field]);
          if (field === 'favorite') return updates[field] ? 1 : 0;
          return updates[field];
      });
      await db.run(`UPDATE tracks SET ${setClause} WHERE id = ?`, [...values, id]);
  }
  return { success: true };
});

ipcMain.handle('scan-library', async () => {
    return syncLibrary();
});

ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});
