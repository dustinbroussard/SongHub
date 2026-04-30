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
  FileAudio,
  Send,
  MessageSquare,
  Mic,
  Sun,
  Moon,
  MoreVertical,
  LogOut,
  Users,
  Plus,
  Share2,
  Bell,
  Check
} from 'lucide-react';
import type { Database } from '../types/database';

type Song = Database['public']['Tables']['songs']['Row'];
type BandMember = Database['public']['Tables']['band_members']['Row'];
type SongFeedback = Database['public']['Tables']['song_feedback']['Row'];

interface AudioFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
  storage_path: string;
  url?: string;
}

export function SongWorkspacePage() {
  const { songId } = useParams<{ songId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [song, setSong] = useState<Song | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [feedback, setFeedback] = useState<SongFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit states
  const [workTitle, setWorkTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [notes, setNotes] = useState('');
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    key: '',
    tempo: '',
    genre: '',
  });
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  
  // Notifications
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const isOwner = song?.created_by === user?.id;
  const canEdit = isOwner;

  useEffect(() => {
    if (!songId || !user) return;

    const fetchSong = async () => {
      // Fetch song
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single();

      if (!songData) {
        navigate('/dashboard');
        return;
      }

      setSong(songData);
      setWorkTitle(songData.work_title);
      setLyrics(songData.lyrics || '');
      setNotes(songData.notes || '');
      setMetadata({
        title: songData.metadata?.title || '',
        artist: songData.metadata?.artist || '',
        key: songData.metadata?.key || '',
        tempo: songData.metadata?.tempo || '',
        genre: songData.metadata?.genre || '',
      });
      setAudioFiles(songData.audio_files || []);

      // Fetch band members
      const { data: membersData } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', songData.band_id);

      if (membersData) {
        setMembers(membersData);
      }

      // Fetch feedback
      const { data: feedbackData } = await supabase
        .from('song_feedback')
        .select('*')
        .eq('song_id', songId)
        .order('created_at', { ascending: false });

      if (feedbackData) {
        setFeedback(feedbackData);
      }

      // Get audio file URLs
      if (songData.audio_files && songData.audio_files.length > 0) {
        const filesWithUrls = await Promise.all(
          songData.audio_files.map(async (file: AudioFile) => {
            const { data: urlData } = await supabase
              .storage
              .from('audio-files')
              .createSignedUrl(file.storage_path, 3600);
            return { ...file, url: urlData?.signedUrl };
          })
        );
        setAudioFiles(filesWithUrls);
      }

      setLoading(false);
    };

    fetchSong();
  }, [songId, user, navigate]);

  const saveSong = async () => {
    if (!song || !user) return;

    setSaving(true);
    
    const { error } = await supabase
      .from('songs')
      .update({
        work_title: workTitle,
        lyrics,
        notes,
        metadata,
        audio_files: audioFiles.map(({ url, ...rest }) => rest),
        updated_by: user.id,
      })
      .eq('id', song.id);

    if (!error) {
      setSong(prev => prev ? { ...prev, updated_at: new Date().toISOString() } : null);
    }

    setSaving(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !song || !user) return;

    const file = e.target.files[0];
    const fileId = crypto.randomUUID();
    const storagePath = `${song.band_id}/${song.id}/${fileId}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('audio-files')
      .upload(storagePath, file);

    if (uploadError) {
      alert('Failed to upload audio file');
      return;
    }

    // Add to song's audio_files
    const newAudioFile: AudioFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      storage_path: storagePath,
    };

    const updatedFiles = [...audioFiles, newAudioFile];
    setAudioFiles(updatedFiles);

    // Save to database
    await supabase
      .from('songs')
      .update({
        audio_files: updatedFiles.map(({ url, ...rest }) => rest),
        updated_by: user.id,
      })
      .eq('id', song.id);

    // Get signed URL
    const { data: urlData } = await supabase
      .storage
      .from('audio-files')
      .createSignedUrl(storagePath, 3600);

    if (urlData) {
      setAudioFiles(prev => prev.map(f => f.id === fileId ? { ...f, url: urlData.signedUrl } : f));
    }
  };

  const deleteAudioFile = async (fileId: string) => {
    if (!song || !canEdit) return;

    const file = audioFiles.find(f => f.id === fileId);
    if (!file) return;

    // Delete from storage
    await supabase.storage.from('audio-files').remove([file.storage_path]);

    // Update song
    const updatedFiles = audioFiles.filter(f => f.id !== fileId);
    setAudioFiles(updatedFiles);

    await supabase
      .from('songs')
      .update({
        audio_files: updatedFiles.map(({ url, ...rest }) => rest),
        updated_by: user!.id,
      })
      .eq('id', song.id);
  };

  const playAudio = (file: AudioFile) => {
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

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.trim() || !song || !user || isOwner) return;

    setSubmittingFeedback(true);

    const { data, error } = await supabase
      .from('song_feedback')
      .insert({
        song_id: song.id,
        band_id: song.band_id,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        feedback: newFeedback.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setFeedback(prev => [data, ...prev]);
      setNewFeedback('');
    }

    setSubmittingFeedback(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/songhub/onboarding');
  };

  const notifyBandMembers = async () => {
    if (!song || !user || !isOwner) return;

    setNotifying(true);

    // Get all band members except the owner
    const otherMembers = members.filter(m => m.user_id !== user.id);

    if (otherMembers.length === 0) {
      setNotifying(false);
      setNotified(true);
      setTimeout(() => setNotified(false), 2000);
      return;
    }

    // Create notifications for each member
    const notifications = otherMembers.map(member => ({
      user_id: member.user_id,
      band_id: song.band_id,
      song_id: song.id,
      type: 'song_created' as const,
      message: `"${workTitle}" has been shared with you`,
      from_user_id: user.id,
      from_user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (!error) {
      setNotified(true);
      setTimeout(() => setNotified(false), 2000);
    }

    setNotifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent">Loading...</div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-bg-primary' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'} sticky top-0 z-10 backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  className={`text-lg font-semibold bg-transparent border-none focus:outline-none ${darkMode ? 'text-white' : 'text-gray-900'}`}
                  placeholder="Work Title"
                />
              ) : (
                <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {workTitle}
                </h1>
              )}
              <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
                {isOwner ? 'You own this song' : 'View only - owned by ' + members.find(m => m.user_id === song.created_by)?.user_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={saveSong}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-accent text-black rounded-lg font-medium hover:bg-primary-accent/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={notifyBandMembers}
                  disabled={notifying || notified}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    notified 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : darkMode 
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                  title="Notify band members about this song"
                >
                  {notified ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {notified ? 'Notified' : notifying ? 'Notifying...' : 'Share'}
                </button>
              </>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative group">
              <button className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}>
                <MoreVertical className="w-5 h-5" />
              </button>
              
              <div className={`absolute right-0 top-full mt-2 w-48 ${darkMode ? 'bg-bg-secondary border-white/10' : 'bg-white border-gray-200'} border rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all`}>
                <button
                  onClick={handleSignOut}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'} transition-colors`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Lyrics & Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-xs font-medium uppercase tracking-wider mb-3 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                Song Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {['title', 'artist', 'key', 'tempo', 'genre'].map((field) => (
                  <div key={field}>
                    <label className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-500'} capitalize`}>
                      {field}
                    </label>
                    {canEdit ? (
                      <input
                        type="text"
                        value={metadata[field as keyof typeof metadata]}
                        onChange={(e) => setMetadata(prev => ({ ...prev, [field]: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        placeholder={`Enter ${field}`}
                      />
                    ) : (
                      <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                        {metadata[field as keyof typeof metadata] || <span className="italic opacity-50">Not set</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lyrics */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-xs font-medium uppercase tracking-wider mb-3 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                Lyrics
              </h3>
              {canEdit ? (
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  className={`w-full h-96 px-4 py-3 rounded-lg border resize-none font-mono text-sm leading-relaxed ${darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                  placeholder="Write your lyrics here..."
                />
              ) : (
                <div className={`whitespace-pre-wrap font-mono text-sm leading-relaxed min-h-[200px] ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                  {lyrics || <span className="italic opacity-50">No lyrics yet</span>}
                </div>
              )}
            </div>

            {/* Project Notes (Owner only) */}
            {canEdit && (
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-3 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  Project Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full h-32 px-4 py-3 rounded-lg border resize-none text-sm ${darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                  placeholder="Private notes about this song..."
                />
              </div>
            )}
          </div>

          {/* Right Column - Audio & Feedback */}
          <div className="space-y-6">
            {/* Audio Files */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  Audio Files ({audioFiles.length})
                </h3>
                {canEdit && (
                  <label className="flex items-center gap-1 px-3 py-1.5 bg-primary-accent text-black rounded-lg text-xs font-medium cursor-pointer hover:bg-primary-accent/90 transition-colors">
                    <Upload className="w-3 h-3" />
                    Upload
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                {audioFiles.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                    No audio files yet
                  </p>
                ) : (
                  audioFiles.map((file) => {
                    const uploader = members.find(m => m.user_id === file.uploaded_by);
                    const isUploader = file.uploaded_by === user?.id;
                    
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-black/30' : 'bg-gray-50'}`}
                      >
                        <button
                          onClick={() => playAudio(file)}
                          className={`p-2 rounded-lg ${playingId === file.id ? 'bg-primary-accent text-black' : darkMode ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'}`}
                        >
                          {playingId === file.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {file.name}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
                            {uploader?.user_name || 'Unknown'} • {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>

                        {canEdit && isUploader && (
                          <button
                            onClick={() => deleteAudioFile(file.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Feedback & Suggestions (Non-owners only) */}
            {!isOwner && (
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-4 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  Feedback & Suggestions
                </h3>

                {/* Submit Feedback */}
                <form onSubmit={submitFeedback} className="mb-4">
                  <textarea
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    className={`w-full h-24 px-3 py-2 rounded-lg border resize-none text-sm mb-2 ${darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/20' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                    placeholder="Share your thoughts on this song..."
                  />
                  <button
                    type="submit"
                    disabled={!newFeedback.trim() || submittingFeedback}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-accent text-black rounded-lg text-sm font-medium hover:bg-primary-accent/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submittingFeedback ? 'Sending...' : 'Send Feedback'}
                  </button>
                </form>

                {/* Feedback List */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {feedback.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                      No feedback yet
                    </p>
                  ) : (
                    feedback.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg ${darkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${darkMode ? 'text-primary-accent' : 'text-green-600'}`}>
                            {item.user_name}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                          {item.feedback}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Owner sees feedback received */}
            {isOwner && feedback.length > 0 && (
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-xs font-medium uppercase tracking-wider mb-4 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  Feedback Received ({feedback.length})
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {feedback.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg ${darkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${darkMode ? 'text-primary-accent' : 'text-green-600'}`}>
                          {item.user_name}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                        {item.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Band Members */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-xs font-medium uppercase tracking-wider mb-4 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                Band Members
              </h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <img
                      src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.user_name || 'U'}&background=00ff00&color=000&size=32`}
                      alt={member.user_name || 'Member'}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {member.user_name || member.user_email}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      member.role === 'admin' 
                        ? 'bg-primary-accent/20 text-primary-accent' 
                        : darkMode ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
