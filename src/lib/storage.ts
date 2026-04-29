import { get, set, del, keys } from 'idb-keyval';
import { Song } from '../types';
import JSZip from 'jszip';

const SONGS_KEY = 'chord_songs';

export const storage = {
  // Songs Metadata & Text Content
  getSongs: async (): Promise<Song[]> => {
    let data;
    try {
      data = await get(SONGS_KEY);
    } catch(e) {}
    if (data) return data;
    const old = localStorage.getItem(SONGS_KEY);
    return old ? JSON.parse(old) : [];
  },

  saveSongs: async (songs: Song[]) => {
    await set(SONGS_KEY, songs);
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  },

  getSong: async (id: string): Promise<Song | undefined> => {
    return (await storage.getSongs()).find(s => s.id === id);
  },

  saveSong: async (song: Song) => {
    const songs = await storage.getSongs();
    const index = songs.findIndex(s => s.id === song.id);
    if (index !== -1) {
      songs[index] = { ...song, updatedAt: Date.now() };
    } else {
      songs.push(song);
    }
    await storage.saveSongs(songs);
  },

  deleteSong: async (id: string) => {
    const songs = await storage.getSongs();
    const song = songs.find(s => s.id === id);
    
    // Delete audio files from IDB
    if (song?.audioFiles) {
      for (const file of song.audioFiles) {
        await storage.deleteAudioBlob(file.id);
      }
    }

    const filtered = songs.filter(s => s.id !== id);
    await storage.saveSongs(filtered);
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

  exportSongZIP: async (song: Song, onProgress?: (msg: string) => void) => {
    const zip = new JSZip();
    const safeTitle = (song.metadata.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-');
    onProgress?.(`Starting export for "${safeTitle}"...`);

    zip.file('metadata.json', JSON.stringify(song, null, 2));

    let metadataTxt = `Title: ${song.metadata.title || 'Untitled'}\n`;
    if (song.metadata.artist) metadataTxt += `Artist: ${song.metadata.artist}\n`;
    if (song.metadata.tempo) metadataTxt += `Tempo: ${song.metadata.tempo} BPM\n`;
    if (song.metadata.key) metadataTxt += `Key: ${song.metadata.key}\n`;
    if (song.metadata.genre) metadataTxt += `Genre: ${song.metadata.genre}\n`;
    zip.file('metadata.txt', metadataTxt);

    if (song.lyrics) {
      zip.file(`${safeTitle}.txt`, song.lyrics);
    }

    if (song.audioFiles && song.audioFiles.length > 0) {
      const audioFolder = zip.folder('audio');
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

    onProgress?.('Generating ZIP file...');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_songhub_export.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onProgress?.('Export complete!');
  },

  exportFullLibrary: async (onProgress?: (msg: string) => void) => {
    const zip = new JSZip();
    const songs = await storage.getSongs();
    
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
