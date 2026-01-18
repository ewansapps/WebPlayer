
import React, { useRef } from 'react';
import { Home, Music, Upload, Disc, PlusSquare, Trash2, Library, Search, X, Heart, Bell, Settings } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  playlists: Playlist[];
  activeView: string;
  onViewChange: (view: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onImport: (files: FileList) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onToggleNotifications: () => void;
  unreadNotificationCount: number;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  playlists, 
  activeView, 
  onViewChange,
  onSelectPlaylist,
  onImport,
  onCreatePlaylist,
  onDeletePlaylist,
  searchQuery,
  onSearch,
  onToggleNotifications,
  unreadNotificationCount,
  onOpenSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImport(e.target.files);
    }
    // Reset input so same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-56 bg-zinc-950 border-r border-zinc-900 flex-shrink-0 flex flex-col h-full transition-all duration-300">
      <div className="p-4">
        {/* Header with Logo and Notification Bell */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5 text-white">
                <img 
                    src="logo.png" 
                    alt="Logo" 
                    className="w-7 h-7 rounded-lg object-cover shadow-lg shadow-indigo-500/20"
                    onError={(e) => (e.currentTarget.style.display = 'none')} 
                />
                <span className="font-bold text-lg tracking-tight">WebPlayer</span>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={onToggleNotifications}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-900"
                    title="Notifications"
                >
                    <Bell size={18} />
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-zinc-950"></span>
                    )}
                </button>
            </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 group">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search size={14} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-zinc-900 border border-transparent focus:border-indigo-500/50 rounded-lg py-2 pl-8 pr-7 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            {searchQuery && (
                <button 
                  onClick={() => onSearch('')}
                  className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-white"
                >
                    <X size={12} />
                </button>
            )}
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => onViewChange('home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeView === 'home' && !searchQuery ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
          >
            <Home size={18} />
            All Songs
          </button>
          <button 
            onClick={() => onViewChange('albums')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${(activeView === 'albums' || activeView.startsWith('album-')) && !searchQuery ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
          >
            <Library size={18} />
            Albums
          </button>
          <button 
            onClick={() => onViewChange('favorites')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeView === 'favorites' && !searchQuery ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
          >
            <Heart size={18} />
            Favorites
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-900">
           <button 
             onClick={onOpenSettings}
             className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 text-black hover:bg-zinc-200 transition-colors shadow-sm"
           >
             <Settings size={18} />
             Library Settings
           </button>
        </div>
      </div>

      <div className="px-4 py-2 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Playlists
          </h3>
          <button 
            onClick={onCreatePlaylist}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Create Playlist"
          >
            <PlusSquare size={16} />
          </button>
        </div>
        
        <div className="space-y-0.5">
          {playlists.map((pl) => (
             <div 
               key={pl.id} 
               className={`group relative flex items-center rounded-md transition-colors ${activeView === `playlist-${pl.id}` && !searchQuery ? 'bg-zinc-900' : 'hover:bg-zinc-900/40'}`}
             >
               <button
                 onClick={() => onSelectPlaylist(pl)}
                 className={`flex-1 text-left px-3 py-1.5 text-xs truncate transition-colors ${activeView === `playlist-${pl.id}` && !searchQuery ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}
               >
                 <span className="flex items-center gap-2">
                   <Disc size={13} className={activeView === `playlist-${pl.id}` && !searchQuery ? 'text-indigo-400' : 'text-zinc-700'} />
                   {pl.name}
                 </span>
               </button>
               
               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePlaylist(pl.id);
                  }}
                  className="absolute right-1 p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Playlist"
               >
                  <Trash2 size={12} />
               </button>
             </div>
          ))}
          {playlists.length === 0 && (
            <div className="px-3 py-2 text-zinc-700 text-[10px] italic">
              No playlists yet
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative gradient at bottom of sidebar */}
      <div className="h-12 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
};
