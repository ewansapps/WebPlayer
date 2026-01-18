
import React, { useEffect } from 'react';
import { X, Music, Play, Pause } from 'lucide-react';
import { Track } from '../types';

interface AlbumArtViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AlbumArtView: React.FC<AlbumArtViewProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onPlayPause
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div 
      className={`fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-500 ease-in-out transform ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-md"
      >
          <X size={24} />
      </button>

      {/* Content */}
      <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Background Blur Effect */}
        {currentTrack?.coverUrl && (
             <div 
               className="absolute inset-0 bg-center bg-cover blur-[100px] opacity-30 scale-150 pointer-events-none transition-all duration-1000"
               style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
             />
        )}

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-full">
            {currentTrack?.coverUrl ? (
                <img 
                    src={currentTrack.coverUrl} 
                    alt={currentTrack.title} 
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl animate-fade-in select-none"
                    draggable={false}
                />
            ) : (
                <div className="w-80 h-80 bg-zinc-900 rounded-lg flex items-center justify-center shadow-2xl animate-fade-in">
                    <Music size={80} className="text-zinc-700" />
                </div>
            )}
            
            <div className="text-center animate-fade-in space-y-1">
                <h2 className="text-3xl font-bold text-white drop-shadow-lg tracking-tight">{currentTrack?.title || 'Unknown Track'}</h2>
                <p className="text-xl text-zinc-300 drop-shadow-md font-medium">{currentTrack?.artist || 'Unknown Artist'}</p>
            </div>
        </div>

        {/* Mini Player */}
        {currentTrack && (
            <div 
                className="absolute bottom-8 right-8 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl z-20"
                onClick={(e) => e.stopPropagation()}
            >
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
    </div>
  );
};
