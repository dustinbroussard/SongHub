import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, Download, Edit3, Check, Copy, Mic, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const useSpeechRecognition = () => {
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

export const ConfirmModal = ({ 
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

export const IconButton = ({ 
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

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  icon: Icon,
  title,
  disabled
}: { 
  children?: React.ReactNode, 
  onClick?: (e?: any) => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger',
  className?: string,
  icon?: any,
  title?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: 'bg-primary-accent text-black font-bold uppercase tracking-widest text-[9px] hover:brightness-110 hover:shadow-[0_4px_14px_0_rgba(0,255,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:cursor-not-allowed',
    secondary: 'bg-bg-tertiary text-white uppercase tracking-widest text-[9px] hover:bg-bg-quaternary border border-white/5 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:cursor-not-allowed',
    outline: 'border border-bg-quaternary text-white/60 hover:text-white hover:border-white/20 text-[9px] uppercase tracking-widest hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:cursor-not-allowed',
    danger: 'text-danger hover:bg-danger/10 border border-danger/20 text-[9px] uppercase tracking-widest hover:shadow-[0_4px_14px_0_rgba(255,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:cursor-not-allowed'
  };

  return (
    <button 
      onClick={onClick}
      title={title}
      disabled={disabled}
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

export const Input = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  className,
  disabled
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  label?: string,
  className?: string,
  disabled?: boolean
}) => (
  <div className={cn("flex flex-col gap-1", className)}>
    {label && <label className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 ml-1">{label}</label>}
    <input 
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="bg-bg-tertiary border border-white/5 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary-accent/30 focus:border-primary-accent outline-none transition-all duration-300 ease-in-out text-white/90 rounded-xl shadow-inner disabled:opacity-50"
    />
  </div>
);

export const AudioPlayer: React.FC<{ 
  file: any;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
}> = ({ 
  file, 
  onDelete, 
  onRename 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name || file.display_name || 'Audio File');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setEditName(file.name || file.display_name || 'Audio File');
  }, [file.name, file.display_name]);

  const handleRename = () => {
    if (editName.trim() && editName !== (file.name || file.display_name) && onRename) {
      onRename(file.id, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setEditName(file.name || file.display_name || 'Audio File');
      setIsEditing(false);
    }
  };

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
              <p className="text-[11px] font-bold text-white/90 truncate">{file.name || file.display_name}</p>
            )}
            <p className="text-[8px] text-white/30 font-black uppercase tracking-widest italic leading-none mt-0.5">
              {((file.size || file.byte_size || 0) / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!isEditing && onRename && (
            <IconButton 
              icon={Edit3} 
              onClick={() => setIsEditing(true)} 
              title="Rename Recording"
            />
          )}
          <IconButton 
            icon={Download} 
            onClick={async () => {
              if (!file.url) return;
              try {
                const response = await fetch(file.url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = file.name || file.display_name || 'recording.mp3';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
              } catch (err) {
                console.error('Download failed:', err);
                // Fallback to direct link if fetch fails
                window.open(file.url, '_blank');
              }
            }} 
          />
          {onDelete && <IconButton icon={Trash2} className="hover:text-danger" onClick={() => onDelete(file.id)} />}
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

      {file.url && (
        <audio 
          ref={audioRef} 
          src={file.url} 
          onTimeUpdate={onTimeUpdate} 
          onEnded={() => setIsPlaying(false)} 
          className="hidden" 
        />
      )}
    </div>
  );
};

const normalizeLyricsLabels = (text: string) => {
  let verseCount = 0;

  const labels = [
    { target: 'INTRO', regex: /^(intro(?:duction)?)$/i },
    { target: 'OUTRO', regex: /^(outro)$/i },
    { target: 'CHORUS', regex: /^(chorus|chrs|cho)$/i },
    { target: 'BRIDGE', regex: /^(bridge|brigde|bridg)$/i },
    { target: 'REPRISE', regex: /^(reprise)$/i },
    { target: 'REFRAIN', regex: /^(refrain|reffrain)$/i },
    { target: 'INSTRUMENTAL BREAK', regex: /^(instrumental|inst|solo|music|break)$/i },
    { target: 'PRE-CHORUS', regex: /^(pre-?chorus|pre)$/i }
  ];

  const normalizedLines = text.split('\n').map(line => {
    const matchIndentation = line.match(/^\s*/);
    const indentation = matchIndentation ? matchIndentation[0] : '';
    
    const cleanLine = line.replace(/[\[\]\(\)\*\:\;\?\!\.\,]/g, ' ').trim().toLowerCase();
    const words = cleanLine.split(/\s+/).filter(Boolean);

    if (words.length > 0 && words.length <= 4) {
      if (words.some(w => /^(verse|vers)$/i.test(w))) {
        const isOnlyVerse = words.every(w => /^(verse|vers)$/i.test(w) || !isNaN(Number(w)));
        if (isOnlyVerse) {
          const numMatch = words.find(w => !isNaN(Number(w)));
          if (numMatch) {
            const num = parseInt(numMatch, 10);
            verseCount = num;
            return `${indentation}[VERSE ${num}]`;
          } else {
            verseCount++;
            return `${indentation}[VERSE ${verseCount}]`;
          }
        }
      }

      if (words.some(w => /^(instrumental|inst|solo|music)$/i.test(w))) {
        const isOnlyInst = words.every(w => /^(instrumental|inst|solo|music|break)$/i.test(w));
        if (isOnlyInst) {
          return `${indentation}[INSTRUMENTAL BREAK]`;
        }
      }

      for (const label of labels) {
        if (label.target === 'INSTRUMENTAL BREAK') continue;
        
        if (words.some(w => label.regex.test(w))) {
           const isOnlyMatch = words.every(w => label.regex.test(w) || !isNaN(Number(w)));
           if (isOnlyMatch) {
             const numMatch = words.find(w => !isNaN(Number(w)));
             if (numMatch && ['CHORUS', 'PRE-CHORUS'].includes(label.target)) {
                return `${indentation}[${label.target} ${numMatch}]`;
             }
             return `${indentation}[${label.target}]`;
           }
        }
      }
    }

    return line;
  });

  const spacedLines: string[] = [];
  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const isSectionLabel = /^\s*\[[A-Z0-9 \-]+\]\s*$/.test(line);

    if (isSectionLabel) {
      while (spacedLines.length > 0 && spacedLines[spacedLines.length - 1].trim() === '') {
        spacedLines.pop();
      }
      if (spacedLines.length > 0) {
        spacedLines.push('');
      }
      spacedLines.push(line);

      while (i + 1 < normalizedLines.length && normalizedLines[i + 1].trim() === '') {
        i++;
      }
    } else {
      spacedLines.push(line);
    }
  }

  return spacedLines.join('\n');
};

export const LyricsEditor = ({ lyrics, onChange, disabled }: { lyrics: string, onChange: (val: string) => void, disabled?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('lyricsFontSize');
    return saved ? parseInt(saved, 10) : 18;
  });
  const { isListening, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    localStorage.setItem('lyricsFontSize', fontSize.toString());
  }, [fontSize]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVoiceInput = () => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => onChange(lyrics + (lyrics ? '\n' : '') + text));
    }
  };

  const handleNormalize = () => {
    if (disabled) return;
    onChange(normalizeLyricsLabels(lyrics));
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      <div className="px-4 lg:px-6 py-2.5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-bg-primary/95 backdrop-blur-md z-10">
        <span className="text-accent-label">Lyrics</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 mr-2 border-r border-white/10 pr-4">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              className="text-[10px] font-serif text-white/30 hover:text-white transition-colors w-4"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="text-[10px] text-white/50 w-5 text-center font-mono">{fontSize}</span>
            <button
              onClick={() => setFontSize(Math.min(48, fontSize + 2))}
              className="text-[12px] font-serif text-white/30 hover:text-white transition-colors w-4"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>
          {!disabled && (
            <>
              <button 
                onClick={handleNormalize}
                className="flex items-center gap-1.5 text-[9px] uppercase font-black text-white/30 hover:text-primary-accent transition-colors tracking-widest"
                title="Normalize Section Labels"
              >
                <Wand2 size={11} />
                <span className="hidden sm:inline">Format</span>
              </button>
              <button 
                onClick={handleVoiceInput}
                className={cn("flex items-center gap-1.5 text-[9px] uppercase font-black transition-colors tracking-widest", isListening ? "text-primary-accent" : "text-white/30 hover:text-white")}
              >
                <Mic size={11} />
                {isListening ? 'Listening...' : 'Voice'}
              </button>
            </>
          )}
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
          onBlur={handleNormalize}
          disabled={disabled}
          placeholder="[VERSE 1]\nStatic in the midnight air..."
          style={{ fontSize: `${fontSize}px` }}
          className="w-full h-full min-h-[500px] bg-transparent border-none font-serif leading-relaxed text-white/90 outline-none resize-none scroll-smooth placeholder:text-white/5 transition-all duration-300 ease-in-out focus:ring-0 disabled:opacity-70 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};
