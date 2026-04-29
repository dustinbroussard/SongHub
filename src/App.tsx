import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Music, Trash2, Download, Copy, Check, FileAudio, Info, Edit3, FileText, ChevronLeft, Play, Pause, X, Search, ArrowUpDown, History as HistoryIcon, Clock, Save, RotateCcw, Smartphone, ChevronRight, Mic, Sun, Moon } from 'lucide-react';
import { Song, SongMetadata, AudioFile, HistoryEntry } from './types';
import { storage } from './lib/storage';
import { cn } from './lib/utils';

// --- Hooks ---
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = (onResult: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  return { isListening, startListening, stopListening };
};

// --- Shared Components ---

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 ease-in-out">
      <div className="bg-bg-secondary border border-white/10 w-full max-w-sm p-6 space-y-6 shadow-2xl rounded-xl animate-in zoom-in-95 duration-300 ease-in-out">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary-accent mb-2">{title}</h3>
          <p className="text-xs text-white/50 leading-relaxed uppercase tracking-tight">{message}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ease-in-out rounded-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-danger/20 hover:bg-danger/30 text-danger text-[10px] font-black uppercase tracking-widest transition-all duration-300 ease-in-out border border-danger/20 rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_14px_0_rgba(255,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.15)]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const IconButton = ({ 
  onClick, 
  icon: Icon, 
  className,
  title
}: { 
  onClick?: (e: React.MouseEvent) => void, 
  icon: any, 
  className?: string,
  title?: string
}) => (
  <button 
    onClick={onClick}
    title={title}
    className={cn(
      'p-1.5 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-300 ease-in-out outline-none text-white/50 hover:text-white shrink-0 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0',
      className
    )}
  >
    <Icon size={14} strokeWidth={2.5} />
  </button>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  icon: Icon,
  title
}: { 
  children?: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger',
  className?: string,
  icon?: any,
  title?: string
}) => {
  const variants = {
    primary: 'bg-primary-accent text-black font-bold uppercase tracking-widest text-[9px] hover:brightness-110 hover:shadow-[0_4px_14px_0_rgba(0,255,0,0.2)] hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-bg-tertiary text-white uppercase tracking-widest text-[9px] hover:bg-bg-quaternary border border-white/5 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0',
    outline: 'border border-bg-quaternary text-white/60 hover:text-white hover:border-white/20 text-[9px] uppercase tracking-widest hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0',
    danger: 'text-danger hover:bg-danger/10 border border-danger/20 text-[9px] uppercase tracking-widest hover:shadow-[0_4px_14px_0_rgba(255,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0'
  };

  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        'px-3 py-2 flex items-center justify-center gap-1.5 transition-all duration-300 ease-in-out outline-none rounded-xl shrink-0',
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={11} strokeWidth={3} />}
      {children}
    </button>
  );
};

const Input = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  className 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  label?: string,
  className?: string
}) => (
  <div className={cn("flex flex-col gap-1", className)}>
    {label && <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 ml-1">{label}</label>}
    <input 
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-bg-tertiary border border-white/5 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent outline-none transition-all duration-300 ease-in-out text-white/90 rounded-xl shadow-inner"
    />
  </div>
);

interface AudioPlayerProps {
  file: AudioFile;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ file, onDelete, onRename }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setEditName(file.name);
  }, [file.name]);

  const handleRename = () => {
    if (editName.trim() && editName !== file.name) {
      onRename(file.id, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditName(file.name);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    let currentUrl: string | null = null;
    const load = async () => {
      const blob = await storage.getAudioBlob(file.id);
      if (blob) {
        currentUrl = URL.createObjectURL(blob);
        setUrl(currentUrl);
      }
    };
    load();
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && audioRef.current.duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-bg-secondary/50 rounded-xl group relative border border-white/5 hover:border-white/10 hover:shadow-md transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button 
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center bg-primary-accent text-black rounded-full hover:shadow-[0_4px_12px_rgba(0,255,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-in-out shrink-0"
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="truncate flex-1">
            {isEditing ? (
              <input 
                autoFocus
                className="bg-bg-tertiary border border-primary-accent/50 outline-none px-2 py-1 text-[11px] w-full text-white rounded-lg focus:ring-2 focus:ring-primary-accent/30 transition-all duration-300"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <p className="text-[11px] font-bold text-white/90 truncate">{file.name}</p>
            )}
            <p className="text-[8px] text-white/30 font-black uppercase tracking-widest italic leading-none mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!isEditing && (
            <IconButton 
              icon={Edit3} 
              onClick={() => setIsEditing(true)} 
              title="Rename Recording"
            />
          )}
          <IconButton icon={Download} onClick={() => {
            if (!url) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
          }} />
          <IconButton icon={Trash2} className="hover:text-danger" onClick={() => onDelete(file.id)} />
        </div>
      </div>
      
      <div 
        className="h-1 bg-white/5 w-full cursor-pointer relative rounded-full overflow-hidden" 
        onClick={onSeek}
      >
        <div 
          className="h-full bg-primary-accent transition-all duration-100" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {url && (
        <audio 
          ref={audioRef} 
          src={url} 
          onTimeUpdate={onTimeUpdate} 
          onEnded={() => setIsPlaying(false)} 
          className="hidden" 
        />
      )}
    </div>
  );
};

// --- Sub-sections ---

const LyricsEditor = ({ lyrics, onChange }: { lyrics: string, onChange: (val: string) => void }) => {
  const [copied, setCopied] = useState(false);
  const { isListening, startListening, stopListening } = useSpeechRecognition();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => onChange(lyrics + (lyrics ? '\n' : '') + text));
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      <div className="px-4 lg:px-6 py-2.5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-bg-primary/95 backdrop-blur-md z-10">
        <span className="text-accent-label">Lyrics</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleVoiceInput}
            className={cn("flex items-center gap-1.5 text-[9px] uppercase font-black transition-colors tracking-widest", isListening ? "text-primary-accent" : "text-white/30 hover:text-white")}
          >
            <Mic size={11} />
            {isListening ? 'Listening...' : 'Voice'}
          </button>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 text-[9px] uppercase font-black text-white/30 hover:text-primary-accent transition-colors tracking-widest"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 lg:px-12 py-8">
        <textarea 
          value={lyrics}
          onChange={(e) => onChange(e.target.value)}
          placeholder="[VERSE 1]\nStatic in the midnight air..."
          className="w-full h-full min-h-[500px] bg-transparent border-none font-serif text-lg lg:text-xl leading-relaxed text-white/90 outline-none resize-none scroll-smooth placeholder:text-white/5 transition-all duration-300 ease-in-out focus:ring-0"
        />
      </div>
    </div>
  );
};

const Sidebar = ({ 
  songs, 
  activeId, 
  onSelect, 
  onCreate,
  onDelete,
  onExportZIP,
  theme,
  toggleTheme,
  onClose
}: { 
  songs: Song[], 
  activeId: string | null, 
  onSelect: (id: string) => void, 
  onCreate: () => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  onExportZIP: () => void,
  theme: 'dark' | 'light',
  toggleTheme: () => void,
  onClose?: () => void
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortDesc, setSortDesc] = useState(true);
  const { isListening, startListening, stopListening } = useSpeechRecognition();

  const filteredAndSortedSongs = useMemo(() => {
    let result = [...songs];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.metadata.title?.toLowerCase() || '').includes(q) ||
        (s.metadata.artist?.toLowerCase() || '').includes(q)
      );
    }
    
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        const titleA = a.metadata.title || 'Untitled';
        const titleB = b.metadata.title || 'Untitled';
        cmp = titleA.localeCompare(titleB);
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt - b.updatedAt;
      } else if (sortBy === 'createdAt') {
        cmp = a.createdAt - b.createdAt;
      }
      return sortDesc ? -cmp : cmp;
    });
    
    return result;
  }, [songs, searchQuery, sortBy, sortDesc]);

  return (
    <aside className="w-full lg:w-72 bg-bg-secondary border-r border-border flex flex-col h-full">
      <div className="p-5 border-b border-border flex items-center justify-between bg-bg-secondary shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-white/5 rounded">
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="text-primary-accent text-xl font-bold tracking-tighter uppercase">SongHub</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <IconButton icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme} title="Toggle Theme" />
          <Button variant="outline" icon={Plus} onClick={onCreate} className="hidden lg:flex" title="New Song">Create</Button>
        </div>
      </div>

      <div className="p-4 border-b border-border bg-bg-primary shrink-0 z-10 w-full min-w-0">
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
           <div className="flex items-center border-l border-white/5 shrink-0 px-1">
             <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent pl-1 pr-4 lg:px-2 py-2 text-[10px] lg:text-xs text-white/60 outline-none cursor-pointer hover:text-white appearance-none md:appearance-auto"
                style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
             >
                <option value="updatedAt">Updated</option>
                <option value="createdAt">Created</option>
                <option value="title">A ➞ Z</option>
             </select>
           </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredAndSortedSongs.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest mb-4">No results</p>
            {!searchQuery && <Button variant="outline" onClick={onCreate} className="mx-auto">Create</Button>}
          </div>
        ) : (
          filteredAndSortedSongs.map(song => (
            <div 
              key={song.id}
              onClick={() => {
                onSelect(song.id);
                if (onClose) onClose();
              }}
              className={cn(
                "p-3 cursor-pointer group relative transition-all duration-300 ease-in-out rounded-xl mx-2 mb-1",
                activeId === song.id 
                  ? "bg-bg-tertiary border border-white/10 shadow-sm" 
                  : "hover:bg-bg-tertiary/50 border border-transparent"
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={cn(
                    "text-sm font-medium transition-colors",
                    activeId === song.id ? "text-white" : "text-white/60 group-hover:text-white"
                  )}>
                    {song.metadata.title || "Untitled"}
                  </p>
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.1em] font-black mt-0.5">
                    {song.metadata.artist || "No Artist"} • {new Date(song.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(song.id, e);
                  }}
                  className={cn(
                    "p-2 -mr-1 text-white/10 hover:text-danger transition-all",
                    activeId === song.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  title="Delete Workspace"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </nav>

      <div className="p-4 border-t border-border bg-bg-primary hidden lg:block space-y-2">
        <Button variant="outline" className="w-full text-[8px]" icon={Download} onClick={onExportZIP}>
          Export Full Library (ZIP)
        </Button>
        <Button variant="outline" className="w-full text-[8px]" onClick={() => {
          const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chord_library_backup.json';
          a.click();
        }}>
          JSON Metadata ONLY
        </Button>
      </div>
    </aside>
  );
};

const HistoryModal = ({
  isOpen,
  song,
  onClose,
  onRestore
}: {
  isOpen: boolean;
  song: Song;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 ease-in-out">
      <div className="bg-bg-secondary w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl rounded-xl animate-in zoom-in-95 duration-300 ease-in-out border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary-accent flex items-center gap-2">
            <HistoryIcon size={14} /> Version History
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-xl transition-all text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary">
          {!song.history || song.history.length === 0 ? (
            <p className="text-center text-white/30 text-xs uppercase tracking-widest py-8">No history saved yet.</p>
          ) : (
            song.history.map(entry => entry).sort((a, b) => b.timestamp - a.timestamp).map(entry => (
              <div key={entry.id} className="p-4 border border-white/5 bg-bg-tertiary rounded-xl relative group hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-white text-xs font-bold">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <Button variant="outline" icon={RotateCcw} onClick={() => onRestore(entry)} className="px-2 py-1 text-[8px] h-auto">Restore</Button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-bg-primary p-2 rounded-lg text-[10px] text-white/60 font-mono h-32 overflow-y-auto whitespace-pre-wrap">
                    <span className="text-white/30 block mb-1 uppercase text-[8px] tracking-wider">Lyrics</span>
                    {entry.lyrics || <span className="opacity-50 italic">Empty</span>}
                  </div>
                  <div className="bg-bg-primary p-2 rounded-lg text-[10px] text-white/60 font-mono h-32 overflow-y-auto whitespace-pre-wrap">
                    <span className="text-white/30 block mb-1 uppercase text-[8px] tracking-wider">Notes</span>
                    {entry.notes || <span className="opacity-50 italic">Empty</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const InstallBanner = ({ onInstall, onDismiss }: { onInstall: () => void, onDismiss: () => void }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-3rem)] max-w-sm animate-in slide-in-from-bottom-8 duration-500 ease-out">
    <div className="bg-bg-secondary border border-white/10 p-5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4">
      <div className="w-12 h-12 bg-primary-accent rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,255,0,0.2)] shrink-0">
        <Smartphone size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-white leading-tight mb-0.5">Install SongHub</h4>
        <p className="text-[9px] text-white/50 uppercase tracking-tight leading-tight">Access your studio workspace offline</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <button 
          onClick={onInstall}
          className="bg-primary-accent text-black p-2 rounded-xl hover:shadow-[0_0_15px_rgba(0,255,0,0.3)] transition-all active:scale-95"
        >
          <ChevronRight size={18} />
        </button>
        <button 
          onClick={onDismiss}
          className="text-[8px] uppercase tracking-widest text-white/30 font-black hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  </div>
);

// --- Main App Root ---

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('Ready');
  const [mobileTab, setMobileTab] = useState<'lyrics' | 'details' | 'audio'>('lyrics');
  const [showSidebar, setShowSidebar] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Update UI notify the user they can install the PWA
      // Only show if not already in standalone mode and not dismissed this session
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const isDismissed = sessionStorage.getItem('pwa-dismissed') === 'true';

      if (!isStandalone && !isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  useEffect(() => {
    const loadedSongs = storage.getSongs();
    setSongs(loadedSongs);
    if (loadedSongs.length > 0) {
      setActiveId(loadedSongs[0].id);
      setShowSidebar(false);
    }
    
    // Load theme setting
    const savedTheme = localStorage.getItem('songhub-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light-mode', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('songhub-theme', newTheme);
    document.documentElement.classList.toggle('light-mode', newTheme === 'light');
  };

  const handleCreate = () => {
    const newSong: Song = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: { title: "New Idea", artist: "", key: "", tempo: "", genre: "" },
      lyrics: "", notes: "", audioFiles: []
    };
    storage.saveSong(newSong);
    const updated = storage.getSongs();
    setSongs(updated);
    setActiveId(newSong.id);
    setShowSidebar(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setConfirmState({
      isOpen: true,
      title: "Delete Workspace",
      message: "Are you sure you want to permanently delete this workspace and all associated recordings?",
      onConfirm: async () => {
        await storage.deleteSong(id);
        const updated = storage.getSongs();
        setSongs(updated);
        if (activeId === id) {
          if (updated.length > 0) setActiveId(updated[0].id);
          else setActiveId(null);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdate = (updatedSong: Song) => {
    storage.saveSong(updatedSong);
    setSaveStatus('Draft Saved');
    setSongs(storage.getSongs());
    setTimeout(() => setSaveStatus('Ready'), 2000);
  };

  const handleAudioRename = (id: string, newName: string) => {
    if (!currentSong) return;
    const newAudioFiles = currentSong.audioFiles.map(f => 
      f.id === id ? { ...f, name: newName } : f
    );
    handleUpdate({ ...currentSong, audioFiles: newAudioFiles });
  };

  const handleExportZIP = async () => {
    setSaveStatus('Preparing ZIP...');
    await storage.exportFullLibrary((msg) => {
      setSaveStatus(msg);
    });
    setTimeout(() => setSaveStatus('Ready'), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSong || !e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    // Process each file
    const newAudioFiles: AudioFile[] = [...currentSong.audioFiles];
    
    for (const file of files) {
      const fileId = crypto.randomUUID();
      setUploadingFiles(prev => [...prev, { name: file.name, progress: 10 }]);
      
      // Simulate real "processing" time for UI progress feel
      await new Promise(r => setTimeout(r, 400));
      setUploadingFiles(prev => prev.map(f => f.name === file.name ? { ...f, progress: 60 } : f));
      
      await storage.saveAudioBlob(fileId, file);
      setUploadingFiles(prev => prev.map(f => f.name === file.name ? { ...f, progress: 100 } : f));
      
      newAudioFiles.push({
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      await new Promise(r => setTimeout(r, 200));
      setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
    }

    handleUpdate({ ...currentSong, audioFiles: newAudioFiles });
  };

  const currentSong = songs.find(s => s.id === activeId);

  const handleSaveSnapshot = () => {
    if (!currentSong) return;
    const historyEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      lyrics: currentSong.lyrics,
      notes: currentSong.notes
    };
    handleUpdate({
      ...currentSong,
      history: [...(currentSong.history || []), historyEntry]
    });
    setSaveStatus('Snapshot Saved');
    setTimeout(() => setSaveStatus('Ready'), 2000);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    if (!currentSong) return;
    
    // Save current state as snapshot before restoring
    const currentEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      lyrics: currentSong.lyrics,
      notes: currentSong.notes
    };

    handleUpdate({
      ...currentSong,
      lyrics: entry.lyrics,
      notes: entry.notes,
      history: [...(currentSong.history || []), currentEntry]
    });
    setHistoryModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-bg-primary text-white selection:bg-primary-accent selection:text-black overflow-hidden tracking-tight">
      {/* Sidebar - View logic for mobile */}
      <div className={cn(
        "fixed inset-0 lg:relative z-50 transition-transform duration-300 lg:translate-x-0 bg-bg-primary",
        showSidebar || !activeId ? "translate-x-0" : "-translate-x-full lg:block"
      )}>
        <Sidebar 
          songs={songs} 
          activeId={activeId} 
          onSelect={setActiveId} 
          onCreate={handleCreate} 
          onDelete={handleDelete}
          theme={theme}
          toggleTheme={toggleTheme}
          onExportZIP={handleExportZIP}
          onClose={songs.length > 0 ? () => setShowSidebar(false) : undefined}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {currentSong ? (
          <>
            {/* Header */}
            <header className="h-14 lg:h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-bg-secondary shrink-0 z-20">
              <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                <button 
                  onClick={() => setShowSidebar(true)} 
                  className="lg:hidden p-2 hover:bg-white/5 rounded text-white/50"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="truncate">
                  <h2 className="text-sm lg:text-lg font-bold tracking-tight text-white/90 truncate">
                    {currentSong.metadata.title || "Untitled Song"}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary-accent"></div>
                    <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black">{saveStatus}</span>
                  </div>
                </div>
              </div>
                <div className="flex gap-2 shrink-0">
                <IconButton icon={HistoryIcon} onClick={() => setHistoryModalOpen(true)} title="Version History" />
                <Button variant="outline" icon={Save} onClick={handleSaveSnapshot} className="hidden lg:flex" title="Save Snapshot">Snapshot</Button>
                <IconButton icon={Save} onClick={handleSaveSnapshot} className="lg:hidden" title="Save Snapshot" />
                <IconButton icon={Download} onClick={() => storage.exportSongAsJSON(currentSong)} className="lg:hidden" title="Export JSON" />
                <Button variant="outline" onClick={() => storage.exportSongAsJSON(currentSong)} className="hidden lg:flex" title="Export JSON">JSON</Button>
                <Button variant="primary" onClick={() => storage.exportText(currentSong.lyrics, `${currentSong.metadata.title}.txt`)}>Export</Button>
              </div>
            </header>
            
            {/* Split View (Desktop) / Tab view (Mobile) */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-px bg-border overflow-hidden relative">
              
              {/* MOBILE TABS CONTENT */}
              <div className={cn("flex-1 overflow-hidden lg:hidden", mobileTab === 'lyrics' ? 'block' : 'hidden')}>
                <LyricsEditor lyrics={currentSong.lyrics} onChange={(l) => handleUpdate({ ...currentSong, lyrics: l })} />
              </div>
              
              <div className={cn("flex-1 overflow-y-auto lg:hidden bg-bg-primary", (mobileTab === 'details' || mobileTab === 'audio') ? 'block' : 'hidden')}>
                 <div className="p-6 space-y-8 min-h-full">
                    {mobileTab === 'details' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <span className="text-accent-label block mb-6">Workspace Details</span>
                         <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                              <Input label="Title" value={currentSong.metadata.title} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, title: v } })} />
                              <Input label="Artist" value={currentSong.metadata.artist} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, artist: v } })} />
                              <Input label="Tempo" value={currentSong.metadata.tempo} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, tempo: v } })} />
                              <Input label="Key" value={currentSong.metadata.key} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, key: v } })} />
                            </div>
                            <Input label="Genre" value={currentSong.metadata.genre} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, genre: v } })} />
                            <div className="pt-4 border-t border-white/5">
                               <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 block">Project Notes</label>
                               <textarea 
                                  className="w-full h-64 bg-bg-tertiary border border-white/5 rounded-xl p-3 text-xs text-white/70 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 resize-none font-mono transition-all duration-300 ease-in-out shadow-inner"
                                  value={currentSong.notes}
                                  onChange={(e) => handleUpdate({ ...currentSong, notes: e.target.value })}
                                />
                            </div>
                         </div>
                      </div>
                    )}
                    {mobileTab === 'audio' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <span className="text-accent-label block mb-6">Audio Attachments</span>
                         <label className="block bg-bg-tertiary border border-dashed border-white/10 p-6 text-center rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:bg-bg-quaternary hover:shadow-md hover:border-white/20">
                            <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
                            <Plus size={24} className="mx-auto text-primary-accent mb-2" />
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">Upload Recordings</p>
                         </label>
                         
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
                            {currentSong.audioFiles.map(file => (
                              <AudioPlayer 
                                key={file.id} 
                                file={file} 
                                onRename={handleAudioRename}
                                onDelete={(id) => {
                                setConfirmState({
                                  isOpen: true,
                                  title: "Delete Recording",
                                  message: "Permanently remove this audio attachment?",
                                  onConfirm: async () => {
                                    await storage.deleteAudioBlob(id);
                                    handleUpdate({ ...currentSong, audioFiles: currentSong.audioFiles.filter(f => f.id !== id) });
                                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }} />
                            ))}
                            {currentSong.audioFiles.length === 0 && !uploadingFiles.length && (
                              <p className="text-center py-12 text-[10px] text-white/10 uppercase tracking-widest italic">No audio yet</p>
                            )}
                         </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* DESKTOP CONTENT */}
              <section className="hidden lg:flex lg:col-span-7 bg-bg-primary flex-col h-full border-r border-border">
                <LyricsEditor lyrics={currentSong.lyrics} onChange={(l) => handleUpdate({ ...currentSong, lyrics: l })} />
              </section>

              <section className="hidden lg:flex lg:col-span-5 flex-col bg-bg-primary overflow-y-auto">
                <div className="p-8 space-y-10">
                  <div>
                    <span className="text-accent-label block mb-6">Metadata</span>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Tempo" value={currentSong.metadata.tempo} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, tempo: v } })} />
                      <Input label="Key" value={currentSong.metadata.key} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, key: v } })} />
                      <div className="col-span-2">
                         <Input label="Genre" value={currentSong.metadata.genre} onChange={(v) => handleUpdate({ ...currentSong, metadata: { ...currentSong.metadata, genre: v } })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-accent-label block mb-6">Recordings</span>
                    <label className="bg-bg-tertiary border border-dashed border-tertiary-accent/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-bg-quaternary transition-all duration-300 ease-in-out group rounded-xl mb-4 hover:shadow-md hover:border-tertiary-accent/40">
                      <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
                      <p className="text-[10px] text-tertiary-accent font-black group-hover:brightness-125 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Plus size={14} strokeWidth={3} /> Bulk Upload
                      </p>
                    </label>

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
                      {currentSong.audioFiles.map(file => (
                        <AudioPlayer 
                          key={file.id} 
                          file={file} 
                          onRename={handleAudioRename}
                          onDelete={(id) => {
                            setConfirmState({
                            isOpen: true,
                            title: "Delete Attachment",
                            message: "Are you sure you want to delete this recording?",
                            onConfirm: async () => {
                              await storage.deleteAudioBlob(id);
                              handleUpdate({ ...currentSong, audioFiles: currentSong.audioFiles.filter(f => f.id !== id) });
                              setConfirmState(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-accent-label block mb-6">Notes</span>
                    <textarea 
                      className="w-full h-64 bg-bg-tertiary border border-white/5 rounded-xl p-5 text-sm text-white/60 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10 leading-relaxed placeholder:text-white/5 font-mono transition-all duration-300 ease-in-out shadow-inner"
                      placeholder="Technical notes, inspiration, setup..."
                      value={currentSong.notes}
                      onChange={(e) => handleUpdate({ ...currentSong, notes: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Bottom Nav (Mobile Only) */}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-bg-primary p-8">
            <div className="text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-bg-tertiary border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/5 rotate-12">
                <Music size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tighter mb-2 uppercase opacity-40">Ready</h3>
              <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-black mb-8 px-12">Capture your lightning before it strikes twice</p>
              <Button variant="primary" onClick={handleCreate} icon={Plus} className="mx-auto shadow-lg shadow-primary-accent/10 py-2 px-6">New Song Idea</Button>
            </div>
          </div>
        )}
      </main>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {currentSong && (
        <HistoryModal
          isOpen={historyModalOpen}
          song={currentSong}
          onClose={() => setHistoryModalOpen(false)}
          onRestore={handleRestoreHistory}
        />
      )}

      {showInstallBanner && (
        <InstallBanner 
          onInstall={handleInstallClick}
          onDismiss={handleDismissInstall}
        />
      )}
    </div>
  );
}
