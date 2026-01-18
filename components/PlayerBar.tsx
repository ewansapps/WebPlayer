
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Mic2, Maximize2, ListMusic } from 'lucide-react';
import { Track, RepeatMode } from '../types';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  progress: number; // 0 to 100
  duration: number; // in seconds
  currentTime: number; // in seconds
  onSeek: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  showLyrics: boolean;
  onToggleLyrics: () => void;
  onAlbumArtClick: () => void;
  showQueue: boolean;
  onToggleQueue: () => void;
  repeatMode: RepeatMode;
  onToggleRepeat: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  progress,
  duration,
  currentTime,
  onSeek,
  volume,
  onVolumeChange,
  showLyrics,
  onToggleLyrics,
  onAlbumArtClick,
  showQueue,
  onToggleQueue,
  repeatMode,
  onToggleRepeat
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-6 flex items-center justify-between z-50 transition-all duration-300">
      
      {/* Track Info */}
      <div className="flex items-center w-1/4 min-w-[180px]">
        {currentTrack ? (
          <>
            <div 
                className="relative group cursor-pointer"
                onClick={onAlbumArtClick}
                title="Expand Album Art"
            >
               <img 
                 src={currentTrack.coverUrl} 
                 alt={currentTrack.title} 
                 className={`w-16 h-16 rounded-md shadow-lg object-cover transition-transform duration-700 ${isPlaying ? 'animate-pulse-slow' : ''}`}
               />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-md flex items-center justify-center">
                    <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
               </div>
            </div>
            <div className="ml-4 overflow-hidden">
              <h3 className="text-white font-medium truncate text-sm">{currentTrack.title}</h3>
              <p className="text-zinc-500 text-xs truncate">{currentTrack.artist}</p>
            </div>
          </>
        ) : (
          <div className="text-zinc-600 text-sm italic">No track selected</div>
        )}
      </div>

      {/* Controls & Progress */}
      <div className="flex flex-col items-center w-2/4 max-w-xl px-4">
        <div className="flex items-center gap-6 mb-2">
          <button className="text-zinc-600 hover:text-white transition-colors">
            <Shuffle size={16} />
          </button>
          <button onClick={onPrev} className="text-zinc-300 hover:text-white transition-colors hover:scale-110 transform">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button 
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={onNext} className="text-zinc-300 hover:text-white transition-colors hover:scale-110 transform">
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button 
            onClick={onToggleRepeat}
            className={`transition-colors relative ${repeatMode !== 'off' ? 'text-indigo-400' : 'text-zinc-600 hover:text-white'}`}
            title={`Repeat: ${repeatMode === 'one' ? 'Current Track' : repeatMode === 'all' ? 'All' : 'Off'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            {repeatMode === 'all' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></span>}
          </button>
        </div>
        
        <div className="w-full flex items-center gap-3 text-xs text-zinc-500 font-mono font-medium">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-1.5 bg-zinc-800 rounded-full group cursor-pointer overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-white/30 group-hover:bg-indigo-500 transition-all duration-100 rounded-full"
              style={{ width: `${progress}%` }}
            />
            <input 
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume, Lyrics & Queue */}
      <div className="flex items-center justify-end w-1/4 min-w-[120px] gap-4">
        <button 
          onClick={onToggleLyrics}
          className={`transition-colors ${showLyrics ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'}`}
          title="Lyrics"
        >
          <Mic2 size={18} />
        </button>

        <button 
          onClick={onToggleQueue}
          className={`transition-colors ${showQueue ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'}`}
          title="Queue"
        >
          <ListMusic size={18} />
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => onVolumeChange(volume === 0 ? 0.5 : 0)} className="text-zinc-500 hover:text-white">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full relative group cursor-pointer overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-zinc-500 group-hover:bg-indigo-500 transition-colors rounded-full"
              style={{ width: `${volume * 100}%` }}
            />
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
