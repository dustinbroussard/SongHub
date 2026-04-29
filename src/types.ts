export interface SongMetadata {
  title: string;
  artist: string;
  key: string;
  tempo: string;
  genre: string;
}

export interface AudioFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blobPath?: string; // This will be the key in IndexedDB
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  lyrics: string;
  notes: string;
}

export interface Song {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata: SongMetadata;
  lyrics: string;
  notes: string;
  audioFiles: AudioFile[];
  history?: HistoryEntry[];
}
