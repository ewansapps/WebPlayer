
import React, { useMemo } from 'react';
import { Track } from '../types';
import { Disc, Music, Image } from 'lucide-react';

interface AlbumViewProps {
  tracks: Track[];
  onSelectAlbum: (albumName: string) => void;
  onUpdateAlbumCover: (albumName: string) => void;
  enableScroll?: boolean;
}

interface AlbumData {
  name: string;
  artist: string;
  coverUrl: string;
  trackCount: number;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ 
  tracks, 
  onSelectAlbum, 
  onUpdateAlbumCover,
  enableScroll = true 
}) => {
  const albums = useMemo(() => {
    const albumMap = new Map<string, AlbumData>();

    tracks.forEach(track => {
      const albumName = track.album || 'Unknown Album';
      
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          name: albumName,
          artist: track.artist,
          coverUrl: track.coverUrl,
          trackCount: 0
        });
      }
      
      const album = albumMap.get(albumName)!;
      album.trackCount += 1;
    });

    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  if (albums.length === 0) {
    if (!enableScroll) return null;
    
    return (
      <div className="flex flex-col items-center justify-center h-full pb-20 text-center px-4 animate-fade-in">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-indigo-500/10">
          <Disc size={32} className="text-zinc-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Albums</h2>
        <p className="text-zinc-400 max-w-sm text-sm">
          Import music to see your albums here.
        </p>
      </div>
    );
  }

  const containerClass = enableScroll 
    ? "p-5 pb-28 w-full overflow-y-auto" 
    : "w-full";

  return (
    <div className={containerClass}>
      {enableScroll && (
        <div className="flex items-center justify-end mb-4 border-b border-zinc-800 pb-2">
          <span className="text-xs text-zinc-500 font-medium">{albums.length} albums</span>
        </div>
      )}
      
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {albums.map((album) => (
          <div 
            key={album.name} 
            onClick={() => onSelectAlbum(album.name)}
            className="group relative bg-zinc-900/30 p-3 rounded-lg transition-all duration-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 cursor-pointer"
          >
            <div className="relative aspect-square mb-3 rounded-md overflow-hidden shadow-lg bg-zinc-950">
              {album.coverUrl ? (
                <img 
                  src={album.coverUrl} 
                  alt={album.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <Music className="text-zinc-700" size={32} />
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                 <div className="w-10 h-10 rounded-full bg-indigo-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                   <Disc size={20} />
                 </div>
                 
                 {/* Update Cover Button */}
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateAlbumCover(album.name);
                    }}
                    className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-indigo-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Set Album Cover"
                  >
                    <Image size={14} />
                  </button>
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="font-semibold text-xs truncate text-zinc-200 group-hover:text-white transition-colors" title={album.name}>
                {album.name}
              </h3>
              <p className="text-[10px] text-zinc-500 truncate" title={album.artist}>
                {album.artist} • {album.trackCount} songs
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
