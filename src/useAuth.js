import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useAuth() {
  const cachedRole = localStorage.getItem('st_role');
  const cachedUserStr = localStorage.getItem('st_user');

  const [user, setUser] = useState(cachedUserStr ? JSON.parse(cachedUserStr) : null);
  const [role, setRole] = useState(cachedRole || null);
  const [loading, setLoading] = useState(!cachedRole); // if cached, skip loading

  useEffect(() => {
    // If already cached, just verify session in background
    if (cachedRole && cachedUserStr) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session:', session);

        if (session?.user) {
          // Try profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          console.log('Profile:', profile, 'Error:', error);

          const userRole = profile?.role || 'tourist';
          setUser(session.user);
          setRole(userRole);
          localStorage.setItem('st_user', JSON.stringify(session.user));
          localStorage.setItem('st_role', userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Auth error:', err);
        // Fallback — don't leave user stuck
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false); // ALWAYS stop loading
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        localStorage.removeItem('st_user');
        localStorage.removeItem('st_role');
        setLoading(false);
        return;
      }
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const userRole = profile?.role || 'tourist';
        setUser(session.user);
        setRole(userRole);
        localStorage.setItem('st_user', JSON.stringify(session.user));
        localStorage.setItem('st_role', userRole);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}