import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  Save, 
  Play, 
  Pause, 
  Upload, 
  Trash2, 
  Download,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import type { Database } from '../types/database';

type Idea = Database['public']['Tables']['hub_new_ideas']['Row'];
type AudioVersion = Database['public']['Tables']['hub_new_idea_audio_versions']['Row'];

interface AudioFile extends AudioVersion {
  url?: string;
}

export function IdeaWorkspacePage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [idea, setIdea] = useState<Idea | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Edit states
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tempo, setTempo] = useState<string>('');
  const [key, setKey] = useState('');
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  
  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const isOwner = idea?.created_by === user?.id;
  const canEdit = isOwner;

  useEffect(() => {
    if (!ideaId || !user) return;

    const fetchIdea = async () => {
      // Fetch idea
      const { data: ideaData } = await supabase
        .from('hub_new_ideas')
        .select('*')
        .eq('id', ideaId)
        .single();

      if (!ideaData) {
        navigate('/dashboard');
        return;
      }

      setIdea(ideaData);
      setTitle(ideaData.title);
      setLyrics(ideaData.lyrics || '');
      setTempo(ideaData.tempo?.toString() || '');
      setKey(ideaData.key || '');
      setGenre(ideaData.genre || '');
      setArtist(ideaData.artist || '');
      setProjectNotes(ideaData.project_notes || '');

      // Fetch audio versions
      const { data: audioData } = await supabase
        .from('hub_new_idea_audio_versions')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (audioData) {
        // Get signed URLs for each audio file
        const filesWithUrls = await Promise.all(
          audioData.map(async (file) => {
            const { data: urlData } = await supabase
              .storage
              .from(file.storage_bucket)
              .createSignedUrl(file.storage_path, 3600);
            return { ...file, url: urlData?.signedUrl };
          })
        );
        setAudioFiles(filesWithUrls);
      }

      setLoading(false);
    };

    fetchIdea();
  }, [ideaId, user, navigate]);

  const saveIdea = async () => {
    if (!idea || !canEdit) return;

    setSaving(true);

    const { error } = await supabase
      .from('hub_new_ideas')
      .update({
        title,
        lyrics,
        tempo: tempo ? parseInt(tempo) : null,
        key,
        genre,
        artist,
        project_notes: projectNotes,
      })
      .eq('id', idea.id);

    if (!error) {
      setIdea({ ...idea, title, lyrics, tempo: tempo ? parseInt(tempo) : null, key, genre, artist, project_notes: projectNotes });
    }

    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !idea || !user) return;

    setUploading(true);

    try {
      // Upload to storage
      const filePath = `${idea.band_id}/${idea.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('songhub-audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create audio version record
      const { data: audioRecord, error: dbError } = await supabase
        .from('hub_new_idea_audio_versions')
        .insert({
          idea_id: idea.id,
          uploaded_by: user.id,
          display_name: file.name,
          original_file_name: file.name,
          storage_bucket: 'songhub-audio',
          storage_path: filePath,
          mime_type: file.type,
          byte_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Get signed URL
      const { data: urlData } = await supabase
        .storage
        .from('songhub-audio')
        .createSignedUrl(filePath, 3600);

      setAudioFiles(prev => [{ ...audioRecord, url: urlData?.signedUrl }, ...prev]);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteAudioFile = async (fileId: string) => {
    const file = audioFiles.find(f => f.id === fileId);
    if (!file || !canEdit) return;

    if (!confirm('Delete this audio file?')) return;

    // Delete from storage
    await supabase.storage.from(file.storage_bucket).remove([file.storage_path]);

    // Delete from database
    await supabase.from('hub_new_idea_audio_versions').delete().eq('id', fileId);

    setAudioFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const togglePlay = (file: AudioFile) => {
    if (playingId === file.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(file.url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(file.id);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/songhub/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent">Loading...</div>
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-bg-primary' : 'bg-gray-50'}`}>
      <audio ref={audioRef} className="hidden" />
      
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div>
              {canEdit ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`text-xl font-bold bg-transparent border-b ${darkMode ? 'text-white border-white/20 focus:border-primary-accent' : 'text-gray-900 border-gray-300 focus:border-primary-accent'} focus:outline-none`}
                />
              ) : (
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
              )}
              <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
                {isOwner ? 'You own this idea' : 'View only'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={saveIdea}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-accent text-black rounded-lg font-medium hover:bg-primary-accent/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={handleSignOut}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Metadata */}
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h2 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-xs uppercase tracking-wider mb-1 block ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>Artist</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} disabled:opacity-50`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs uppercase tracking-wider mb-1 block ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>Tempo</label>
                    <input
                      type="text"
                      value={tempo}
                      onChange={(e) => setTempo(e.target.value)}
                      disabled={!canEdit}
                      placeholder="BPM"
                      className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} disabled:opacity-50`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs uppercase tracking-wider mb-1 block ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>Key</label>
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g. C Major"
                      className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} disabled:opacity-50`}
                    />
                  </div>
                </div>
                
                <div>
                  <label className={`text-xs uppercase tracking-wider mb-1 block ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>Genre</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} disabled:opacity-50`}
                  />
                </div>
              </div>
            </div>

            {/* Audio Files */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Audio Versions</h2>
                {canEdit && (
                  <label className="cursor-pointer">
                    <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${uploading ? 'opacity-50' : ''} bg-primary-accent text-black hover:bg-primary-accent/90 transition-colors`}>
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Add'}
                    </div>
                  </label>
                )}
              </div>
              
              {audioFiles.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>No audio files yet</p>
              ) : (
                <div className="space-y-2">
                  {audioFiles.map(file => (
                    <div key={file.id} className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                      <button
                        onClick={() => togglePlay(file)}
                        className="p-2 rounded-full bg-primary-accent/20 text-primary-accent hover:bg-primary-accent/30 transition-colors"
                      >
                        {playingId === file.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{file.display_name}</p>
                        <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
                          {file.byte_size ? (file.byte_size / 1024 / 1024).toFixed(2) : '0'} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={file.url}
                          download
                          className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-200 text-gray-600'}`}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {canEdit && (
                          <button
                            onClick={() => deleteAudioFile(file.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Lyrics & Notes */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h2 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Lyrics</h2>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                disabled={!canEdit}
                placeholder={canEdit ? "Enter lyrics here..." : "No lyrics yet"}
                className={`w-full h-64 px-4 py-3 rounded-lg border resize-none ${darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} disabled:opacity-50`}
              />
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h2 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Project Notes</h2>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                disabled={!canEdit}
                placeholder={canEdit ? "Add notes, ideas, reminders..." : "No notes yet"}
                className={`w-full h-32 px-4 py-3 rounded-lg border resize-none ${darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'} disabled:opacity-50`}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
