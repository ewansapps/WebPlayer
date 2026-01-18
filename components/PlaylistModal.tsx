
import React, { useState, useEffect } from 'react';
import { X, Plus, Music, Disc } from 'lucide-react';
import { Playlist } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  mode: 'create' | 'add';
  playlists: Playlist[];
  onClose: () => void;
  onSubmit: (result: string) => void; // result is either name (create) or playlistId (add)
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  mode,
  playlists,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-5">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus size={20} className="text-indigo-500" />
                New Playlist
              </>
            ) : (
              <>
                <Music size={20} className="text-indigo-500" />
                Add to Playlist
              </>
            )}
          </h2>

          {mode === 'create' ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) onSubmit(name);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">Playlist Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Mix"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Playlist
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {playlists.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => onSubmit(pl.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-zinc-950/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all text-left group"
                    >
                      <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors">
                        <Disc size={16} />
                      </div>
                      <span className="font-medium text-sm text-zinc-300 group-hover:text-white">{pl.name}</span>
                      <span className="ml-auto text-[10px] text-zinc-500">{pl.tracks.length} songs</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  <p>No playlists yet.</p>
                </div>
              )}
              
              <button
                onClick={() => onSubmit('NEW_PLAYLIST_TRIGGER')}
                className="w-full py-2.5 mt-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Create New Playlist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
