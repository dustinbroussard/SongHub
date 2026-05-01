import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Music, Users, Settings, LogOut, ChevronRight, MoreVertical } from 'lucide-react';
import type { Database } from '../types/database';

type Band = Database['public']['Tables']['hub_bands']['Row'];
type Idea = Database['public']['Tables']['hub_new_ideas']['Row'];
type BandMember = Database['public']['Tables']['hub_band_members']['Row'];

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [bands, setBands] = useState<Band[]>([]);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showBandMenu, setShowBandMenu] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Fetch user's bands and select first one
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
          setCurrentBand(bandsData[0]);
        }
      }
      setLoading(false);
    };

    fetchBands();
  }, [user]);

  // Fetch ideas and members when band changes
  useEffect(() => {
    if (!currentBand || !user) return;

    const fetchBandData = async () => {
      // Check if current user is owner
      setIsOwner(currentBand.owner_id === user.id);

      // Fetch ideas
      const { data: ideasData } = await supabase
        .from('hub_new_ideas')
        .select('*')
        .eq('band_id', currentBand.id)
        .order('updated_at', { ascending: false });

      if (ideasData) {
        setIdeas(ideasData);
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from('hub_band_members')
        .select('*')
        .eq('band_id', currentBand.id);

      if (membersData) {
        setMembers(membersData);
      }
    };

    fetchBandData();
  }, [currentBand, user]);

  const createIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() || !currentBand || !user) return;

    setCreating(true);
    
    const { data, error } = await supabase
      .from('hub_new_ideas')
      .insert({
        band_id: currentBand.id,
        created_by: user.id,
        title: newIdeaTitle.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setIdeas(prev => [data, ...prev]);
      setShowNewIdeaModal(false);
      setNewIdeaTitle('');
      navigate(`/idea/${data.id}`);
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
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 text-white/50 rounded-xl hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Ideas
            </h2>
            <p className="text-sm text-white/40">
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''} in this band
            </p>
          </div>
          <button
            onClick={() => setShowNewIdeaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-accent text-black rounded-lg font-medium hover:bg-primary-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Idea
          </button>
        </div>

        {ideas.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 mb-4">No ideas yet</p>
            <button
              onClick={() => setShowNewIdeaModal(true)}
              className="text-primary-accent hover:underline text-sm"
            >
              Create your first idea
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map(idea => {
              const isIdeaOwner = idea.created_by === user?.id;
              
              return (
                <button
                  key={idea.id}
                  onClick={() => navigate(`/idea/${idea.id}`)}
                  className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-white group-hover:text-primary-accent transition-colors">
                      {idea.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isIdeaOwner ? 'bg-primary-accent/20 text-primary-accent' : 'bg-white/10 text-white/50'
                    }`}>
                      {isIdeaOwner ? 'Owner' : 'View Only'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{idea.tempo || '-'} BPM</span>
                    <span>{idea.key || '-'}</span>
                    <span>{idea.lyrics ? 'Has lyrics' : 'No lyrics'}</span>
                  </div>
                  
                  <p className="text-xs text-white/30 mt-3">
                    Updated {new Date(idea.updated_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* New Idea Modal */}
      {showNewIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-secondary border border-white/10 w-full max-w-sm p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Idea</h3>
            <form onSubmit={createIdea} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2 block">
                  Title
                </label>
                <input
                  type="text"
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-accent/50"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewIdeaModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newIdeaTitle.trim() || creating}
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
