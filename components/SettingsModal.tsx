import React, { useState, useEffect } from 'react';
import { FolderOpen, X, Plus, Trash2, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const [path, setPath] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Load folders when modal opens
  useEffect(() => {
    if (isOpen) {
        setLoadingFolders(true);
        apiService.getLibraryFolders()
            .then(setFolders)
            .catch(console.error)
            .finally(() => setLoadingFolders(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddFolder = async () => {
    if (!path.trim()) {
        setError("Path is required");
        return;
    }
    
    setScanning(true);
    setError(null);
    setMessage(null);

    try {
      const updatedFolders = await apiService.addLibraryFolder(path);
      setFolders(updatedFolders);
      setPath('');
      setMessage("Folder added and library scanning started...");
      // We trigger complete callback so App can reload tracks after a short delay or immediately
      // Since scan is async on server, tracks might appear gradually. 
      // Ideally App polls or we just wait a bit.
      setTimeout(onScanComplete, 1000); 
    } catch (err: any) {
      setError(err.message || "Failed to add folder");
    } finally {
      setScanning(false);
    }
  };

  const handleRemoveFolder = async (folderPath: string) => {
      try {
          const updatedFolders = await apiService.removeLibraryFolder(folderPath);
          setFolders(updatedFolders);
          setMessage("Folder removed. Library cleanup started...");
          setTimeout(onScanComplete, 1000);
      } catch (err: any) {
          setError("Failed to remove folder");
      }
  };
  
  const handleRescan = async () => {
      setScanning(true);
      setMessage(null);
      try {
          await apiService.scanLibrary(""); // Empty path triggers rescan of existing folders
          setMessage("Library rescan complete");
          onScanComplete();
      } catch (err) {
          setError("Rescan failed");
      } finally {
          setScanning(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen size={24} className="text-indigo-500" />
            Library Settings
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* List of current folders */}
          <div>
              <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-zinc-400 uppercase">Managed Folders</h3>
                  <button 
                    onClick={handleRescan}
                    disabled={scanning}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                      <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                      Rescan All
                  </button>
              </div>
              
              <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-40 overflow-y-auto custom-scrollbar">
                  {loadingFolders ? (
                      <div className="p-3 text-center text-zinc-500 text-xs">Loading...</div>
                  ) : folders.length === 0 ? (
                      <div className="p-3 text-center text-zinc-500 text-xs italic">No folders added yet.</div>
                  ) : (
                      folders.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-3 group">
                              <span className="text-sm text-zinc-300 truncate" title={f}>{f}</span>
                              <button 
                                onClick={() => handleRemoveFolder(f)}
                                className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove folder"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Add new folder */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">
              Add New Music Folder
            </label>
            <div className="flex gap-2">
                <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/home/user/Music"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600 text-sm"
                />
                <button
                  onClick={async () => {
                      const folder = await apiService.openFolderDialog();
                      if (folder) {
                          setPath(folder);
                          // Auto-add the folder
                          if (!folders.includes(folder)) {
                              setScanning(true);
                              setError(null);
                              setMessage(null);
                              try {
                                const updatedFolders = await apiService.addLibraryFolder(folder);
                                setFolders(updatedFolders);
                                setPath('');
                                setMessage("Folder added and library scanning started...");
                                setTimeout(onScanComplete, 1000); 
                              } catch (err: any) {
                                setError(err.message || "Failed to add folder");
                              } finally {
                                setScanning(false);
                              }
                          }
                      }
                  }}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  title="Browse"
                >
                    <FolderOpen size={20} />
                </button>
                <button
                onClick={handleAddFolder}
                disabled={scanning}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                title="Add Folder"
                >
                    <Plus size={20} />
                </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Enter absolute path or browse. New tracks will be auto-scanned.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
              {message}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};