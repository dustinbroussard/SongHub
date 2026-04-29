import { get, set, del, keys } from 'idb-keyval';
import { Song } from '../types';
import JSZip from 'jszip';

const SONGS_KEY = 'chord_songs';

export const storage = {
  // Songs Metadata & Text Content
  getSongs: (): Song[] => {
    const data = localStorage.getItem(SONGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSongs: (songs: Song[]) => {
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  },

  getSong: (id: string): Song | undefined => {
    return storage.getSongs().find(s => s.id === id);
  },

  saveSong: (song: Song) => {
    const songs = storage.getSongs();
    const index = songs.findIndex(s => s.id === song.id);
    if (index !== -1) {
      songs[index] = { ...song, updatedAt: Date.now() };
    } else {
      songs.push(song);
    }
    storage.saveSongs(songs);
  },

  deleteSong: async (id: string) => {
    const songs = storage.getSongs();
    const song = songs.find(s => s.id === id);
    
    // Delete audio files from IDB
    if (song?.audioFiles) {
      for (const file of song.audioFiles) {
        await storage.deleteAudioBlob(file.id);
      }
    }

    const filtered = songs.filter(s => s.id !== id);
    storage.saveSongs(filtered);
  },

  // Audio Blobs (IndexedDB)
  saveAudioBlob: async (id: string, blob: Blob) => {
    await set(`audio_${id}`, blob);
  },

  getAudioBlob: async (id: string): Promise<Blob | undefined> => {
    return await get(`audio_${id}`);
  },

  deleteAudioBlob: async (id: string) => {
    await del(`audio_${id}`);
  },

  // Export
  exportSongAsJSON: (song: Song) => {
    const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.metadata.title || 'untitled'}_chord_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportText: (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportFullLibrary: async (onProgress?: (msg: string) => void) => {
    const zip = new JSZip();
    const songs = storage.getSongs();
    
    if (songs.length === 0) {
      onProgress?.('No songs to export.');
      return;
    }

    onProgress?.('Initializing ZIP...');

    for (const song of songs) {
      const safeTitle = (song.metadata.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-');
      const songFolder = zip.folder(safeTitle);
      
      if (!songFolder) continue;

      onProgress?.(`Adding "${safeTitle}" metadata...`);
      
      // Add metadata/lyrics as JSON
      songFolder.file('metadata.json', JSON.stringify(song, null, 2));
      
      // Add lyrics as text file for easy reading
      if (song.lyrics) {
        songFolder.file('lyrics.txt', song.lyrics);
      }

      // Add audio files
      if (song.audioFiles && song.audioFiles.length > 0) {
        const audioFolder = songFolder.folder('audio');
        if (audioFolder) {
          for (const audioFile of song.audioFiles) {
            onProgress?.(`Fetching audio: ${audioFile.name}`);
            const blob = await storage.getAudioBlob(audioFile.id);
            if (blob) {
              audioFolder.file(audioFile.name, blob);
            }
          }
        }
      }
    }

    onProgress?.('Generating ZIP file...');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chord_full_backup_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onProgress?.('Export complete!');
  }
};
