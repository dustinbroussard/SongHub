import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Mic, Sun, Moon, ArrowUpDown, Edit3, Archive, LogOut, ChevronRight, MoreVertical, UserPlus, Copy, Check, X, Download } from 'lucide-react';
import { Button, IconButton, ConfirmModal, useSpeechRecognition } from '../components/ui';
import { exportBandLibraryZIP } from '../lib/export';
import { notifyBandMembers } from '../lib/notifications';
import { cn } from '../lib/utils';
import type { Database } from '../types/database';

type Band = Database['public']['Tables']['hub_bands']['Row'];
type Idea = Database['public']['Tables']['hub_new_ideas']['Row'];

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [bands, setBands] = useState<Band[]>([]);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortDesc, setSortDesc] = useState(true);
  const [showBandMenu, setShowBandMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { isListening, startListening, stopListening } = useSpeechRecognition();
  
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

  const isOwner = currentBand?.owner_id === user?.id;

  const handleCopyInvite = async () => {
    if (!currentBand) return;
    const url = `${window.location.origin}/join?code=${currentBand.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchBands = async () => {
      const { data: memberBands } = await supabase
        .from('hub_band_members')
        .select('band_id')
        .eq('user_id', user.id);

      if (memberBands && memberBands.length > 0) {
        const bandIds = memberBands.map(m => m.band_id);
        const { data: bandsData } = await supabase
          .from('hub_bands')
          .select('*')
          .in('id', bandIds)
          .order('created_at', { ascending: false });

        if (bandsData && bandsData.length > 0) {
          setBands(bandsData);
          
          const lastBandId = localStorage.getItem('songhub_last_band_id');
          const lastBand = bandsData.find(b => b.id === lastBandId);
          setCurrentBand(lastBand || bandsData[0]);
        }
      }
      setLoading(false);
    };

    fetchBands();
  }, [user]);

  useEffect(() => {
    if (currentBand) {
      localStorage.setItem('songhub_last_band_id', currentBand.id);
    }
  }, [currentBand]);

  useEffect(() => {
    if (!currentBand || !user) return;
    const fetchBandData = async () => {
      const { data: ideasData } = await supabase
        .from('hub_new_ideas')
        .select('*')
        .eq('band_id', currentBand.id)
        .order('updated_at', { ascending: false });

      if (ideasData) {
        setIdeas(ideasData);
      }
    };

    fetchBandData();
  }, [currentBand, user]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light-mode', newTheme === 'light');
  };

  const createIdea = async () => {
    if (!currentBand || !user) return;
    
    const { data, error } = await supabase
      .from('hub_new_ideas')
      .insert({
        band_id: currentBand.id,
        created_by: user.id,
        title: 'New Idea',
      })
      .select()
      .single();

    if (!error && data) {
      await notifyBandMembers({
        bandId: currentBand.id,
        songId: data.id,
        type: 'create',
        message: `${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone'} created a new idea: "${data.title}"`,
        fromUserId: user.id,
        fromUserName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member',
        excludeSelf: true,
      });
      navigate(`/idea/${data.id}`);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmState({
      isOpen: true,
      title: "Delete Workspace",
      message: "Are you sure you want to permanently delete this idea and all associated recordings?",
      onConfirm: async () => {
        await supabase.from('hub_new_ideas').delete().eq('id', id);
        setIdeas(prev => prev.filter(i => i.id !== id));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEditTitle = async (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newTitle = window.prompt("Edit song title:", currentTitle || 'Untitled');
    if (newTitle !== null) {
      const trimmed = newTitle.trim();
      await supabase.from('hub_new_ideas').update({ title: trimmed || 'Untitled' }).eq('id', id);
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, title: trimmed || 'Untitled' } : i));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/songhub/onboarding');
  };

  const filteredAndSortedIdeas = useMemo(() => {
    let result = [...ideas];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.title?.toLowerCase() || '').includes(q) ||
        (s.artist?.toLowerCase() || '').includes(q)
      );
    }
    
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        const titleA = a.title || 'Untitled';
        const titleB = b.title || 'Untitled';
        cmp = titleA.localeCompare(titleB);
      } else if (sortBy === 'updatedAt') {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortBy === 'createdAt') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDesc ? -cmp : cmp;
    });
    return result;
  }, [ideas, searchQuery, sortBy, sortDesc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent text-[10px] uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  if (bands.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-bg-tertiary border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/5 rotate-12">
          <Plus size={32} />
        </div>
        <h3 className="text-xl font-bold tracking-tighter mb-2 uppercase opacity-40 text-white">No Bands</h3>
        <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-black mb-8 px-12">Create or join a band to get started</p>
        <Button variant="primary" onClick={() => navigate('/songhub/onboarding')} className="mx-auto shadow-lg shadow-primary-accent/10 py-2 px-6">
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-white selection:bg-primary-accent selection:text-black tracking-tight">
      <div className="w-full lg:max-w-4xl mx-auto flex flex-col h-full bg-bg-primary">
        <div className="p-5 border-b border-border flex items-center justify-between bg-bg-secondary shrink-0 z-30 sticky top-0 shadow-lg">
          <div className="flex items-center gap-3">
            <h1 className="text-primary-accent text-xl font-bold tracking-tighter uppercase">SONGHUB</h1>
            <div className="relative ml-2">
              <button
                onClick={() => setShowBandMenu(!showBandMenu)}
                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors text-[10px] uppercase font-black tracking-widest text-white/70"
              >
                <span>{currentBand?.name}</span>
                <MoreVertical className="w-3 h-3 text-white/50" />
              </button>

              {showBandMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    {bands.map(band => (
                      <button
                        key={band.id}
                        onClick={() => { setCurrentBand(band); setShowBandMenu(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-bold tracking-wider uppercase transition-colors",
                          band.id === currentBand?.id ? 'bg-primary-accent/20 text-primary-accent' : 'hover:bg-white/5 text-white/70'
                        )}
                      >
                        {band.name}
                        {band.id === currentBand?.id && <ChevronRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/10 p-2 space-y-1">
                    {isOwner && (
                      <button
                        onClick={() => { setShowInviteModal(true); setShowBandMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary-accent hover:bg-primary-accent/10 transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        Invite Members
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!currentBand) return;
                        setExporting(true);
                        setShowBandMenu(false);
                        await exportBandLibraryZIP(currentBand.id, currentBand.name, (msg) => setExportProgress(msg));
                        setExporting(false);
                        setExportProgress('');
                      }}
                      disabled={exporting}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      {exporting ? 'Exporting...' : 'Export Library (ZIP)'}
                    </button>
                    <button
                      onClick={() => navigate('/songhub/onboarding')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Create New Band
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <IconButton icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme} title="Toggle Theme" />
            <IconButton icon={Plus} className="text-black bg-primary-accent hover:bg-primary-accent/90 rounded-xl p-1.5 shadow-[0_0_10px_rgba(0,255,0,0.2)]" onClick={createIdea} title="New Idea" />
          </div>
        </div>

        <div className="p-4 border-b border-border bg-bg-primary shrink-0 z-20 w-full min-w-0 sticky top-[73px]">
          {exporting && (
            <div className="mb-4 p-3 bg-primary-accent/10 border border-primary-accent/20 rounded-xl animate-pulse">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-accent flex items-center gap-2">
                <Download size={12} className="animate-bounce" />
                {exportProgress}
              </p>
            </div>
          )}
          <div className="bg-bg-tertiary border border-white/5 rounded-xl flex items-center shadow-inner focus-within:ring-2 focus-within:ring-primary-accent/30 focus-within:border-primary-accent transition-all duration-300 w-full">
             <button 
               onClick={() => isListening ? stopListening() : startListening((text) => setSearchQuery(text))}
               className={cn("p-2 lg:p-3 transition-colors shrink-0", isListening ? "text-primary-accent" : "text-white/30 hover:text-white")}
               title="Voice Search"
             >
               <Mic size={14} />
             </button>
             <input 
               type="text"
               placeholder="Search songs..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="flex-1 w-0 min-w-0 bg-transparent py-2 px-1 text-xs text-white/90 outline-none placeholder:text-white/20"
             />
             <div className="flex items-center border-l border-white/5 shrink-0 px-1 relative">
               <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent pl-1 pr-4 lg:px-2 py-2 text-[10px] lg:text-xs text-white/60 outline-none cursor-pointer hover:text-white appearance-none"
                  style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
               >
                  <option value="updatedAt">Updated</option>
                  <option value="createdAt">Created</option>
                  <option value="title">A ➞ Z</option>
               </select>
               <ArrowUpDown size={10} className="absolute right-1 text-white/30 pointer-events-none" />
             </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredAndSortedIdeas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[10px] text-white/20 uppercase tracking-widest mb-4">No results</p>
              {!searchQuery && <Button variant="outline" onClick={createIdea} className="mx-auto">Create Idea</Button>}
            </div>
          ) : (
            filteredAndSortedIdeas.map(idea => (
              <div 
                key={idea.id}
                onClick={() => navigate(`/idea/${idea.id}`)}
                className="p-4 cursor-pointer group relative transition-all duration-300 ease-in-out rounded-xl mx-2 mb-2 hover:bg-bg-tertiary/50 border border-transparent border-white/5 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium transition-colors text-white/90 group-hover:text-white">
                      {idea.title || "Untitled"}
                    </p>
                    <p className="text-[9px] text-white/30 uppercase tracking-[0.1em] font-black mt-0.5">
                      {idea.artist || "No Artist"} • {new Date(idea.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 -mr-1">
                    <button 
                      type="button"
                      onClick={(e) => handleEditTitle(idea.id, idea.title || '', e)}
                      className="p-1.5 text-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_8px_rgba(59,130,246,0.5)] active:bg-blue-500/10 active:scale-95 rounded transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Edit Title"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleDelete(idea.id, e)}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_8px_rgba(239,68,68,0.5)] active:bg-red-500/10 active:scale-95 rounded transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Delete Workspace"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </nav>
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-white/10 w-full max-w-sm p-6 space-y-6 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary-accent mb-2">Invite Link</h3>
                <p className="text-[10px] text-white/50 leading-relaxed uppercase tracking-tight">Share this link with your bandmates to invite them to "{currentBand?.name}"</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  readOnly 
                  value={`${window.location.origin}/join?code=${currentBand?.invite_code}`}
                  className="w-full bg-bg-tertiary border border-white/5 rounded-xl px-4 py-3 text-xs text-white/90 font-mono outline-none shadow-inner pr-12"
                />
                <button 
                  onClick={handleCopyInvite}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-accent text-black rounded-lg hover:brightness-110 transition-all active:scale-95"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              
              <Button variant="outline" onClick={() => setShowInviteModal(false)} className="w-full py-3">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
