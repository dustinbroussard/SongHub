import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Save, FileText, Music, Info, History as HistoryIcon, Plus } from 'lucide-react';
import { Button, IconButton, ConfirmModal, Input, AudioPlayer, LyricsEditor } from '../components/ui';
import { cn } from '../lib/utils';
import type { Database } from '../types/database';

type Idea = Database['public']['Tables']['hub_new_ideas']['Row'];
type AudioVersion = Database['public']['Tables']['hub_new_idea_audio_versions']['Row'];

interface AudioFile extends AudioVersion {
  url?: string;
}

export function IdeaWorkspacePage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [idea, setIdea] = useState<Idea | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('READY');
  const [mobileTab, setMobileTab] = useState<'lyrics' | 'details' | 'audio'>('lyrics');
  
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tempo, setTempo] = useState<string>('');
  const [key, setKey] = useState('');
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  
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

  const isOwner = idea?.created_by === user?.id;
  const canEdit = isOwner;

  useEffect(() => {
    if (!ideaId || !user) return;

    const fetchIdea = async () => {
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

      const { data: audioData } = await supabase
        .from('hub_new_idea_audio_versions')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (audioData) {
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
    document.documentElement.classList.remove('light-mode');
  }, [ideaId, user, navigate]);

  const saveIdea = async () => {
    if (!idea || !canEdit) return;

    setSaving(true);
    setSaveStatus('SAVING...');

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
      setSaveStatus('SAVED');
      setTimeout(() => setSaveStatus('READY'), 2000);
    } else {
      setSaveStatus('ERROR');
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !idea || !user) return;
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, { name: file.name, progress: 10 }]);
        const filePath = `${idea.band_id}/${idea.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('songhub-audio')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        setUploadingFiles(prev => prev.map(f => f.name === file.name ? { ...f, progress: 60 } : f));

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
        setUploadingFiles(prev => prev.map(f => f.name === file.name ? { ...f, progress: 100 } : f));

        const { data: urlData } = await supabase
          .storage
          .from('songhub-audio')
          .createSignedUrl(filePath, 3600);

        setAudioFiles(prev => [{ ...audioRecord, url: urlData?.signedUrl }, ...prev]);
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
      }
    }
  };

  const deleteAudioFile = async (fileId: string) => {
    const file = audioFiles.find(f => f.id === fileId);
    if (!file || !canEdit) return;

    await supabase.storage.from(file.storage_bucket).remove([file.storage_path]);
    await supabase.from('hub_new_idea_audio_versions').delete().eq('id', fileId);
    setAudioFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const renameAudioFile = async (id: string, newName: string) => {
    if (!canEdit) return;
    await supabase.from('hub_new_idea_audio_versions').update({ display_name: newName }).eq('id', id);
    setAudioFiles(prev => prev.map(f => f.id === id ? { ...f, display_name: newName } : f));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent text-[10px] uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  if (!idea) return null;

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent border-none text-sm lg:text-lg font-bold tracking-tight text-white/90 truncate focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-sm lg:text-lg font-bold tracking-tight text-white/90 truncate">
                  {title || "Untitled Idea"}
                </h2>
              )}
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1 h-1 rounded-full", saveStatus === 'SAVING...' ? "bg-yellow-500 animate-pulse" : saveStatus === 'ERROR' ? "bg-red-500" : "bg-primary-accent")}></div>
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black">{saveStatus}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {canEdit && (
              <>
                <Button variant="outline" icon={Save} onClick={saveIdea} className="hidden lg:flex" disabled={saving}>Save</Button>
                <IconButton icon={Save} onClick={saveIdea} className="lg:hidden" title="Save" />
              </>
            )}
          </div>
        </header>
        
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
                        <Input label="Title" value={title} onChange={setTitle} disabled={!canEdit} />
                        <Input label="Artist" value={artist} onChange={setArtist} disabled={!canEdit} />
                        <Input label="Tempo" value={tempo} onChange={setTempo} disabled={!canEdit} />
                        <Input label="Key" value={key} onChange={setKey} disabled={!canEdit} />
                      </div>
                      <Input label="Genre" value={genre} onChange={setGenre} disabled={!canEdit} />
                      <div className="pt-4 border-t border-white/5">
                         <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 block">Project Notes</label>
                         <textarea 
                            className="w-full h-64 bg-bg-tertiary border border-white/5 rounded-xl p-3 text-xs text-white/70 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 resize-none font-mono transition-all duration-300 ease-in-out shadow-inner disabled:opacity-50"
                            value={projectNotes}
                            onChange={(e) => setProjectNotes(e.target.value)}
                            disabled={!canEdit}
                          />
                      </div>
                   </div>
                </div>
              )}
              {mobileTab === 'audio' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <span className="text-accent-label block mb-6">Audio Attachments</span>
                   {canEdit && (
                     <label className="block bg-bg-tertiary border border-dashed border-white/10 p-6 text-center rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-bg-quaternary hover:shadow-md hover:border-white/20">
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
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
                          onDelete={canEdit ? (id) => {
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
                  <Input label="Tempo" value={tempo} onChange={setTempo} disabled={!canEdit} />
                  <Input label="Key" value={key} onChange={setKey} disabled={!canEdit} />
                  <div className="col-span-2">
                     <Input label="Genre" value={genre} onChange={setGenre} disabled={!canEdit} />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-accent-label block mb-6">Recordings</span>
                {canEdit && (
                  <label className="bg-bg-tertiary border border-dashed border-tertiary-accent/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-bg-quaternary transition-all duration-300 ease-in-out group rounded-xl mb-4 hover:shadow-md hover:border-tertiary-accent/40">
                    <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
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
                      onDelete={canEdit ? (id) => {
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
                <span className="text-accent-label block mb-6">Notes</span>
                <textarea 
                  className="w-full h-64 bg-bg-tertiary border border-white/5 rounded-xl p-5 text-sm text-white/60 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 leading-relaxed placeholder:text-white/5 font-mono transition-all duration-300 ease-in-out shadow-inner disabled:opacity-50"
                  placeholder="Technical notes, inspiration, setup..."
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
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
