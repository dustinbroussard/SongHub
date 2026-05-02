import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Save, FileText, Music, Info, Share2, Send, Check, Plus, Download, FileJson, FileArchive, MessageSquare } from 'lucide-react';
import { Button, IconButton, ConfirmModal, Input, AudioPlayer, LyricsEditor } from '../components/ui';
import { exportIdeaZIP, exportSongAsJSON } from '../lib/export';
import { notifyBandMembers } from '../lib/notifications';
import { cn } from '../lib/utils';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [song, setSong] = useState<Song | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [feedback, setFeedback] = useState<SongFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [saveStatus, setSaveStatus] = useState('READY');
  const [mobileTab, setMobileTab] = useState<'lyrics' | 'details' | 'audio'>('lyrics');
  
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
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  
  const [uploadingFiles, setUploadingFiles] = useState<{name: string, progress: number}[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const isOwner = song?.created_by === user?.id;
  const canEdit = isOwner;

  useEffect(() => {
    if (!songId || !user) return;

    const fetchSong = async () => {
      const { data: songData } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single() as { data: Song | null; error: any };

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
      setFeedbackNotes((songData as any).feedback_notes || '');
      
      const { data: membersData } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', songData.band_id) as { data: BandMember[] | null; error: any };
      if (membersData) setMembers(membersData);

      const { data: feedbackData } = await supabase
        .from('song_feedback')
        .select('*')
        .eq('song_id', songId)
        .order('created_at', { ascending: false });
      if (feedbackData) setFeedback(feedbackData);

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
      } else {
        setAudioFiles([]);
      }

      setLoading(false);
    };

    fetchSong();
    document.documentElement.classList.remove('light-mode');
  }, [songId, user, navigate]);

  const saveSong = async () => {
    if (!song || !user) return;
    setSaving(true);
    setSaveStatus('SAVING...');
    
    const payload: any = {
      feedback_notes: feedbackNotes,
      updated_by: user.id,
    };

    if (canEdit) {
      payload.work_title = workTitle;
      payload.lyrics = lyrics;
      payload.notes = notes;
      payload.metadata = metadata;
      payload.audio_files = audioFiles.map(({ url, ...rest }) => rest);
    }

    const { error } = await supabase.from('songs').update(payload).eq('id', song.id);

    if (!error) {
      setSong(prev => prev ? { ...prev, ...payload, updated_at: new Date().toISOString() } : null);
      setSaveStatus('SAVED');

      // Notify others/creator
      await notifyBandMembers({
        bandId: song.band_id,
        songId: song.id,
        type: 'edit',
        message: `${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member'} updated "${workTitle}"`,
        fromUserId: user.id,
        fromUserName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member',
        excludeSelf: true,
      });

      setTimeout(() => setSaveStatus('READY'), 2000);
    } else {
      setSaveStatus('ERROR');
    }
    setSaving(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !song || !user) return;
    const files = Array.from(e.target.files) as File[];

    for (const file of files) {
      const fileId = crypto.randomUUID();
      const storagePath = `${song.band_id}/${song.id}/${fileId}`;
      setUploadingFiles(prev => [...prev, { name: file.name, progress: 10 }]);

      const { error: uploadError } = await supabase.storage.from('audio-files').upload(storagePath, file);
      if (uploadError) {
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
        continue;
      }
      setUploadingFiles(prev => prev.map(f => f.name === file.name ? { ...f, progress: 60 } : f));

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
      await (supabase.from('songs') as any).update({
          audio_files: updatedFiles.map(({ url, ...rest }) => rest),
          updated_by: user.id,
        }).eq('id', song.id);

      const { data: urlData } = await supabase.storage.from('audio-files').createSignedUrl(storagePath, 3600);
      setAudioFiles([...audioFiles, { ...newAudioFile, url: urlData?.signedUrl }]);
      
      // Notify others
      await notifyBandMembers({
        bandId: song.band_id,
        songId: song.id,
        type: 'upload',
        message: `${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member'} uploaded a new recording to "${workTitle}"`,
        fromUserId: user.id,
        fromUserName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member',
        excludeSelf: true,
      });

      setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
    }
  };

  const deleteAudioFile = async (fileId: string) => {
    if (!song || !canEdit) return;
    const file = audioFiles.find(f => f.id === fileId);
    if (!file) return;

    await supabase.storage.from('audio-files').remove([file.storage_path]);
    const updatedFiles = audioFiles.filter(f => f.id !== fileId);
    setAudioFiles(updatedFiles);

    await (supabase.from('songs') as any).update({
        audio_files: updatedFiles.map(({ url, ...rest }) => rest),
        updated_by: user!.id,
      }).eq('id', song.id);
  };

  const renameAudioFile = async (id: string, newName: string) => {
    if (!song || !canEdit) return;
    const updatedFiles = audioFiles.map(f => f.id === id ? { ...f, name: newName } : f);
    setAudioFiles(updatedFiles);
    await (supabase.from('songs') as any).update({
      audio_files: updatedFiles.map(({ url, ...rest }) => rest),
      updated_by: user!.id,
    }).eq('id', song.id);
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
      } as any)
      .select()
      .single() as { data: SongFeedback | null; error: any };

    if (!error && data) {
      setFeedback(prev => [data, ...prev]);
      setNewFeedback('');
    }
    setSubmittingFeedback(false);
  };

  const notifyBandMembers = async () => {
    if (!song || !user || !isOwner) return;
    setNotifying(true);
    const otherMembers = members.filter(m => m.user_id !== user.id);
    if (otherMembers.length === 0) {
      setNotifying(false);
      setNotified(true);
      setTimeout(() => setNotified(false), 2000);
      return;
    }

    const notifications = otherMembers.map(member => ({
      user_id: member.user_id,
      band_id: song.band_id,
      song_id: song.id,
      type: 'song_created' as const,
      message: `"${workTitle}" has been shared with you`,
      from_user_id: user.id,
      from_user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    if (!error) {
      setNotified(true);
      setTimeout(() => setNotified(false), 2000);
    }
    setNotifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent text-[10px] uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-white selection:bg-primary-accent selection:text-black overflow-hidden tracking-tight">
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 lg:h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-bg-secondary shrink-0 z-20">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="truncate">
              {canEdit ? (
                <input
                  type="text"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  className="bg-transparent border-none text-sm lg:text-lg font-bold tracking-tight text-white/90 truncate focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-sm lg:text-lg font-bold tracking-tight text-white/90 truncate">
                  {workTitle || "Untitled Song"}
                </h2>
              )}
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1 h-1 rounded-full", saveStatus === 'SAVING...' ? "bg-yellow-500 animate-pulse" : saveStatus === 'ERROR' ? "bg-red-500" : "bg-primary-accent")}></div>
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black">{saveStatus}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="relative">
              <IconButton 
                icon={Download} 
                onClick={() => setShowExportOptions(!showExportOptions)} 
                title="Export" 
              />
              {showExportOptions && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-1">
                    <button
                      onClick={async () => {
                        if (!song) return;
                        setExporting(true);
                        setShowExportOptions(false);
                        // Song schema is slightly different but exportIdeaZIP is generic enough
                        await exportIdeaZIP({ ...song, title: song.work_title }, audioFiles);
                        setExporting(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold tracking-tight text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <FileArchive size={14} className="text-primary-accent" />
                      Full Project (ZIP)
                    </button>
                    <button
                      onClick={() => {
                        if (!song) return;
                        exportSongAsJSON(song);
                        setShowExportOptions(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold tracking-tight text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <FileJson size={14} className="text-blue-400" />
                      Metadata (JSON)
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={Save} onClick={saveSong} className="hidden lg:flex" disabled={saving}>Save</Button>
              <IconButton icon={Save} onClick={saveSong} className="lg:hidden" title="Save" />
              {canEdit && (
                <Button variant="primary" icon={notified ? Check : Share2} onClick={notifyBandMembers} disabled={notifying || notified}>
                  {notified ? 'Notified' : notifying ? 'Notifying...' : 'Share'}
                </Button>
              )}
            </div>
          </div>
        </header>

        {exporting && (
          <div className="bg-primary-accent/10 border-b border-primary-accent/20 py-2 px-6 animate-pulse shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-accent text-center">
              Generating export bundle...
            </p>
          </div>
        )}
        
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-px bg-border overflow-hidden relative">
          
          <div className={cn("flex-1 overflow-hidden lg:hidden", mobileTab === 'lyrics' ? 'block' : 'hidden')}>
            <LyricsEditor lyrics={lyrics} onChange={setLyrics} disabled={!canEdit} />
          </div>
          
          <div className={cn("flex-1 overflow-y-auto lg:hidden bg-bg-primary", (mobileTab === 'details' || mobileTab === 'audio') ? 'block' : 'hidden')}>
            <div className="p-6 space-y-8 min-h-full">
              {mobileTab === 'details' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <span className="text-accent-label block mb-6">Workspace Details</span>
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Title" value={metadata.title} onChange={(v) => setMetadata({...metadata, title: v})} disabled={!canEdit} />
                        <Input label="Artist" value={metadata.artist} onChange={(v) => setMetadata({...metadata, artist: v})} disabled={!canEdit} />
                        <Input label="Tempo" value={metadata.tempo} onChange={(v) => setMetadata({...metadata, tempo: v})} disabled={!canEdit} />
                        <Input label="Key" value={metadata.key} onChange={(v) => setMetadata({...metadata, key: v})} disabled={!canEdit} />
                      </div>
                      <Input label="Genre" value={metadata.genre} onChange={(v) => setMetadata({...metadata, genre: v})} disabled={!canEdit} />
                      {canEdit && (
                        <div className="pt-4 border-t border-white/5">
                          <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 block">Project Notes (Creator Only)</label>
                          <textarea 
                             className="w-full h-32 bg-bg-tertiary border border-white/5 rounded-xl p-3 text-xs text-white/50 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 resize-none font-mono transition-all duration-300 ease-in-out shadow-inner disabled:opacity-50"
                             value={notes}
                             onChange={(e) => setNotes(e.target.value)}
                             disabled={!canEdit}
                           />
                       </div>
                       <div className="pt-4 border-t border-white/5">
                          <label className="text-[8px] uppercase tracking-[0.2em] font-black text-primary-accent mb-2 flex items-center gap-2">
                            <MessageSquare size={10} />
                            Feedback & Suggestions (Editable for all members)
                          </label>
                          <textarea 
                             className="w-full h-48 bg-bg-tertiary border border-primary-accent/20 rounded-xl p-3 text-xs text-white/90 outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50 resize-none font-mono transition-all duration-300 ease-in-out shadow-[0_0_15px_rgba(0,255,0,0.05)] placeholder:text-white/10"
                             placeholder="Add your thoughts, arrangement ideas, or feedback here..."
                             value={feedbackNotes}
                             onChange={(e) => setFeedbackNotes(e.target.value)}
                           />
                       </div>
                      )}
                      
                      {!isOwner && (
                        <div className="pt-4 border-t border-white/5">
                           <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 block">Leave Feedback</label>
                           <form onSubmit={submitFeedback} className="flex flex-col gap-2">
                             <textarea 
                                className="w-full h-24 bg-bg-tertiary border border-white/5 rounded-xl p-3 text-xs text-white/70 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 resize-none font-mono transition-all duration-300 ease-in-out shadow-inner disabled:opacity-50"
                                value={newFeedback}
                                onChange={(e) => setNewFeedback(e.target.value)}
                              />
                              <Button variant="primary" onClick={submitFeedback} disabled={!newFeedback.trim() || submittingFeedback} icon={Send}>Send Feedback</Button>
                           </form>
                        </div>
                      )}

                      {feedback.length > 0 && (
                        <div className="pt-4 border-t border-white/5">
                          <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 block">Feedback</label>
                          <div className="space-y-3">
                            {feedback.map(item => (
                              <div key={item.id} className="p-3 bg-bg-tertiary rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-primary-accent">{item.user_name}</span>
                                  <span className="text-[8px] text-white/30">{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-white/70">{item.feedback}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              )}
              {mobileTab === 'audio' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <span className="text-accent-label block mb-6">Audio Attachments</span>
                   {canEdit && (
                     <label className="block bg-bg-tertiary border border-dashed border-white/10 p-6 text-center rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-bg-quaternary hover:shadow-md hover:border-white/20">
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                        <Plus size={24} className="mx-auto text-primary-accent mb-2" />
                        <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">Upload Recordings</p>
                     </label>
                   )}
                   
                   {uploadingFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                         {uploadingFiles.map(f => (
                           <div key={f.name} className="bg-bg-tertiary p-2 rounded border border-primary-accent/10">
                             <div className="flex justify-between text-[8px] uppercase font-black tracking-widest mb-1 text-primary-accent">
                               <span className="truncate w-3/4">{f.name}</span>
                               <span>{f.progress}%</span>
                             </div>
                             <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-primary-accent transition-all duration-300" style={{ width: `${f.progress}%` }} />
                             </div>
                           </div>
                         ))}
                      </div>
                   )}

                   <div className="mt-8 flex flex-col gap-3">
                      {audioFiles.map(file => (
                        <AudioPlayer 
                          key={file.id} 
                          file={file} 
                          onRename={canEdit ? renameAudioFile : undefined}
                          onDelete={canEdit && file.uploaded_by === user?.id ? (id) => {
                          setConfirmState({
                            isOpen: true,
                            title: "Delete Recording",
                            message: "Permanently remove this audio attachment?",
                            onConfirm: async () => {
                              await deleteAudioFile(id);
                              setConfirmState(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        } : undefined} />
                      ))}
                      {audioFiles.length === 0 && !uploadingFiles.length && (
                        <p className="text-center py-12 text-[10px] text-white/10 uppercase tracking-widest italic">No audio yet</p>
                      )}
                   </div>
                </div>
              )}
            </div>
          </div>

          <section className="hidden lg:flex lg:col-span-7 bg-bg-primary flex-col h-full border-r border-border">
            <LyricsEditor lyrics={lyrics} onChange={setLyrics} disabled={!canEdit} />
          </section>

          <section className="hidden lg:flex lg:col-span-5 flex-col bg-bg-primary overflow-y-auto">
            <div className="p-8 space-y-10">
              <div>
                <span className="text-accent-label block mb-6">Metadata</span>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Title" value={metadata.title} onChange={(v) => setMetadata({...metadata, title: v})} disabled={!canEdit} />
                  <Input label="Artist" value={metadata.artist} onChange={(v) => setMetadata({...metadata, artist: v})} disabled={!canEdit} />
                  <Input label="Tempo" value={metadata.tempo} onChange={(v) => setMetadata({...metadata, tempo: v})} disabled={!canEdit} />
                  <Input label="Key" value={metadata.key} onChange={(v) => setMetadata({...metadata, key: v})} disabled={!canEdit} />
                  <div className="col-span-2">
                     <Input label="Genre" value={metadata.genre} onChange={(v) => setMetadata({...metadata, genre: v})} disabled={!canEdit} />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-accent-label block mb-6">Recordings</span>
                {canEdit && (
                  <label className="bg-bg-tertiary border border-dashed border-tertiary-accent/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-bg-quaternary transition-all duration-300 ease-in-out group rounded-xl mb-4 hover:shadow-md hover:border-tertiary-accent/40">
                    <input type="file" multiple accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    <p className="text-[10px] text-tertiary-accent font-black group-hover:brightness-125 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Plus size={14} strokeWidth={3} /> Bulk Upload
                    </p>
                  </label>
                )}

                {uploadingFiles.length > 0 && (
                  <div className="space-y-3 mb-6 animate-pulse">
                    {uploadingFiles.map(f => (
                      <div key={f.name} className="text-[8px] uppercase tracking-widest font-black text-primary-accent flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary-accent rounded-full animate-ping"></div>
                        Processing {f.name}... {f.progress}%
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-col gap-3">
                  {audioFiles.map(file => (
                    <AudioPlayer 
                      key={file.id} 
                      file={file} 
                      onRename={canEdit ? renameAudioFile : undefined}
                      onDelete={canEdit && file.uploaded_by === user?.id ? (id) => {
                        setConfirmState({
                        isOpen: true,
                        title: "Delete Attachment",
                        message: "Are you sure you want to delete this recording?",
                        onConfirm: async () => {
                          await deleteAudioFile(id);
                          setConfirmState(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    } : undefined} />
                  ))}
                  {audioFiles.length === 0 && !uploadingFiles.length && (
                    <p className="text-center py-12 text-[10px] text-white/10 uppercase tracking-widest italic">No audio yet</p>
                  )}
                </div>
              </div>

              <div>
                 <div>
                   <span className="text-accent-label block mb-6">Project Notes</span>
                   <textarea 
                     className="w-full h-32 bg-bg-tertiary border border-white/5 rounded-xl p-5 text-sm text-white/40 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 leading-relaxed placeholder:text-white/5 font-mono transition-all duration-300 ease-in-out shadow-inner disabled:opacity-50"
                     placeholder="Technical notes, inspiration, setup..."
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     disabled={!canEdit}
                   />
                 </div>

                 <div>
                   <div className="flex justify-between items-center mb-6">
                     <span className="text-accent-label text-primary-accent">Feedback & Suggestions</span>
                     <div className="px-2 py-0.5 bg-primary-accent/10 border border-primary-accent/20 rounded text-[8px] font-black uppercase tracking-widest text-primary-accent">Editable for all</div>
                   </div>
                   <textarea 
                     className="w-full h-48 bg-bg-tertiary border border-primary-accent/20 rounded-xl p-5 text-sm text-white/90 outline-none focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent/50 leading-relaxed placeholder:text-white/10 font-mono transition-all duration-300 ease-in-out shadow-[0_0_20px_rgba(0,255,0,0.05)]"
                     placeholder="Share your feedback, suggest changes, or discuss the arrangement..."
                     value={feedbackNotes}
                     onChange={(e) => setFeedbackNotes(e.target.value)}
                   />
                 </div>
               </div>

              {!isOwner && (
                <div>
                   <span className="text-accent-label block mb-6">Leave Feedback</span>
                   <form onSubmit={submitFeedback} className="flex flex-col gap-3">
                     <textarea 
                        className="w-full h-32 bg-bg-tertiary border border-white/5 rounded-xl p-5 text-sm text-white/60 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 resize-none font-mono transition-all duration-300 ease-in-out shadow-inner"
                        value={newFeedback}
                        onChange={(e) => setNewFeedback(e.target.value)}
                        placeholder="Share your thoughts on this song..."
                      />
                      <Button variant="primary" onClick={submitFeedback} disabled={!newFeedback.trim() || submittingFeedback} icon={Send} className="self-end">Send Feedback</Button>
                   </form>
                </div>
              )}

              {feedback.length > 0 && (
                <div>
                  <span className="text-accent-label block mb-6">Feedback</span>
                  <div className="space-y-4">
                    {feedback.map(item => (
                      <div key={item.id} className="p-4 bg-bg-tertiary rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-bold text-primary-accent">{item.user_name}</span>
                          <span className="text-[9px] text-white/30">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{item.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <nav className="lg:hidden h-16 border-t border-border bg-bg-secondary flex items-center justify-around px-4 shrink-0 z-20">
           <button 
            onClick={() => setMobileTab('lyrics')}
            className={cn("flex flex-col items-center gap-1 transition-all duration-300 ease-in-out", mobileTab === 'lyrics' ? 'text-primary-accent scale-110 drop-shadow-md' : 'text-white/20 hover:text-white/50')}
           >
              <FileText size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">Lyrics</span>
           </button>
           <button 
            onClick={() => setMobileTab('audio')}
            className={cn("flex flex-col items-center gap-1 transition-all duration-300 ease-in-out", mobileTab === 'audio' ? 'text-tertiary-accent scale-110 drop-shadow-md' : 'text-white/20 hover:text-white/50')}
           >
              <Music size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">Audio</span>
           </button>
           <button 
            onClick={() => setMobileTab('details')}
            className={cn("flex flex-col items-center gap-1 transition-all duration-300 ease-in-out", mobileTab === 'details' ? 'text-secondary-text scale-110 drop-shadow-md' : 'text-white/20 hover:text-white/50')}
           >
              <Info size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">Details</span>
           </button>
        </nav>
      </main>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
