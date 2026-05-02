import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Music, Users, ArrowRight, LogOut, AlertCircle } from 'lucide-react';
import { notifyBandOwner } from '../lib/notifications';


export function JoinBandPage() {
  const { code: pathCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const code = pathCode || searchParams.get('code');
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [band, setBand] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('No invite code provided');
      setLoading(false);
      return;
    }

    const fetchBand = async () => {
      try {
        console.log('Fetching band for invite code:', code);
        const { data, error } = await supabase
          .from('hub_bands')
          .select('id, name')
          .eq('invite_code', code)
          .maybeSingle();

        console.log('Band fetch result:', { data, error });

        if (error || !data) {
          console.error('Band fetch error:', error);
          setError('Invalid or expired invite link');
        } else {
          setBand(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching band:', err);
        setError('Failed to load band information');
      } finally {
        setLoading(false);
      }
    };

    fetchBand();
  }, [code]);

  const handleJoinBand = async () => {
    if (!user || !band || !code) {
      console.error('Missing required data:', { user: !!user, band: !!band, code: !!code });
      return;
    }

    setJoining(true);
    setError('');

    try {
      console.log('Joining band with invite code:', code);
      // Call the Edge Function to join the band
      const { data, error } = await supabase.functions.invoke('join-band', {
        body: { invite_code: code }
      });

      console.log('Join band result:', { data, error });

      if (error) throw error;

      setJoined(true);
      // Notify owner
      await notifyBandOwner({
        bandId: data.band_id,
        type: 'join',
        message: `${user?.user_metadata?.full_name || user?.email || 'Someone'} joined your band!`,
        fromUserId: user!.id,
        fromUserName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'A member',
      });

      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Join band error:', err);
      setError(err.message || 'Failed to join band');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent">Loading...</div>
      </div>
    );
  }

  if (error && !band) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Invite Link Invalid</h1>
          <p className="text-white/50 text-sm">{error}</p>
          <button
            onClick={() => navigate('/songhub/onboarding')}
            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Not logged in - must sign in first
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-accent/20 to-primary-accent/5 border border-primary-accent/20">
              <Users className="w-8 h-8 text-primary-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white">Join {band?.name}</h1>
            <p className="text-white/50 text-sm">
              Sign in with Google to join this band and start collaborating
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
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
              Sign in with Google to Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already joined
  if (joined) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30">
            <Music className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">You're In!</h1>
          <p className="text-white/50">Welcome to {band?.name}. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Logged in - show join confirmation
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-accent/20 to-primary-accent/5 border border-primary-accent/20">
            <Users className="w-8 h-8 text-primary-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join {band?.name}</h1>
          <p className="text-white/50 text-sm">
            Join this band to collaborate on songs with your bandmates
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
            <img
              src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=00ff00&color=000`}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            onClick={handleJoinBand}
            disabled={joining}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-accent text-black rounded-xl font-semibold hover:bg-primary-accent/90 transition-all duration-300 disabled:opacity-50"
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
