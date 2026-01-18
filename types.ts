
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  genre: string;
  mood: string[];
  lyrics?: string; // Content of the .lrc file
  lyricsStatus?: 'none' | 'pending' | 'fetching' | 'completed' | 'failed';
  trackNumber?: number; // Track number on album
  favorite?: boolean;
  // Persistence fields
  sourceBlob?: Blob; // The actual audio file
  coverBlob?: Blob;  // The actual image file (if uploaded)
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export type PlayMode = 'sequential' | 'shuffle' | 'repeat';
export type RepeatMode = 'off' | 'all' | 'one';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
  trackId?: string; // For retry context
  isRead: boolean;
}
