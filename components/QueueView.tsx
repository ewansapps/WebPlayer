
import React from 'react';
import { Track } from '../types';
import { X, Trash2, ListMusic, Play } from 'lucide-react';

interface QueueViewProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  nextFromContext: Track[];
  onRemoveFromQueue: (index: number) => void;
  onPlayQueueTrack: (index: number) => void;
  onPlayContextTrack: (track: Track) => void;
  currentTrack: Track | null;
}

export const QueueView: React.FC<QueueViewProps> = ({
  isOpen,
  onClose,
  queue,
  nextFromContext,
  onRemoveFromQueue,
  onPlayQueueTrack,
  onPlayContextTrack,
  currentTrack
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[60] w-80 md:w-96 max-h-[calc(100vh-120px)] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-white">
          <ListMusic size={18} className="text-indigo-400" />
          <h2 className="font-bold text-sm uppercase tracking-wider">Play Queue</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* Now Playing */}
        {currentTrack && (
            <div className="mb-6">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Now Playing</h3>
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                    <img 
                        src={currentTrack.coverUrl} 
                        alt={currentTrack.title} 
                        className="w-10 h-10 rounded object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-indigo-400 truncate">{currentTrack.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{currentTrack.artist}</div>
                    </div>
                    <div className="flex gap-1">
                       <div className="w-0.5 h-3 bg-indigo-400 animate-pulse"></div>
                       <div className="w-0.5 h-3 bg-indigo-400 animate-pulse delay-75"></div>
                       <div className="w-0.5 h-3 bg-indigo-400 animate-pulse delay-150"></div>
                    </div>
                </div>
            </div>
        )}

        {/* User Queue */}
        {queue.length > 0 && (
          <div className="mb-6">
             <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Next in Queue</h3>
                <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded-full">{queue.length}</span>
             </div>
             <div className="space-y-1">
                {queue.map((track, index) => (
                    <div key={`${track.id}-q-${index}`} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                        <div className="relative w-8 h-8 shrink-0">
                            <img 
                                src={track.coverUrl} 
                                alt={track.title} 
                                className="w-full h-full rounded object-cover opacity-80 group-hover:opacity-40 transition-opacity"
                            />
                            <button 
                                onClick={() => onPlayQueueTrack(index)}
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity"
                            >
                                <Play size={12} fill="currentColor" />
                            </button>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">{track.title}</div>
                            <div className="text-[10px] text-zinc-500 truncate">{track.artist}</div>
                        </div>
                        <button 
                            onClick={() => onRemoveFromQueue(index)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from queue"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* Next from Context */}
        <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">
                {queue.length > 0 ? "Up Next" : "Next Up"}
            </h3>
            {nextFromContext.length === 0 ? (
                <div className="px-2 text-xs text-zinc-600 italic">End of playlist</div>
            ) : (
                <div className="space-y-1">
                    {nextFromContext.map((track) => (
                         <div 
                           key={track.id} 
                           className="group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                           onClick={() => onPlayContextTrack(track)}
                         >
                            <img 
                                src={track.coverUrl} 
                                alt={track.title} 
                                className="w-8 h-8 rounded object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-zinc-400 truncate group-hover:text-zinc-200">{track.title}</div>
                                <div className="text-[10px] text-zinc-600 truncate group-hover:text-zinc-500">{track.artist}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
