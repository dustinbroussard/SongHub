import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Music, Users, ArrowRight, Copy, Check, LogOut } from 'lucide-react';
import { generateInviteCode } from '../lib/utils';

export function OnboardingPage() {
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bandName, setBandName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdBand, setCreatedBand] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [checkingBands, setCheckingBands] = useState(true);
  const [isInBand, setIsInBand] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleCreateBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandName.trim() || !user) return;

    setCreating(true);
    setError('');

    try {
      const inviteCode = generateInviteCode();
      
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({
          name: bandName.trim(),
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (bandError || !band) throw bandError || new Error('Failed to create band');

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('band_members')
        .insert({
          band_id: band.id,
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'admin',
        });

      if (memberError) throw memberError;

      setCreatedBand(band);
    } catch (err: any) {
      setError(err.message || 'Failed to create band');
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = () => {
    if (!createdBand) return;
    const link = `${window.location.origin}/join/${createdBand.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const handleJoinBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setJoining(true);
    setError('');

    try {
      // Find band by invite code
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (bandError || !band) {
        throw new Error('Invalid invite code');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('band_members')
        .select('id')
        .eq('band_id', band.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        navigate('/dashboard');
        return;
      }

      // Add as member
      const { error: joinError } = await supabase
        .from('band_members')
        .insert({
          band_id: band.id,
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'member',
        });

      if (joinError) throw joinError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to join band');
    } finally {
      setJoining(false);
    }
  };

  // Check if user is already in a band
  useEffect(() => {
    if (!user) {
      setCheckingBands(false);
      return;
    }

    const checkBandMembership = async () => {
      setCheckingBands(true);
      
      const { data: memberBands, error } = await supabase
        .from('band_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!error && memberBands && memberBands.length > 0) {
        setIsInBand(true);
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        setIsInBand(false);
        setCheckingBands(false);
      }
    };

    checkBandMembership();
  }, [user, navigate]);

  // Show loading spinner while checking auth or band membership
  if (authLoading || checkingBands) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-accent/30 border-t-primary-accent rounded-full animate-spin mx-auto" />
          <p className="text-white/60">{authLoading ? 'Checking session...' : 'Checking your bands...'}</p>
        </div>
      </div>
    );
  }

  // Not logged in - show sign in
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-accent/20 to-primary-accent/5 border border-primary-accent/20">
              <Music className="w-8 h-8 text-primary-accent" />
            </div>
            <h1 className="text-3xl font-bold text-white">SongHub</h1>
            <p className="text-white/50 text-sm">
              A collaborative workspace for songwriters. Create, share, and develop songs together with your band.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-semibold text-white">Get Started</h2>
              <p className="text-xs text-white/40">Sign in with Google to create or join a band</p>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-white/90 transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          <p className="text-center text-xs text-white/30">
            Your Google profile will be shared across SongHub and SongBinder
          </p>
        </div>
      </div>
    );
  }

  // Logged in but just created a band - show invite link
  if (createdBand) {
    const inviteLink = `${window.location.origin}/join/${createdBand.invite_code}`;

    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Band Created!</h1>
            <p className="text-white/50 text-sm">
              "{createdBand.name}" is ready. Share this link with your bandmates:
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
              <code className="flex-1 text-xs text-primary-accent truncate">{inviteLink}</code>
              <button
                onClick={copyInviteLink}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
              </button>
            </div>

            <button
              onClick={goToDashboard}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-accent text-black rounded-xl font-semibold hover:bg-primary-accent/90 transition-all duration-300"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-white/50 rounded-xl hover:bg-white/5 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Logged in - show create or join band options
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-accent/20 to-primary-accent/5 border border-primary-accent/20">
            <Music className="w-8 h-8 text-primary-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to SongHub</h1>
          <p className="text-white/50 text-sm">
            Create a band or join an existing one to start collaborating
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-primary-accent text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Create Band
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'join'
                ? 'bg-primary-accent text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Join Band
          </button>
        </div>

        {/* Create Band Form */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateBand} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="bandName" className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Band Name
              </label>
              <input
                id="bandName"
                type="text"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="Enter your band name"
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-accent/50"
                maxLength={50}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={!bandName.trim() || creating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-accent text-black rounded-xl font-semibold hover:bg-primary-accent/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Create Band
                </>
              )}
            </button>
          </form>
        )}

        {/* Join Band Form */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinBand} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="inviteCode" className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code (e.g., ABC12345)"
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary-accent/50 uppercase"
                maxLength={8}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={!inviteCode.trim() || joining}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-accent text-black rounded-xl font-semibold hover:bg-primary-accent/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Join Band
                </>
              )}
            </button>
          </form>
        )}

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-white/50 rounded-xl hover:bg-white/5 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
