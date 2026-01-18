
import React, { useEffect } from 'react';
import { X, Info, Calendar, Hash, Music, FileAudio } from 'lucide-react';
import { Track } from '../types';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ isOpen, onClose, track }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
           <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
             <Info size={16} className="text-indigo-500" />
             Track Information
           </h2>
           <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
             <X size={18} />
           </button>
        </div>
        
        <div className="p-6">
            {/* Main Header */}
            <div className="flex gap-5 mb-8">
                <img 
                    src={track.coverUrl} 
                    alt="Cover" 
                    className="w-24 h-24 rounded-lg object-cover shadow-lg bg-zinc-950 border border-zinc-800" 
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-white leading-snug break-words mb-1">{track.title}</h3>
                    <p className="text-indigo-400 font-medium">{track.artist}</p>
                    <p className="text-zinc-500 text-sm mt-1">{track.album}</p>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <Calendar size={12} /> Duration
                    </span>
                    <p className="text-zinc-200 text-sm font-mono">{formatDuration(track.duration)}</p>
                </div>

                <div className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <Hash size={12} /> Track Number
                    </span>
                    <p className="text-zinc-200 text-sm font-mono">{track.trackNumber || '-'}</p>
                </div>

                <div className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <Music size={12} /> Genre
                    </span>
                    <p className="text-zinc-200 text-sm truncate">{track.genre || 'Unknown'}</p>
                </div>
                
                 <div className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <FileAudio size={12} /> Format
                    </span>
                    <p className="text-zinc-200 text-sm font-mono truncate" title={track.sourceBlob?.type}>
                        {track.sourceBlob?.type.split('/')[1]?.toUpperCase() || 'AUDIO'}
                    </p>
                </div>
            </div>

            {/* Technical Details */}
            <div className="mt-6 pt-4 border-t border-zinc-800/50">
                <div className="bg-zinc-950/50 rounded-lg p-3 space-y-2 border border-zinc-800/50">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">File Size</span>
                        <span className="text-zinc-300 font-mono">{formatSize(track.sourceBlob?.size)}</span>
                    </div>
                     <div className="flex justify-between text-xs items-center">
                        <span className="text-zinc-500 shrink-0 mr-2">ID</span>
                        <span className="text-zinc-600 font-mono truncate text-[10px]" title={track.id}>{track.id}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
