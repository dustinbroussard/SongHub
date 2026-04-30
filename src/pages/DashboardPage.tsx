import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Music, Users, Settings, LogOut, ChevronRight, MoreVertical, UserPlus, Bell } from 'lucide-react';
import type { Database } from '../types/database';

type Band = Database['public']['Tables']['bands']['Row'];
type Song = Database['public']['Tables']['songs']['Row'];
type BandMember = Database['public']['Tables']['band_members']['Row'];

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [bands, setBands] = useState<Band[]>([]);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showBandMenu, setShowBandMenu] = useState(false);
  const [hasNewContent, setHasNewContent] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch user's bands and select first one
  useEffect(() => {
    if (!user) return;

    const fetchBands = async () => {
      const { data: memberBands } = await supabase
        .from('band_members')
        .select('band_id')
        .eq('user_id', user.id);

      if (memberBands && memberBands.length > 0) {
        const bandIds = memberBands.map(m => m.band_id);
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*')
          .in('id', bandIds)
          .order('created_at', { ascending: false });

        if (bandsData && bandsData.length > 0) {
          setBands(bandsData);
          setCurrentBand(bandsData[0]);
        }
      }
      setLoading(false);
    };

    fetchBands();
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Fetch songs and members when band changes
  useEffect(() => {
    if (!currentBand || !user) return;

    const fetchBandData = async () => {
      // Fetch songs
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('band_id', currentBand.id)
        .order('updated_at', { ascending: false });

      if (songsData) {
        setSongs(songsData);
        
        // Check for new content since last visit
        const { data: lastSeen } = await supabase
          .from('user_last_seen')
          .select('last_seen_at')
          .eq('user_id', user.id)
          .eq('band_id', currentBand.id)
          .single();

        if (lastSeen) {
          const newSongs = songsData.some(song => 
            new Date(song.updated_at) > new Date(lastSeen.last_seen_at)
          );
          setHasNewContent(newSongs);
        }
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', currentBand.id);

      if (membersData) {
        setMembers(membersData);
      }

      // Update last seen
      await supabase
        .from('user_last_seen')
        .upsert({
          user_id: user.id,
          band_id: currentBand.id,
          last_seen_at: new Date().toISOString(),
        });
    };

    fetchBandData();
  }, [currentBand, user]);

  const createSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim() || !currentBand || !user) return;

    setCreating(true);
    
    const { data, error } = await supabase
      .from('songs')
      .insert({
        band_id: currentBand.id,
        created_by: user.id,
        work_title: newSongTitle.trim(),
        updated_by: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setSongs(prev => [data, ...prev]);
      setShowNewSongModal(false);
      setNewSongTitle('');
      navigate(`/song/${data.id}`);
    }

    setCreating(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/songhub/onboarding');
  };

  const switchBand = (band: Band) => {
    setCurrentBand(band);
    setShowBandMenu(false);
  };

  const goToOnboarding = () => {
    navigate('/songhub/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent">Loading...</div>
      </div>
    );
  }

  if (bands.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6">
          <Music className="w-16 h-16 text-primary-accent mx-auto" />
          <h1 className="text-2xl font-bold text-white">No Bands Yet</h1>
          <p className="text-white/50">Create or join a band to get started</p>
          <button
            onClick={goToOnboarding}
            className="px-6 py-3 bg-primary-accent text-black rounded-xl font-semibold"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  const currentMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">SongHub</h1>
            
            {/* Band Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBandMenu(!showBandMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="text-sm text-white/80">{currentBand?.name}</span>
                {hasNewContent && (
                  <span className="w-2 h-2 bg-primary-accent rounded-full" />
                )}
                <MoreVertical className="w-4 h-4 text-white/50" />
              </button>

              {showBandMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 space-y-1">
                    {bands.map(band => (
                      <button
                        key={band.id}
                        onClick={() => switchBand(band)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          band.id === currentBand?.id ? 'bg-primary-accent/20 text-primary-accent' : 'hover:bg-white/5 text-white/70'
                        }`}
                      >
                        {band.name}
                        {band.id === currentBand?.id && <ChevronRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/10 p-2 space-y-1">
                    <button
                      onClick={goToOnboarding}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Band
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-white/60" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-accent text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
                          setUnreadCount(0);
                          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                        }}
                        className="text-xs text-primary-accent hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-white/40 text-center py-4">No notifications yet</p>
                    ) : (
                      notifications.map(notification => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            if (!notification.is_read) {
                              supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
                              setUnreadCount(prev => Math.max(0, prev - 1));
                              setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                            }
                            navigate(`/song/${notification.song_id}`);
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                            notification.is_read ? 'opacity-60' : 'bg-primary-accent/5'
                          }`}
                        >
                          <p className="text-sm text-white">
                            <span className="font-medium text-primary-accent">{notification.from_user_name}</span>
                            {' '}{notification.message}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {members.slice(0, 4).map(member => (
                <img
                  key={member.id}
                  src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.user_name || 'U'}&background=00ff00&color=000&size=32`}
                  alt={member.user_name || 'Member'}
                  title={`${member.user_name || 'Unknown'} (${member.role})`}
                  className="w-8 h-8 rounded-full border border-white/10"
                />
              ))}
              {members.length > 4 && (
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                  +{members.length - 4}
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => {}}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Band Settings"
              >
                <Settings className="w-5 h-5 text-white/60" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Songs
              {hasNewContent && (
                <span className="px-2 py-0.5 bg-primary-accent/20 text-primary-accent text-xs rounded-full">
                  Updated
                </span>
              )}
            </h2>
            <p className="text-sm text-white/40">
              {songs.length} song{songs.length !== 1 ? 's' : ''} in this band
            </p>
          </div>
          <button
            onClick={() => setShowNewSongModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-accent text-black rounded-lg font-medium hover:bg-primary-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Song
          </button>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 mb-4">No songs yet</p>
            <button
              onClick={() => setShowNewSongModal(true)}
              className="text-primary-accent hover:underline text-sm"
            >
              Create your first song
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {songs.map(song => {
              const isOwner = song.created_by === user?.id;
              const updatedBy = members.find(m => m.user_id === song.updated_by);
              
              return (
                <button
                  key={song.id}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-white group-hover:text-primary-accent transition-colors">
                      {song.work_title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isOwner ? 'bg-primary-accent/20 text-primary-accent' : 'bg-white/10 text-white/50'
                    }`}>
                      {isOwner ? 'Owner' : 'View Only'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{song.audio_files?.length || 0} audio files</span>
                    <span>{song.lyrics ? 'Has lyrics' : 'No lyrics'}</span>
                  </div>
                  
                  <p className="text-xs text-white/30 mt-3">
                    Updated by {updatedBy?.user_name || 'Unknown'} • {new Date(song.updated_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* New Song Modal */}
      {showNewSongModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-secondary border border-white/10 w-full max-w-sm p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Song</h3>
            <form onSubmit={createSong} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2 block">
                  Work Title
                </label>
                <input
                  type="text"
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  placeholder="Enter a working title"
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-accent/50"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSongModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSongTitle.trim() || creating}
                  className="flex-1 px-4 py-2 bg-primary-accent text-black rounded-xl font-medium hover:bg-primary-accent/90 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
