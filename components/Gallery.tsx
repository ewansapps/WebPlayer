
import React from 'react';
import { Track } from '../types';
import { Play, Pause, Music2, Upload, Trash2, X, Image, ListPlus, Clock, SortAsc } from 'lucide-react';

interface GalleryProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onImportClick: () => void;
  onRemoveTrack: (track: Track) => void;
  onUpdateCover: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onContextMenu?: (track: Track, e: React.MouseEvent) => void;
  isPlaylistView: boolean;
  viewMode?: 'grid' | 'list';
  enableScroll?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onSort?: (key: 'title' | 'artist' | 'duration') => void;
  showTrackNumber?: boolean;
  showAlbum?: boolean;
  showCoverArt?: boolean;
}

export const Gallery: React.FC<GalleryProps> = ({ 
  tracks, 
  currentTrack, 
  isPlaying, 
  onPlayTrack, 
  onImportClick,
  onRemoveTrack,
  onUpdateCover,
  onAddToPlaylist,
  onContextMenu,
  isPlaylistView,
  viewMode = 'grid',
  enableScroll = true,
  emptyTitle,
  emptyDescription,
  onSort,
  showTrackNumber = true,
  showAlbum = true,
  showCoverArt = true
}) => {
  // Format Duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (tracks.length === 0) {
    if (!enableScroll) {
       return (
         <div className="py-10 text-center text-zinc-500 text-sm">
           No matching songs found.
         </div>
       );
    }

    const title = emptyTitle || (isPlaylistView ? "Empty Playlist" : "No songs");

    return (
      <div className="flex flex-col items-center justify-center h-full pb-20 text-center px-4 animate-fade-in">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-indigo-500/10">
          <Music2 size={32} className="text-zinc-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-zinc-400 max-w-sm text-sm">
          Import music to see your songs here.
        </p>
      </div>
    );
  }

  const containerClass = enableScroll 
    ? "p-5 pb-28 w-full overflow-y-auto custom-scrollbar" 
    : "w-full";

  const renderSortButtons = () => (
    <>
       <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">
          <SortAsc size={12} /> Sort by
       </div>
       <button onClick={() => onSort?.('title')} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold uppercase tracking-wider whitespace-nowrap">Name</button>
       <button onClick={() => onSort?.('artist')} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold uppercase tracking-wider whitespace-nowrap">Artist</button>
       <button onClick={() => onSort?.('duration')} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold uppercase tracking-wider whitespace-nowrap">Duration</button>
    </>
  );

  // --- LIST VIEW RENDER ---
  if (viewMode === 'list') {
    let gridClass = "";
    
    if (showCoverArt) {
        if (showTrackNumber && showAlbum) {
            gridClass = "grid-cols-[auto_auto_1fr_1fr_auto_auto]";
        } else if (showTrackNumber && !showAlbum) {
            gridClass = "grid-cols-[auto_auto_1fr_auto_auto]";
        } else if (!showTrackNumber && showAlbum) {
            gridClass = "grid-cols-[auto_1fr_1fr_auto_auto]";
        } else {
            gridClass = "grid-cols-[auto_1fr_auto_auto]";
        }
    } else {
        if (showTrackNumber && showAlbum) {
            gridClass = "grid-cols-[auto_1fr_1fr_auto_auto]";
        } else if (showTrackNumber && !showAlbum) {
            gridClass = "grid-cols-[auto_1fr_auto_auto]";
        } else if (!showTrackNumber && showAlbum) {
            gridClass = "grid-cols-[1fr_1fr_auto_auto]";
        } else {
            gridClass = "grid-cols-[1fr_auto_auto]";
        }
    }

    return (
      <div className={containerClass}>
        {onSort && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {renderSortButtons()}
          </div>
        )}
        <div className={`grid ${gridClass} gap-4 items-center text-zinc-500 text-[11px] uppercase font-bold tracking-wider border-b border-zinc-800 pb-2 mb-2 px-3`}>
          {showTrackNumber && <div className="w-8 text-center">#</div>}
          {showCoverArt && <div className="w-10"></div>}
          <div className="">Title</div>
          {showAlbum && <div className="hidden md:block">Album</div>}
          <div className="text-right">
            <Clock size={14} className="ml-auto" />
          </div>
          <div className="w-12 text-center">Action</div>
        </div>
        
        <div className="space-y-0.5">
          {tracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            const isCurrentPlaying = isCurrent && isPlaying;

            return (
              <div 
                key={track.id}
                onClick={() => onPlayTrack(track)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu && onContextMenu(track, e);
                }}
                className={`group grid ${gridClass} gap-4 items-center px-3 py-2 rounded-md hover:bg-zinc-800/50 transition-colors cursor-pointer ${isCurrent ? 'bg-zinc-800' : ''}`}
              >
                {showTrackNumber && (
                    <div className="w-8 text-center text-zinc-500 text-sm font-variant-numeric relative flex items-center justify-center">
                    <span className={`block group-hover:hidden ${isCurrent ? 'text-indigo-500' : ''}`}>
                        {track.trackNumber || index + 1}
                    </span>
                    <div className="hidden group-hover:block absolute">
                        {isCurrentPlaying ? (
                        <Pause size={14} className="text-white" />
                        ) : (
                        <Play size={14} className="text-white" />
                        )}
                    </div>
                    </div>
                )}
                
                {/* Mini Album Art */}
                {showCoverArt && (
                    <div className="w-10 h-10 rounded overflow-hidden bg-zinc-900 shadow-sm shrink-0">
                        <img src={track.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`text-sm font-medium truncate ${isCurrent ? 'text-indigo-400' : 'text-zinc-200'}`}>
                      {track.title}
                    </div>
                    {isCurrentPlaying && (
                       <div className="flex gap-0.5 items-end h-3 shrink-0">
                          <div className="w-0.5 bg-indigo-500 equalizer-bar"></div>
                          <div className="w-0.5 bg-indigo-500 equalizer-bar"></div>
                          <div className="w-0.5 bg-indigo-500 equalizer-bar"></div>
                       </div>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate group-hover:text-zinc-400">
                    {track.artist}
                  </div>
                </div>

                {showAlbum && (
                  <div className="hidden md:block text-xs text-zinc-500 truncate min-w-0 group-hover:text-zinc-400">
                    {track.album}
                  </div>
                )}

                <div className="text-xs text-zinc-500 text-right font-mono">
                   {track.duration ? formatDuration(track.duration) : '--:--'}
                </div>

                <div className="flex items-center justify-end gap-2 w-12 opacity-0 group-hover:opacity-100 transition-opacity">
                   {!isPlaylistView && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlaylist(track);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-md hover:bg-zinc-700 transition-colors"
                        title="Add to Playlist"
                      >
                        <ListPlus size={14} />
                      </button>
                   )}
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md hover:bg-zinc-700 transition-colors"
                    title="Remove"
                   >
                     {isPlaylistView ? <X size={14} /> : <Trash2 size={14} />}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- GRID VIEW RENDER ---
  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {onSort && renderSortButtons()}
        </div>
        <span className="text-xs text-zinc-500 font-medium shrink-0">{tracks.length} songs</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {tracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id;
          const isCurrentPlaying = isCurrent && isPlaying;

          return (
            <div 
              key={track.id}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu && onContextMenu(track, e);
              }}
              className={`group relative bg-zinc-900/30 p-3 rounded-lg transition-all duration-300 hover:bg-zinc-800 border border-transparent ${isCurrent ? 'border-indigo-500/30 bg-zinc-800' : 'hover:border-zinc-700'}`}
            >
              <div className="relative aspect-square mb-3 rounded-md overflow-hidden shadow-lg bg-zinc-950">
                <img 
                  src={track.coverUrl} 
                  alt={track.title} 
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isCurrentPlaying ? 'scale-105' : ''}`}
                  loading="lazy"
                />
                
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isCurrent ? 'opacity-100 bg-black/20' : ''}`}>
                   <button 
                     onClick={() => onPlayTrack(track)}
                     className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-400 hover:scale-105 transition-all shadow-lg"
                   >
                     {isCurrentPlaying ? (
                       <Pause size={18} fill="currentColor" />
                     ) : (
                       <Play size={18} fill="currentColor" className="ml-0.5" />
                     )}
                   </button>
                </div>

                {!isPlaylistView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist(track);
                    }}
                    className="absolute top-1.5 left-1.5 p-1.5 rounded-full bg-black/60 hover:bg-indigo-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Add to playlist"
                  >
                    <ListPlus size={14} />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrack(track);
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                  title={isPlaylistView ? "Remove from playlist" : "Delete from library"}
                >
                  {isPlaylistView ? <X size={14} /> : <Trash2 size={14} />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCover(track);
                  }}
                  className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-indigo-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                  title="Change album art"
                >
                  <Image size={14} />
                </button>

                {isCurrentPlaying && (
                  <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-3">
                     <div className="w-0.5 bg-indigo-400 equalizer-bar"></div>
                     <div className="w-0.5 bg-indigo-400 equalizer-bar"></div>
                     <div className="w-0.5 bg-indigo-400 equalizer-bar"></div>
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <h3 className={`font-semibold text-xs truncate ${isCurrent ? 'text-indigo-400' : 'text-zinc-200'}`} title={track.title}>
                  {track.title}
                </h3>
                <p className="text-[10px] text-zinc-500 truncate" title={track.artist}>{track.artist}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
