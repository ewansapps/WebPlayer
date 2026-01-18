import { Track } from '../types';

export const fetchLyrics = async (track: Track): Promise<string | null> => {
  if (!track || !track.title || !track.artist) {
    console.warn("Invalid track data for lyrics fetch");
    return null;
  }

  try {
    const url = new URL('https://lrclib.net/api/search');
    
    // Add parameters
    url.searchParams.append('track_name', track.title);
    url.searchParams.append('artist_name', track.artist);
    // REMOVED: album_name constraint.
    // We rely on the duration matching logic below to pick the right version (Album vs Live vs Radio Edit).
    // Including album_name often leads to 0 results due to metadata mismatches (e.g. "Deluxe Edition").

    // Helper to fetch
    const doFetch = async (fetchUrl: URL) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(fetchUrl.toString(), { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`LRCLIB API Error: ${response.status}`);
            return await response.json(); // Returns array for search
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    };

    const results = await doFetch(url);
    
    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }

    // Filter and Sort Strategy
    // 1. Prefer results with synced lyrics
    // 2. Prefer results closest to duration (if track duration is known)
    
    const targetDuration = track.duration || 0;
    
    const bestMatch = results.sort((a, b) => {
        const aHasSynced = !!a.syncedLyrics;
        const bHasSynced = !!b.syncedLyrics;

        // Priority 1: Synced Lyrics
        if (aHasSynced && !bHasSynced) return -1;
        if (!aHasSynced && bHasSynced) return 1;

        // Priority 2: Duration Match (if target duration exists)
        if (targetDuration > 0) {
            const aDiff = Math.abs((a.duration || 0) - targetDuration);
            const bDiff = Math.abs((b.duration || 0) - targetDuration);
            return aDiff - bDiff;
        }

        return 0;
    })[0];

    return bestMatch.syncedLyrics || bestMatch.plainLyrics || null;

  } catch (error) {
    console.warn("Error fetching lyrics:", error);
    return null;
  }
};