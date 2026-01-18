"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
// Initialize DB
let db;
async function initDB() {
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path_1.default.join(userDataPath, 'music_player.db');
    console.log('Initializing DB at:', dbPath);
    db = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
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
    }
    catch (e) {
        console.warn('Migration failed (lyricsStatus):', e);
    }
    return db;
}
function getDB() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}
