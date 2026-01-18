
import React, { useEffect, useRef, useState } from 'react';
import { Play, ListPlus, Trash2, Image, Mic2, FileText, Globe, Heart, ListMusic, Info } from 'lucide-react';
import { Track } from '../types';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  track: Track | null;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onRemove: (track: Track) => void;
  onUpdateCover: (track: Track) => void;
  onImportLyrics: (track: Track) => void;
  onRemoveLyrics: (track: Track) => void;
  onFetchLyrics: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onShowInfo: (track: Track) => void;
  isPlaylistView: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  track,
  onClose,
  onPlay,
  onAddToPlaylist,
  onAddToQueue,
  onRemove,
  onUpdateCover,
  onImportLyrics,
  onRemoveLyrics,
  onFetchLyrics,
  onToggleFavorite,
  onShowInfo,
  isPlaylistView
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuRef.current;
      let { x, y } = position;

      // Prevent overflow right
      if (x + offsetWidth > innerWidth) x = x - offsetWidth;
      // Prevent overflow bottom
      if (y + offsetHeight > innerHeight) y = y - offsetHeight;

      setAdjustedPos({ x, y });
    } else if (isOpen) {
        setAdjustedPos(position);
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleClick = () => onClose();
    if (isOpen) window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const isFavorite = track.favorite;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-1 min-w-[200px] animate-fade-in"
      style={{ top: adjustedPos.y, left: adjustedPos.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
        <div className="px-3 py-2 border-b border-zinc-800 mb-1">
            <p className="text-sm font-medium text-white truncate max-w-[180px]">{track.title}</p>
            <p className="text-[10px] text-zinc-500 truncate max-w-[180px]">{track.artist}</p>
        </div>

        <button onClick={() => onPlay(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <Play size={14} /> Play
        </button>
        <button onClick={() => onAddToQueue(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <ListMusic size={14} /> Add to Queue
        </button>
        <button onClick={() => onToggleFavorite(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "text-indigo-500" : ""} /> 
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
        <button onClick={() => onAddToPlaylist(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <ListPlus size={14} /> Add to Playlist
        </button>
        <button onClick={() => onUpdateCover(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <Image size={14} /> Change Cover
        </button>
        <button onClick={() => onShowInfo(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <Info size={14} /> Track Info
        </button>
        
        <div className="my-1 border-t border-zinc-800" />
        
        <button onClick={() => onFetchLyrics(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <Globe size={14} /> Fetch Lyrics (Web)
        </button>
        <button onClick={() => onImportLyrics(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <FileText size={14} /> Import Lyrics (.lrc)
        </button>
        {track.lyrics && (
             <button onClick={() => onRemoveLyrics(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                <Mic2 size={14} /> Remove Lyrics
            </button>
        )}

        <div className="my-1 border-t border-zinc-800" />

        <button onClick={() => onRemove(track)} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors">
            <Trash2 size={14} /> {isPlaylistView ? 'Remove from Playlist' : 'Delete from Library'}
        </button>
    </div>
  );
};
