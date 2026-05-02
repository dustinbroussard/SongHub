import JSZip from 'jszip';
import { supabase } from './supabase';

export const exportSongAsJSON = (song: any) => {
  const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${song.title || song.work_title || 'untitled'}_export.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportText = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportIdeaZIP = async (idea: any, audioFiles: any[], onProgress?: (msg: string) => void) => {
  const zip = new JSZip();
  const safeTitle = (idea.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-');
  onProgress?.(`Starting export for "${safeTitle}"...`);

  zip.file('metadata.json', JSON.stringify(idea, null, 2));

  let metadataTxt = `Title: ${idea.title || 'Untitled'}\n`;
  if (idea.artist) metadataTxt += `Artist: ${idea.artist}\n`;
  if (idea.tempo) metadataTxt += `Tempo: ${idea.tempo} BPM\n`;
  if (idea.key) metadataTxt += `Key: ${idea.key}\n`;
  if (idea.genre) metadataTxt += `Genre: ${idea.genre}\n`;
  zip.file('metadata.txt', metadataTxt);

  if (idea.lyrics) {
    zip.file(`${safeTitle}_lyrics.txt`, idea.lyrics);
  }

  if (audioFiles && audioFiles.length > 0) {
    const audioFolder = zip.folder('audio');
    if (audioFolder) {
      for (const audioFile of audioFiles) {
        if (!audioFile.url) continue;
        onProgress?.(`Fetching audio: ${audioFile.display_name || audioFile.name}`);
        try {
          const response = await fetch(audioFile.url);
          const blob = await response.blob();
          audioFolder.file(audioFile.display_name || audioFile.name, blob);
        } catch (e) {
          console.error('Failed to fetch audio for zip:', e);
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
};

export const exportBandLibraryZIP = async (bandId: string, bandName: string, onProgress?: (msg: string) => void) => {
  const zip = new JSZip();
  onProgress?.('Fetching band data...');

  // Fetch all ideas
  const { data: ideas } = await supabase
    .from('hub_new_ideas')
    .select('*')
    .eq('band_id', bandId);

  if (!ideas || ideas.length === 0) {
    onProgress?.('No ideas to export.');
    return;
  }

  for (const idea of ideas) {
    const safeTitle = (idea.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-');
    const ideaFolder = zip.folder(safeTitle);
    if (!ideaFolder) continue;

    onProgress?.(`Adding "${safeTitle}"...`);
    ideaFolder.file('metadata.json', JSON.stringify(idea, null, 2));
    if (idea.lyrics) ideaFolder.file('lyrics.txt', idea.lyrics);

    // Fetch audio versions for this idea
    const { data: audioFiles } = await supabase
      .from('hub_new_idea_audio_versions')
      .select('*')
      .eq('idea_id', idea.id);

    if (audioFiles && audioFiles.length > 0) {
      const audioFolder = ideaFolder.folder('audio');
      if (audioFolder) {
        for (const file of audioFiles) {
          try {
            const { data: urlData } = await supabase.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 3600);
            if (urlData?.signedUrl) {
              const response = await fetch(urlData.signedUrl);
              const blob = await response.blob();
              audioFolder.file(file.display_name || 'recording.mp3', blob);
            }
          } catch (e) {}
        }
      }
    }
  }

  onProgress?.('Generating full library ZIP...');
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bandName.replace(/\s+/g, '_')}_full_export.zip`;
  a.click();
  URL.revokeObjectURL(url);
  onProgress?.('Export complete!');
};
