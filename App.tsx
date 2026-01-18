
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, Playlist, AppNotification, RepeatMode } from './types';
import { generateRandomCover } from './constants';
import { PlayerBar } from './components/PlayerBar';
import { Gallery } from './components/Gallery';
import { Sidebar } from './components/Sidebar';
import { PlaylistModal } from './components/PlaylistModal';
import { LyricsView } from './components/LyricsView';
import { AlbumArtView } from './components/AlbumArtView';
import { QueueView } from './components/QueueView';
import { AlbumView } from './components/AlbumView';
import { ContextMenu } from './components/ContextMenu';
import { CoverUploadModal } from './components/CoverUploadModal';
import { MetadataModal } from './components/MetadataModal';
import { NotificationPanel } from './components/NotificationPanel';
import { SettingsModal } from './components/SettingsModal';
import { dbService } from './services/db';
import { apiService } from './services/api';
import { fetchLyrics } from './services/lyricsService';
import { Buffer } from 'buffer';
import { ArrowLeft, LayoutList, LayoutGrid } from 'lucide-react';

// Polyfill Buffer and process for music-metadata
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).process = (window as any).process || { env: {}, version: '' };
}

const App: React.FC = () => {
  // State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0); // %
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeView, setActiveView] = useState('home'); // 'home' | 'albums' | 'favorites' | 'album-[Name]' | 'playlist-ID'
  const [displayedTracks, setDisplayedTracks] = useState<Track[]>([]);
  const [displayedAlbumTracks, setDisplayedAlbumTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Queue State
  const [queue, setQueue] = useState<Track[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  // Lyrics Fetch Queue
  const [lyricsQueue, setLyricsQueue] = useState<Track[]>([]);
  const isFetchingLyricsRef = useRef(false);

  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'add'>('create');
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);

  // Cover Modal State
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverUpdateTarget, setCoverUpdateTarget] = useState<{
    type: 'track' | 'album';
    id?: string;
    albumName?: string;
  } | null>(null);
  
  // Metadata Modal State
  const [metadataModal, setMetadataModal] = useState<{isOpen: boolean, track: Track | null}>({isOpen: false, track: null});

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Lyrics State
  const [showLyrics, setShowLyrics] = useState(false);

  // Album Art View State
  const [showAlbumArt, setShowAlbumArt] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    track: Track | null;
  }>({ isOpen: false, x: 0, y: 0, track: null });

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for updates
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const trackIdForLyrics = useRef<string | null>(null);
  
  // --- Persistence & Initialization ---
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try fetching from API first (Server Mode)
        try {
            const serverTracks = await apiService.getTracks();
            setTracks(serverTracks);

            // Restore Lyrics Queue from persisted status
            const pendingTracks = serverTracks.filter(t => t.lyricsStatus === 'pending');
            if (pendingTracks.length > 0) {
                setLyricsQueue(pendingTracks);
            }

            // Load playlists from IDB but hydrate with server tracks
            const loadedPlaylists = await dbService.getPlaylists(serverTracks);
            setPlaylists(loadedPlaylists);
        } catch (apiError) {
            console.warn("API not available, falling back to local DB (Client Mode)", apiError);
            // Fallback to local IDB if server is not running
            const loadedTracks = await dbService.getAllTracks();
            setTracks(loadedTracks);
            const loadedPlaylists = await dbService.getPlaylists(loadedTracks);
            setPlaylists(loadedPlaylists);
        }
      } catch (e) {
        console.error("Failed to load data from storage", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      dbService.savePlaylists(playlists).catch(console.error);
    }
  }, [playlists, isLoading]);

  // --- Notification System ---

  const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string, trackId?: string) => {
    const newNotif: AppNotification = {
        id: Date.now().toString() + Math.random().toString(),
        type,
        message,
        timestamp: Date.now(),
        trackId,
        isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const handleClearNotifications = () => setNotifications([]);
  const handleDismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  
  const handleRetryFetch = async (trackId: string, notificationId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    // Remove the error notification first
    handleDismissNotification(notificationId);
    
    // Update status on server so it persists as pending
    apiService.updateTrack(trackId, { lyricsStatus: 'pending' }).catch(console.warn);
    
    // Add to queue
    setLyricsQueue(prev => [...prev, { ...track, lyricsStatus: 'pending' }]);
  };

  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev);
    // Mark as read when opening? Optionally.
    if (!showNotifications) {
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // --- Fetch Logic & Queue Processing ---

  const handleFetchLyrics = useCallback(async (track: Track, isBackground = false) => {
    try {
      const lyrics = await fetchLyrics(track);
      if (lyrics) {
          const updated: Track = { ...track, lyrics, lyricsStatus: 'completed' };
          
          // Save to Local DB (for legacy/offline support)
          dbService.updateTrack(updated).catch(console.error);
          
          // Save to Server DB (the new way)
          apiService.updateTrack(track.id, { lyrics, lyricsStatus: 'completed' }).catch(err => {
              console.warn("Could not save lyrics to server", err);
          });

          setTracks(prev => prev.map(t => t.id === track.id ? updated : t));
          
          // Use functional update to avoid dependency on currentTrack
          setCurrentTrack(prev => (prev && prev.id === track.id) ? updated : prev);
          
          addNotification('success', `Lyrics fetched for "${track.title}"`, track.id);
      } else {
          // No lyrics found
          apiService.updateTrack(track.id, { lyricsStatus: 'failed' }).catch(console.warn);
          setTracks(prev => prev.map(t => t.id === track.id ? { ...t, lyricsStatus: 'failed' } : t));
          addNotification('error', `Could not find lyrics for "${track.title}"`, track.id);
      }
    } catch (e) { 
        console.error(e); 
        addNotification('error', `Error fetching lyrics for "${track.title}"`, track.id);
    }
  }, [addNotification]);

  // Process Lyrics Queue
  useEffect(() => {
    const processQueue = async () => {
      if (lyricsQueue.length === 0 || isFetchingLyricsRef.current) return;

      const track = lyricsQueue[0];
      
      // Check if track still exists in library before processing
      // This prevents errors if a track was deleted while in queue
      const trackExists = tracks.some(t => t.id === track.id);
      if (!trackExists) {
        setLyricsQueue(prev => prev.slice(1));
        return;
      }

      isFetchingLyricsRef.current = true;

      try {
        await handleFetchLyrics(track, true);
      } catch (e) {
        console.error("Queue processing error", e);
      } finally {
        // Rate limiting delay (e.g. 1 second between requests)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setLyricsQueue(prev => prev.slice(1));
        isFetchingLyricsRef.current = false;
      }
    };

    processQueue();
  }, [lyricsQueue, handleFetchLyrics, tracks]);


  // --- Audio Engine ---

  const handleNext = useCallback(() => {
    if (!currentTrack) return;

    // 1. Priority: User Queue
    if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue(prev => prev.slice(1));
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
        return;
    }

    // 2. Default: Context (Displayed Tracks)
    if (displayedTracks.length === 0) return;
    const currentIndex = displayedTracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) {
      // If current track is not in current view (e.g. from queue or old view), just play first in view
      setCurrentTrack(displayedTracks[0]);
      return;
    }
    const nextIndex = (currentIndex + 1) % displayedTracks.length;
    setCurrentTrack(displayedTracks[nextIndex]);
  }, [currentTrack, displayedTracks, queue]);

  const handlePrev = useCallback(() => {
    if (!currentTrack || displayedTracks.length === 0) return;
    
    // Previous usually just goes back in the current context, ignoring queue history for simplicity in this MVP
    const currentIndex = displayedTracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) {
      setCurrentTrack(displayedTracks[0]);
      return;
    }
    const prevIndex = (currentIndex - 1 + displayedTracks.length) % displayedTracks.length;
    setCurrentTrack(displayedTracks[prevIndex]);
  }, [currentTrack, displayedTracks]);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
        if (prev === 'off') return 'all';
        if (prev === 'all') return 'one';
        return 'off';
    });
  }, []);

  const handleAddToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    addNotification('info', `Added "${track.title}" to queue`);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleClearQueue = () => {
    setQueue([]);
    addNotification('info', "Queue cleared");
  };

  const handlePlayQueueTrack = (index: number) => {
    const trackToPlay = queue[index];
    // Remove it and all before it from queue? Or just play it and remove it?
    // Let's remove it from queue and play immediately.
    setQueue(prev => prev.filter((_, i) => i !== index));
    setCurrentTrack(trackToPlay);
    setIsPlaying(true);
  };

  // Helper to get upcoming tracks from context for display
  const getNextFromContext = useCallback(() => {
    if (!currentTrack || displayedTracks.length === 0) return [];
    const currentIndex = displayedTracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) return displayedTracks.slice(0, 5); // Fallback
    
    // Return next 10 tracks
    const result = [];
    for (let i = 1; i <= 10; i++) {
        const idx = (currentIndex + i) % displayedTracks.length;
        // Break if we loop back to start and not repeating? 
        // For now, circular list logic:
        result.push(displayedTracks[idx]);
    }
    return result;
  }, [currentTrack, displayedTracks]);

  useEffect(() => {
    if (!audioRef.current) {
        audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      if (repeatMode === 'one') {
          audio.currentTime = 0;
          audio.play();
      } else if (repeatMode === 'all') {
          // Check if we are at the end of the list
          const currentIndex = displayedTracks.findIndex(t => t.id === currentTrack?.id);
          if (currentIndex === displayedTracks.length - 1 && queue.length === 0) {
              // Loop back to start
              setCurrentTrack(displayedTracks[0]);
          } else {
              handleNext();
          }
      } else {
          // Off: standard behavior
          // If at end of list and queue empty, stop? 
          // handleNext currently loops. If we want 'Off' to stop at end, we need to modify handleNext or check here.
          // Standard handleNext in this app loops (circular).
          // If 'repeatMode' is 'off', usually it stops at the end of the playlist.
          
          const currentIndex = displayedTracks.findIndex(t => t.id === currentTrack?.id);
          if (currentIndex === displayedTracks.length - 1 && queue.length === 0) {
               setIsPlaying(false);
               // Optionally reset to first track paused?
          } else {
               handleNext();
          }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (currentTrack && (!currentTrack.duration || currentTrack.duration === 0) && audio.duration > 0) {
          const updated = { ...currentTrack, duration: audio.duration };
          dbService.updateTrack(updated).catch(console.error);
          setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
          setPlaylists(prev => prev.map(pl => ({
              ...pl,
              tracks: pl.tracks.map(t => t.id === updated.id ? updated : t)
          })));
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [volume, handleNext, currentTrack, repeatMode]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // --- Media Session API (MPRIS) Support ---

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '128x128', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '256x256', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '384x384', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/png' },
        ]
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator && audioRef.current && !isNaN(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: audioRef.current.playbackRate,
          position: audioRef.current.currentTime
        });
      } catch (error) {
        // Ignore errors for invalid state updates
      }
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
         audioRef.current?.play().then(() => setIsPlaying(true)).catch(console.error);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
         audioRef.current?.pause();
         setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
         if (details.seekTime !== undefined && details.seekTime !== null && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
            if (duration) setProgress((details.seekTime / duration) * 100);
         }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
             const newTime = Math.max(audioRef.current.currentTime - skip, 0);
             audioRef.current.currentTime = newTime;
             setCurrentTime(newTime);
             if (duration) setProgress((newTime / duration) * 100);
          }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
             const newTime = Math.min(audioRef.current.currentTime + skip, duration || 0);
             audioRef.current.currentTime = newTime;
             setCurrentTime(newTime);
             if (duration) setProgress((newTime / duration) * 100);
          }
      });
    }
  }, [handleNext, handlePrev, duration]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setDisplayedTracks(tracks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.artist.toLowerCase().includes(query) || 
        t.album.toLowerCase().includes(query)
      ));
      const matchedAlbums = new Set<string>();
      tracks.forEach(t => {
          if (t.album.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)) {
              matchedAlbums.add(t.album);
          }
      });
      setDisplayedAlbumTracks(tracks.filter(t => matchedAlbums.has(t.album)));
      return;
    }

    if (activeView === 'home') {
      setDisplayedTracks(tracks);
    } else if (activeView === 'favorites') {
      setDisplayedTracks(tracks.filter(t => t.favorite));
    } else if (activeView === 'albums') {
      setDisplayedTracks(tracks); 
    } else if (activeView.startsWith('album-')) {
      const albumName = activeView.replace('album-', '');
      const albumTracks = tracks.filter(t => t.album === albumName);
      albumTracks.sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999));
      setDisplayedTracks(albumTracks);
    } else if (activeView.startsWith('playlist-')) {
      const plId = activeView.replace('playlist-', '');
      const pl = playlists.find(p => p.id === plId);
      if (pl) setDisplayedTracks(pl.tracks);
    }
  }, [tracks, activeView, playlists, searchQuery]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      const isSameSrc = audioRef.current.src === currentTrack.audioUrl || audioRef.current.src.endsWith(currentTrack.audioUrl);
      if (!isSameSrc) {
        audioRef.current.src = currentTrack.audioUrl;
        audioRef.current.load();
      }
      if (isPlaying) {
          audioRef.current.play()
          .catch(e => {
            console.error("Playback failed:", e);
            setIsPlaying(false);
          });
      }
    }
  }, [currentTrack, isPlaying]);

  const handleSort = async (key: 'title' | 'artist' | 'duration') => {
    const sorted = [...tracks].sort((a, b) => {
      if (key === 'duration') return (a.duration || 0) - (b.duration || 0);
      return a[key].localeCompare(b[key]);
    });
    setTracks(sorted);
  };

  const handleImport = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|wma|alac|aiff)$/i.test(f.name));
    if (audioFiles.length === 0) return;

    let parseBlob: any;
    try {
      const mm = await import('music-metadata');
      parseBlob = mm.parseBlob;
    } catch (e) { console.warn(e); }
    
    const processedTracks = await Promise.all(audioFiles.map(async (file) => {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        let artist = "Unknown Artist", title = fileName, album = 'Local Import', coverUrl = "", duration = 0, coverBlob: Blob | undefined = undefined;
        let trackNumber: number | undefined = undefined;

        if (parseBlob) {
          try {
            const metadata = await parseBlob(file);
            if (metadata.common.title) title = metadata.common.title;
            if (metadata.common.artist) artist = metadata.common.artist;
            if (metadata.common.album) album = metadata.common.album;
            if (metadata.format.duration) duration = metadata.format.duration;
            if (metadata.common.track && metadata.common.track.no) trackNumber = metadata.common.track.no;
            if (metadata.common.picture?.[0]) {
              coverBlob = new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format });
              coverUrl = URL.createObjectURL(coverBlob);
            }
          } catch (error) { console.warn(error); }
        }

        if (!coverUrl) coverUrl = generateRandomCover(title + artist);

        const track: Track = {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          title, artist, album, coverUrl, audioUrl: URL.createObjectURL(file),
          duration, genre: 'Unknown', mood: [], sourceBlob: file, coverBlob,
          trackNumber
        };
        return track;
    }));

    setTracks(prev => [...prev, ...processedTracks]);
    processedTracks.forEach(track => dbService.addTrack(track).catch(console.error));
    if (tracks.length === 0 && processedTracks.length > 0) setActiveView('home');

    // Auto-fetch lyrics for new tracks
    const tracksToFetch = processedTracks.filter(t => t.title && t.artist && t.artist !== 'Unknown Artist');
    if (tracksToFetch.length > 0) {
        setLyricsQueue(prev => [...prev, ...tracksToFetch]);
    }
  };

  const handleRemoveTrack = (trackToRemove: Track) => {
    if (currentTrack?.id === trackToRemove.id) {
       audioRef.current?.pause();
       setIsPlaying(false);
       setCurrentTrack(null);
    }
    setTracks(prev => prev.filter(t => t.id !== trackToRemove.id));
    dbService.deleteTrack(trackToRemove.id).catch(console.error);
    setPlaylists(prev => prev.map(pl => ({ ...pl, tracks: pl.tracks.filter(t => t.id !== trackToRemove.id) })));
  };

  const handleToggleFavorite = (track: Track) => {
    const updated = { ...track, favorite: !track.favorite };
    dbService.updateTrack(updated).catch(console.error);
    setTracks(prev => prev.map(t => t.id === track.id ? updated : t));
    setPlaylists(prev => prev.map(pl => ({ ...pl, tracks: pl.tracks.map(t => t.id === track.id ? updated : t) })));
    if (currentTrack?.id === track.id) setCurrentTrack(updated);
  };

  const handleUpdateCover = (track: Track) => {
    setCoverUpdateTarget({ type: 'track', id: track.id });
    setIsCoverModalOpen(true);
  };

  const handleUpdateAlbumCover = (albumName: string) => {
    setCoverUpdateTarget({ type: 'album', albumName });
    setIsCoverModalOpen(true);
  };

  const handleCoverModalSubmit = (result: { file?: File; url?: string }) => {
    if (!coverUpdateTarget) return;
    let newCoverUrl = result.url || (result.file ? URL.createObjectURL(result.file) : '');
    let newCoverBlob = result.file;
    if (!newCoverUrl) return;

    if (coverUpdateTarget.type === 'track') {
       const targetId = coverUpdateTarget.id;
       setTracks(prev => prev.map(t => t.id === targetId ? { ...t, coverUrl: newCoverUrl, coverBlob: newCoverBlob } : t));
    } else if (coverUpdateTarget.type === 'album') {
       const targetAlbum = coverUpdateTarget.albumName;
       setTracks(prev => prev.map(t => t.album === targetAlbum ? { ...t, coverUrl: newCoverUrl, coverBlob: newCoverBlob } : t));
    }
    setIsCoverModalOpen(false);
  };

  const handleImportLyrics = (track: Track) => {
    trackIdForLyrics.current = track.id;
    lyricsInputRef.current?.click();
  };

  const handleRemoveLyrics = (track: Track) => {
     const updated = { ...track, lyrics: undefined, lyricsStatus: 'none' as const };
     
     apiService.updateTrack(track.id, { lyrics: '', lyricsStatus: 'none' }).catch(console.warn);
     dbService.updateTrack(updated).catch(console.warn);

     setTracks(prev => prev.map(t => t.id === track.id ? updated : t));
     if (currentTrack?.id === track.id) setCurrentTrack(prev => prev ? { ...prev, lyrics: undefined, lyricsStatus: 'none' } : null);
  };

  const handleSaveLyrics = (track: Track, lyrics: string) => {
     const updated = { ...track, lyrics };
     
     // Update Server/Electron DB
     apiService.updateTrack(track.id, { lyrics }).catch(err => console.warn("Failed to save lyrics to server:", err));
     
     // Update Local DB (Legacy)
     dbService.updateTrack(updated).catch(err => console.warn("Failed to save lyrics to local DB:", err));

     setTracks(prev => prev.map(t => t.id === track.id ? updated : t));
     if (currentTrack?.id === track.id) setCurrentTrack(updated);
  };

  const handleLyricsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && trackIdForLyrics.current) {
       const lyricsText = await e.target.files[0].text();
       const targetId = trackIdForLyrics.current;
       setTracks(prev => prev.map(t => t.id === targetId ? { ...t, lyrics: lyricsText } : t));
       trackIdForLyrics.current = null;
    }
  };
  
  const handleShowInfo = (track: Track) => {
    setMetadataModal({ isOpen: true, track });
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handleOpenCreatePlaylist = () => { setModalMode('create'); setIsModalOpen(true); };
  const handleOpenAddToPlaylist = (track: Track) => { setTrackToAdd(track); setModalMode('add'); setIsModalOpen(true); };

  const handleModalSubmit = (result: string) => {
    if (result === 'NEW_PLAYLIST_TRIGGER') { setModalMode('create'); return; }
    if (modalMode === 'create') {
      const newPlaylist: Playlist = { id: `pl-${Date.now()}`, name: result, tracks: trackToAdd ? [trackToAdd] : [] };
      setPlaylists(prev => [...prev, newPlaylist]);
      setIsModalOpen(false);
    } else if (trackToAdd) {
      setPlaylists(prev => prev.map(pl => pl.id === result ? (pl.tracks.find(t => t.id === trackToAdd.id) ? pl : { ...pl, tracks: [...pl.tracks, trackToAdd] }) : pl));
      setIsModalOpen(false);
    }
    setTrackToAdd(null);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(pl => pl.id !== id));
    if (activeView === `playlist-${id}`) setActiveView('home');
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error); }
  };

  const handleSeek = (val: number) => {
    if (audioRef.current && duration) {
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) handlePlayPause();
    else { setCurrentTrack(track); setIsPlaying(true); }
  };

  const handleSelectPlaylist = (pl: Playlist) => { setActiveView(`playlist-${pl.id}`); setSearchQuery(''); };

  const handleContextMenu = (track: Track, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, track });
  };

  const triggerImport = () => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click();

  const getPageTitle = () => {
    if (searchQuery) return `Search: "${searchQuery}"`;
    if (activeView === 'home') return 'Library';
    if (activeView === 'favorites') return 'Favorites';
    if (activeView === 'albums') return 'Albums';
    if (activeView.startsWith('album-')) return activeView.replace('album-', '');
    return playlists.find(p => `playlist-${p.id}` === activeView)?.name || 'Playlist';
  };

  const renderContent = () => {
    if (searchQuery) {
       return (
          <div className="w-full h-full overflow-y-auto p-5 pb-28 custom-scrollbar">
             {displayedAlbumTracks.length > 0 && (
                <div className="mb-8">
                   <h2 className="text-xl font-bold text-white mb-4">Matching Albums</h2>
                   <AlbumView tracks={displayedAlbumTracks} onSelectAlbum={(name) => setActiveView(`album-${name}`)} onUpdateAlbumCover={handleUpdateAlbumCover} enableScroll={false} />
                </div>
             )}
             <div>
                <h2 className="text-xl font-bold text-white mb-4">Matching Songs</h2>
                <Gallery 
                    tracks={displayedTracks} 
                    currentTrack={currentTrack} 
                    isPlaying={isPlaying} 
                    onPlayTrack={handlePlayTrack} 
                    onImportClick={triggerImport} 
                    onRemoveTrack={handleRemoveTrack} 
                    onUpdateCover={handleUpdateCover} 
                    onAddToPlaylist={handleOpenAddToPlaylist} 
                    onContextMenu={handleContextMenu} 
                    isPlaylistView={false} 
                    enableScroll={false} 
                    onSort={handleSort} 
                    viewMode={viewMode}
                    showTrackNumber={false}
                    showAlbum={true}
                />
             </div>
          </div>
       );
    }
    if (activeView === 'albums') return <AlbumView tracks={tracks} onSelectAlbum={(name) => setActiveView(`album-${name}`)} onUpdateAlbumCover={handleUpdateAlbumCover} />;
    
    // Only show track numbers if we are in a playlist or specific album view
    const showTrackNumber = activeView.startsWith('album-') || activeView.startsWith('playlist-');
    // Hide album column if we are in a specific album view
    const showAlbum = !activeView.startsWith('album-');
    // Hide cover art in specific album view (as requested)
    const showCoverArt = !activeView.startsWith('album-');
    // Disable sorting in album view to keep track order
    const enableSort = !activeView.startsWith('album-');

    return (
      <Gallery 
        tracks={displayedTracks} 
        currentTrack={currentTrack} 
        isPlaying={isPlaying} 
        onPlayTrack={handlePlayTrack} 
        onImportClick={triggerImport} 
        onRemoveTrack={handleRemoveTrack} 
        onUpdateCover={handleUpdateCover} 
        onAddToPlaylist={handleOpenAddToPlaylist} 
        onContextMenu={handleContextMenu} 
        isPlaylistView={activeView !== 'home' && !activeView.startsWith('album-')} 
        viewMode={activeView.startsWith('album-') ? 'list' : viewMode} 
        emptyTitle={activeView === 'favorites' ? 'No Favorites Yet' : undefined} 
        emptyDescription={activeView === 'favorites' ? 'Mark songs as favorite to see them here.' : undefined} 
        onSort={enableSort ? handleSort : undefined}
        showTrackNumber={showTrackNumber}
        showAlbum={showAlbum}
        showCoverArt={showCoverArt}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm animate-pulse">Restoring Library...</p>
        </div>
      </div>
    );
  }

  // Show toggle buttons only if we are NOT in the "Albums" tab (both main and details)
  const showViewToggle = (!activeView.startsWith('album') && activeView !== 'albums') || !!searchQuery;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
      </div>
      
      <Sidebar 
          playlists={playlists} 
          activeView={activeView} 
          onViewChange={(view) => { if (['home', 'albums', 'favorites'].includes(view)) { setActiveView(view); setSearchQuery(''); } }} 
          onSelectPlaylist={handleSelectPlaylist} 
          onImport={handleImport} 
          onCreatePlaylist={handleOpenCreatePlaylist} 
          onDeletePlaylist={handleDeletePlaylist} 
          searchQuery={searchQuery} 
          onSearch={setSearchQuery} 
          onToggleNotifications={handleToggleNotifications}
          unreadNotificationCount={unreadCount}
          onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={notifications} 
        onClearAll={handleClearNotifications}
        onDismiss={handleDismissNotification}
        onRetry={handleRetryFetch}
      />

      <main className="flex-1 relative z-10 flex flex-col h-full bg-black/40 backdrop-blur-sm">
        <header className="px-8 py-6 flex items-center justify-between shrink-0 border-b border-transparent">
           <div className="flex items-center gap-4">
             {!searchQuery && activeView.startsWith('album-') && <button onClick={() => setActiveView('albums')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all" title="Back to Albums"><ArrowLeft size={24} /></button>}
             <h1 className="text-2xl font-bold text-white tracking-tight truncate max-w-lg">{getPageTitle()}</h1>
           </div>
           
           {showViewToggle && (
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="List View"
                >
                  <LayoutList size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={20} />
                </button>
             </div>
           )}
        </header>
        {renderContent()}
        <div className="h-24 shrink-0"></div>
      </main>
      <LyricsView isOpen={showLyrics} onClose={() => setShowLyrics(false)} currentTrack={currentTrack} currentTime={currentTime} duration={duration} isPlaying={isPlaying} onPlayPause={handlePlayPause} onImportLyrics={handleImportLyrics} onRemoveLyrics={handleRemoveLyrics} onFetchLyrics={(t) => handleFetchLyrics(t)} onSaveLyrics={handleSaveLyrics} />
      <AlbumArtView 
        isOpen={showAlbumArt} 
        onClose={() => setShowAlbumArt(false)} 
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
      />
      <MetadataModal 
        isOpen={metadataModal.isOpen} 
        track={metadataModal.track} 
        onClose={() => setMetadataModal({ isOpen: false, track: null })} 
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onScanComplete={async () => {
            const serverTracks = await apiService.getTracks();
            
            // The server already sets lyricsStatus to 'pending' for new tracks in syncLibrary.
            // We just need to pull them into the local queue.
            const tracksToFetch = serverTracks.filter(t => t.lyricsStatus === 'pending');
            
            setTracks(serverTracks);

            if (tracksToFetch.length > 0) {
                setLyricsQueue(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newToFetch = tracksToFetch.filter(t => !existingIds.has(t.id));
                    return [...prev, ...newToFetch];
                });
            }
        }}
      />
      <QueueView 
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        queue={queue}
        nextFromContext={getNextFromContext()}
        onRemoveFromQueue={handleRemoveFromQueue}
        onPlayQueueTrack={handlePlayQueueTrack}
        onPlayContextTrack={handlePlayTrack}
        currentTrack={currentTrack}
        onClearQueue={handleClearQueue}
      />
      <PlayerBar 
        currentTrack={currentTrack} 
        isPlaying={isPlaying} 
        onPlayPause={handlePlayPause} 
        onNext={handleNext} 
        onPrev={handlePrev} 
        progress={progress} 
        duration={duration} 
        currentTime={currentTime} 
        onSeek={handleSeek} 
        volume={volume} 
        onVolumeChange={setVolume} 
        showLyrics={showLyrics} 
        onToggleLyrics={() => setShowLyrics(!showLyrics)} 
        onAlbumArtClick={() => setShowAlbumArt(true)} 
        showQueue={showQueue}
        onToggleQueue={() => setShowQueue(!showQueue)}
        repeatMode={repeatMode}
        onToggleRepeat={handleToggleRepeat}
      />
      <PlaylistModal isOpen={isModalOpen} mode={modalMode} playlists={playlists} onClose={() => { setIsModalOpen(false); setTrackToAdd(null); }} onSubmit={handleModalSubmit} />
      <CoverUploadModal isOpen={isCoverModalOpen} onClose={() => { setIsCoverModalOpen(false); setCoverUpdateTarget(null); }} onSubmit={handleCoverModalSubmit} />
      <ContextMenu isOpen={contextMenu.isOpen} position={{ x: contextMenu.x, y: contextMenu.y }} track={contextMenu.track} onClose={() => setContextMenu({ ...contextMenu, isOpen: false })} onPlay={(t) => handlePlayTrack(t)} onAddToPlaylist={(t) => handleOpenAddToPlaylist(t)} onAddToQueue={(t) => handleAddToQueue(t)} onRemove={(t) => handleRemoveTrack(t)} onUpdateCover={(t) => handleUpdateCover(t)} onImportLyrics={(t) => handleImportLyrics(t)} onRemoveLyrics={(t) => handleRemoveLyrics(t)} onFetchLyrics={(t) => handleFetchLyrics(t)} onToggleFavorite={(t) => handleToggleFavorite(t)} onShowInfo={(t) => handleShowInfo(t)} isPlaylistView={activeView.startsWith('playlist-')} />
      <input type="file" ref={lyricsInputRef} onChange={handleLyricsFileChange} accept=".lrc" className="hidden" />
    </div>
  );
};

export default App;
