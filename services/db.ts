import { Track, Playlist } from '../types';

const DB_NAME = 'MusePlayerDB';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';
const PLAYLISTS_STORE = 'playlists';

// Open Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const dbService = {
  // --- Tracks ---

  async addTrack(track: Track): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TRACKS_STORE, 'readwrite');
      const store = transaction.objectStore(TRACKS_STORE);
      // We store the track as is. IndexedDB can clone Blobs.
      // Note: audioUrl and coverUrl (if blob urls) are temporary and useless to save, 
      // but we keep the object structure. When loading, we regenerate URLs from blobs.
      const request = store.put(track);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteTrack(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TRACKS_STORE, 'readwrite');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async updateTrack(track: Track): Promise<void> {
    return this.addTrack(track); // put() acts as update if key exists
  },

  async getAllTracks(): Promise<Track[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TRACKS_STORE, 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const tracks = request.result as Track[];
        // Regenerate Blob URLs because previous session URLs are dead
        const revivedTracks = tracks.map(t => ({
          ...t,
          audioUrl: t.sourceBlob ? URL.createObjectURL(t.sourceBlob) : t.audioUrl,
          coverUrl: t.coverBlob ? URL.createObjectURL(t.coverBlob) : t.coverUrl
        }));
        resolve(revivedTracks);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // --- Playlists ---

  async savePlaylists(playlists: Playlist[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLAYLISTS_STORE, 'readwrite');
      const store = transaction.objectStore(PLAYLISTS_STORE);
      
      // Clear old playlists to sync full state (simpler than diffing)
      store.clear().onsuccess = () => {
        if (playlists.length === 0) {
          resolve();
          return;
        }
        
        let count = 0;
        playlists.forEach(pl => {
          // We don't want to duplicate heavy track blobs in playlists if possible,
          // but for simplicity in this architecture, we save the full object.
          // In a relational DB, we'd save IDs. 
          // To keep IDB size down, we should strip blobs from playlist tracks if they exist in main tracks,
          // but the App expects full Track objects.
          // Optimization: We will save the playlist, but user logic must ensure
          // on load that we don't double-create URLs if not needed.
          
          // Actually, storing tracks inside playlists in IDB duplicates data.
          // A better approach for persistence: Store { id, name, trackIds: string[] }
          // But we need to match the TS interface. 
          // Let's just store it. IndexedDB quota is usually large (percentage of disk space).
          store.put(pl).onsuccess = () => {
            count++;
            if (count === playlists.length) resolve();
          };
        });
      };
    });
  },

  async getPlaylists(availableTracks: Track[]): Promise<Playlist[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLAYLISTS_STORE, 'readonly');
      const store = transaction.objectStore(PLAYLISTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawPlaylists = request.result as Playlist[];
        
        // We need to ensure the tracks inside playlists have valid URLs.
        // Since we loaded availableTracks (with fresh URLs) already, 
        // we can re-map the playlist tracks to the fresh instances from 'availableTracks'
        // to ensure referential integrity and valid URLs.
        
        const hydratedPlaylists = rawPlaylists.map(pl => ({
          ...pl,
          tracks: pl.tracks.map(plTrack => {
            const freshTrack = availableTracks.find(t => t.id === plTrack.id);
            return freshTrack || plTrack; // Fallback to plTrack (urls might be broken if track deleted from main lib)
          }).filter(t => t !== undefined)
        }));

        resolve(hydratedPlaylists);
      };
      request.onerror = () => reject(request.error);
    });
  }
};