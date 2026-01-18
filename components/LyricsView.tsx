
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, Music, Trash2, Globe, Loader2, Edit, Save, Check, AlignLeft, Mic2, Play, Pause } from 'lucide-react';
import { Track } from '../types';

interface LyricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onImportLyrics: (track: Track) => void;
  onRemoveLyrics: (track: Track) => void;
  onFetchLyrics: (track: Track) => Promise<void>;
  onSaveLyrics: (track: Track, lyrics: string) => void;
}

interface LyricLine {
  time: number;
  text: string;
}

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const LyricsView: React.FC<LyricsViewProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onImportLyrics,
  onRemoveLyrics,
  onFetchLyrics,
  onSaveLyrics
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState('');
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen) {
        setIsEditing(false); // Reset on open
        setEditedLyrics('');
        // Default to synced if available, otherwise plain could be better, 
        // but we'll stick to 'synced' as default state unless logic forces otherwise.
        setViewMode('synced');
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStartEdit = () => {
    setEditedLyrics(currentTrack?.lyrics || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (currentTrack) {
        onSaveLyrics(currentTrack, editedLyrics);
        setIsEditing(false);
    }
  };

  // Parse LRC format: [mm:ss.xx] text
  const parsedLyrics = useMemo(() => {
    if (!currentTrack?.lyrics) return [];

    const lines: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2})(\.\d{2,3})?\](.*)/;

    currentTrack.lyrics.split('\n').forEach(line => {
      const match = line.match(regex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseFloat(match[3]) : 0;
        const text = match[4].trim();
        
        if (text) {
          lines.push({
            time: minutes * 60 + seconds + milliseconds,
            text
          });
        }
      }
    });

    return lines;
  }, [currentTrack]);

  // Generate plain text version by stripping tags
  const plainLyrics = useMemo(() => {
    if (!currentTrack?.lyrics) return '';
    
    // Check for timestamps to decide if stripping is needed
    const hasTimestamps = /\[\d{2}:\d{2}(\.\d{1,3})?\]/.test(currentTrack.lyrics);
    
    if (!hasTimestamps) return currentTrack.lyrics;

    return currentTrack.lyrics
      .split('\n')
      .map(line => {
        // Global replace for timestamps in the line
        let cleaned = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, '');
        // Remove metadata tags that are the whole line
        cleaned = cleaned.replace(/^\[(ti|ar|al|by|offset|length|re|ve):.*?\]$/i, '');
        return cleaned.trim();
      })
      .filter(line => line.length > 0)
      .join('\n');
  }, [currentTrack]);

  // Find current active line index
  const activeIndex = useMemo(() => {
    if (parsedLyrics.length === 0) return -1;
    // Find the last line that has a time <= currentTime
    return parsedLyrics.findIndex((line, index) => {
      const nextLine = parsedLyrics[index + 1];
      return line.time <= currentTime && (!nextLine || nextLine.time > currentTime);
    });
  }, [parsedLyrics, currentTime]);

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current && activeIndex !== -1 && isOpen && !isEditing && viewMode === 'synced') {
      const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex, isOpen, isEditing, viewMode]);

  const handleFetchClick = async () => {
    if (!currentTrack) return;
    setIsFetching(true);
    try {
        await onFetchLyrics(currentTrack);
    } catch (error) {
        console.error("Fetch error caught in view", error);
    } finally {
        if (isMounted.current) {
            setIsFetching(false);
        }
    }
  };

  const hasLyrics = !!currentTrack?.lyrics;
  const hasSyncedLyrics = parsedLyrics.length > 0;

  return (
    <div 
      className={`fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col transition-all duration-500 ease-in-out transform ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white">{currentTrack?.title || 'Unknown Track'}</h2>
          <p className="text-zinc-400 text-sm">{currentTrack?.artist || 'Unknown Artist'}</p>
        </div>
        <div className="flex items-center gap-3">
          {hasLyrics && !isEditing && (
            <>
              <button 
                  onClick={() => setViewMode(viewMode === 'synced' ? 'plain' : 'synced')}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                  title={viewMode === 'synced' ? "Switch to Plain Text" : "Switch to Synced Lyrics"}
              >
                  {viewMode === 'synced' ? <AlignLeft size={20} /> : <Mic2 size={20} />}
              </button>
              <button 
                  onClick={handleStartEdit}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                  title="Edit Lyrics"
              >
                  <Edit size={20} />
              </button>
            </>
          )}

          {isEditing ? (
             <>
                <button 
                  onClick={handleSave}
                  className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  title="Save Changes"
                >
                  <Save size={20} />
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                  title="Cancel Editing"
                >
                  <X size={20} />
                </button>
             </>
          ) : (
             <>
                 {hasLyrics && (
                    <button 
                    onClick={() => currentTrack && onRemoveLyrics(currentTrack)}
                    className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 text-zinc-400 transition-colors"
                    title="Remove Lyrics"
                    >
                    <Trash2 size={20} />
                    </button>
                 )}
                <button 
                    onClick={onClose}
                    className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                    <X size={20} />
                </button>
             </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center">
        {!currentTrack ? (
          <div className="text-zinc-500 flex flex-col items-center gap-4">
             <Music size={48} className="opacity-20" />
             <p>No track playing</p>
          </div>
        ) : isEditing ? (
           <div className="w-full h-full p-6">
              <textarea 
                 value={editedLyrics}
                 onChange={(e) => setEditedLyrics(e.target.value)}
                 className="w-full h-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 text-white font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                 placeholder="Enter lyrics here...&#10;[00:12.34] Line 1&#10;[00:15.67] Line 2"
                 autoFocus
              />
           </div>
        ) : hasLyrics ? (
           // Lyric Display Logic
           viewMode === 'plain' || !hasSyncedLyrics ? (
              // Plain Text View
              <div className="w-full h-full overflow-y-auto py-12 px-6 custom-scrollbar">
                  <p className="text-zinc-300 font-medium text-lg leading-relaxed whitespace-pre-wrap max-w-2xl mx-auto text-center">
                    {plainLyrics}
                  </p>
              </div>
           ) : (
              // Synced View
              <div 
                ref={scrollContainerRef}
                className="w-full h-full overflow-y-auto py-[50vh] px-6 text-center space-y-8 scroll-smooth no-scrollbar"
              >
                {parsedLyrics.map((line, index) => (
                  <p
                    key={index}
                    className={`text-2xl md:text-4xl font-bold transition-all duration-500 transform ${
                      index === activeIndex 
                        ? 'text-white scale-100 opacity-100 blur-0' 
                        : 'text-zinc-500 scale-95 opacity-40 blur-[1px]'
                    }`}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
           )
        ) : (
          // No Lyrics Found State
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6 opacity-50">
              <Music size={32} className="text-zinc-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Lyrics Found</h3>
            <p className="text-zinc-400 mb-8 max-w-md">
              We couldn't find any lyrics for this song. You can import an .lrc file to sync lyrics manually, fetch them online, or write them yourself.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
                <button
                onClick={handleFetchClick}
                disabled={isFetching}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isFetching ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                Fetch Lyrics
                </button>
                <button
                onClick={() => onImportLyrics(currentTrack)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105"
                >
                <Upload size={18} />
                Import .lrc File
                </button>
                <button
                  onClick={handleStartEdit}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Edit size={18} />
                  Write Lyrics
                </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Right Controls (Play/Pause & Time) */}
      {currentTrack && (
        <div className="absolute bottom-8 right-8 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl z-20">
            <span className="text-zinc-400 text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button 
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
        </div>
      )}
    </div>
  );
};
