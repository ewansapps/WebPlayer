import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { app } from 'electron';

// Initialize DB
let db: Database;

export async function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'music_player.db');
  
  console.log('Initializing DB at:', dbPath);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT,
      artist TEXT,
      album TEXT,
      coverUrl TEXT, 
      audioUrl TEXT, 
      duration INTEGER,
      genre TEXT,
      mood TEXT, 
      lyrics TEXT,
      lyricsStatus TEXT DEFAULT 'none',
      trackNumber INTEGER,
      favorite INTEGER,
      filePath TEXT UNIQUE
    );
  `);
  
  // Settings table to store library paths, etc.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  
  // Migrations (re-using logic from server/db.ts)
  try {
    const columns = await db.all('PRAGMA table_info(tracks)');
    const hasLyricsStatus = columns.some(col => col.name === 'lyricsStatus');
    if (!hasLyricsStatus) {
      console.log('Migrating DB: Adding lyricsStatus column...');
      await db.exec(`ALTER TABLE tracks ADD COLUMN lyricsStatus TEXT DEFAULT 'none'`);
    }
  } catch (e) {
    console.warn('Migration failed (lyricsStatus):', e);
  }

  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
