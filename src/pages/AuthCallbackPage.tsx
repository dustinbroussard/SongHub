import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Get the session - Supabase automatically handles the code exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // No session yet, wait a bit and retry
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              navigate('/songhub/onboarding', { replace: true });
            } else {
              setError('Authentication failed. Please try again.');
            }
          }, 500);
          return;
        }

        // Successfully authenticated, redirect to onboarding
        navigate('/songhub/onboarding', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => navigate('/songhub/onboarding')}
            className="px-6 py-3 bg-primary-accent text-black rounded-xl font-medium"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-accent/30 border-t-primary-accent rounded-full animate-spin mx-auto" />
        <p className="text-white/60">Completing sign in...</p>
      </div>
    </div>
  );
}
