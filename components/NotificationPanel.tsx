
import React from 'react';
import { X, CheckCircle, AlertCircle, RefreshCw, Bell, Trash2 } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onRetry: (trackId: string, notificationId: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
  onDismiss,
  onRetry
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-16 left-4 z-[80] w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl flex flex-col animate-fade-in overflow-hidden max-h-[60vh]">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-white">
          <Bell size={16} className="text-indigo-400" />
          <h2 className="font-bold text-xs uppercase tracking-wider">Notifications</h2>
        </div>
        <div className="flex items-center gap-1">
            {notifications.length > 0 && (
                <button 
                    onClick={onClearAll}
                    className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                    title="Clear All"
                >
                    <Trash2 size={14} />
                </button>
            )}
            <button 
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            >
            <X size={16} />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No new notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
                key={notif.id} 
                className={`relative p-3 rounded-lg border flex gap-3 ${
                    notif.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : notif.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-zinc-800/50 border-zinc-700/50'
                }`}
            >
                <div className="shrink-0 mt-0.5">
                    {notif.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
                    {notif.type === 'success' && <CheckCircle size={16} className="text-green-400" />}
                    {notif.type === 'info' && <Bell size={16} className="text-indigo-400" />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 font-medium leading-tight mb-1">{notif.message}</p>
                    <p className="text-[10px] text-zinc-500">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {notif.type === 'error' && notif.trackId && (
                        <button 
                            onClick={() => onRetry(notif.trackId!, notif.id)}
                            className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wide bg-indigo-500/10 px-2 py-1 rounded-md"
                        >
                            <RefreshCw size={10} /> Retry Fetch
                        </button>
                    )}
                </div>

                <button 
                    onClick={() => onDismiss(notif.id)}
                    className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-400"
                >
                    <X size={12} />
                </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
