import { Track } from '../types';

// Detect Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

export const apiService = {
  async getTracks(): Promise<Track[]> {
    if (isElectron) {
        return (window as any).electronAPI.getTracks();
    }
    const response = await fetch('/api/tracks');
    if (!response.ok) {
      throw new Error('Failed to fetch tracks');
    }
    return response.json();
  },

  async scanLibrary(path: string): Promise<{ count: number; message: string }> {
    if (isElectron) {
        // If path is empty, it means "rescan all"
        if (!path) {
             const result = await (window as any).electronAPI.scanLibrary();
             return { count: result.addedCount, message: "Scan complete" };
        }
        // Electron version of "add folder and scan"
        await (window as any).electronAPI.addLibraryFolder(path);
        return { count: 0, message: "Folder added, scanning..." };
    }
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan library');
    }
    return response.json();
  },

  async getLibraryFolders(): Promise<string[]> {
      if (isElectron) {
          return (window as any).electronAPI.getLibraryFolders();
      }
      const response = await fetch('/api/settings/folders');
      if (!response.ok) return [];
      return response.json();
  },

  async addLibraryFolder(path: string): Promise<string[]> {
      if (isElectron) {
          return (window as any).electronAPI.addLibraryFolder(path);
      }
      const response = await fetch('/api/settings/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
      });
      if (!response.ok) throw new Error('Failed to add folder');
      const data = await response.json();
      return data.folders;
  },

  async removeLibraryFolder(path: string): Promise<string[]> {
      if (isElectron) {
          return (window as any).electronAPI.removeLibraryFolder(path);
      }
      const response = await fetch('/api/settings/folders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
      });
      if (!response.ok) throw new Error('Failed to remove folder');
      const data = await response.json();
      return data.folders;
  },

  async updateTrack(id: string, updates: Partial<Track>): Promise<void> {
    if (isElectron) {
        return (window as any).electronAPI.updateTrack(id, updates);
    }
    const response = await fetch(`/api/tracks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update track on server');
    }
  },
  
  async openFolderDialog(): Promise<string | null> {
      if (isElectron) {
          return (window as any).electronAPI.openFolderDialog();
      }
      // Web fallback (cannot actually open system dialog)
      return null;
  },
  
  getAudioUrl(trackId: string): string {
      if (isElectron) {
          // Use custom protocol
          return `media://audio/${trackId}`;
      }
      return `/api/stream/${trackId}`;
  },
  
  getCoverUrl(trackId: string): string {
      if (isElectron) {
          return `media://cover/${trackId}`;
      }
      return `/api/cover/${trackId}`;
  }
};
