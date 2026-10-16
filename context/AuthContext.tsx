'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getInitialsAvatar } from '@/lib/avatarHelper';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  signInBypass: (email?: string, name?: string) => Promise<Profile | null>;
  playSound: (type: 'click' | 'chime' | 'streak' | 'success' | 'call') => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
  signInBypass: async () => null,
  playSound: () => {},
  lang: 'en',
  setLang: () => {},
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Singleton AudioContext shared across all UI interactions to eliminate latency
let globalAudioCtx: AudioContext | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<'fr' | 'en'>('en');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  const setProfile = useCallback((newProfile: Profile | null | ((prev: Profile | null) => Profile | null)) => {
    setProfileState((prev) => {
      const resolved = typeof newProfile === 'function' ? newProfile(prev) : newProfile;
      if (typeof window !== 'undefined') {
        try {
          if (resolved) {
            localStorage.setItem('eb_cached_profile', JSON.stringify(resolved));
          } else {
            localStorage.removeItem('eb_cached_profile');
          }
        } catch {}
      }
      return resolved;
    });
  }, []);

  const supabase = createClient();

  const applyTheme = () => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  };

  // Load language, cached profile, and enforce permanent dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('eb_cached_profile');
        if (cached) setProfileState(JSON.parse(cached));
      } catch {}

      // Enforce English mode exclusively as requested
      setLangState('en');
      localStorage.setItem('eb_lang', 'en');
      document.documentElement.lang = 'en';

      // Clean up any heavy video base64 payloads from localStorage to eliminate browser UI thread freeze
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('eb_status_video_') || key === 'eb_last_published_video')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}

      // Force Dark Mode permanently
      localStorage.removeItem('eb_theme');
      setThemeState('dark');
      applyTheme();
    }
  }, []);

  const setLang = (newLang: 'fr' | 'en') => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('eb_lang', newLang);
      document.documentElement.lang = newLang;
    }
  };

  const setTheme = (_newTheme?: 'dark' | 'light') => {
    setThemeState('dark');
    applyTheme();
  };

  const toggleTheme = () => {
    setThemeState('dark');
    applyTheme();
  };

  // Module-level AudioContext singleton for zero-latency instant sound feedback
  const playSound = useCallback((type: 'click' | 'chime' | 'streak' | 'success' | 'call') => {
    if (typeof window === 'undefined') return;
    try {
      if (!globalAudioCtx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        globalAudioCtx = new AudioCtx();
      }

      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume().catch(() => {});
      }

      const ctx = globalAudioCtx;
      const now = ctx.currentTime;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch {}
        };
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'chime' || type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const t = now + i * 0.06;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.onended = () => {
            try { osc.disconnect(); gain.disconnect(); } catch {}
          };
          osc.start(t);
          osc.stop(t + 0.28);
        });
      } else if (type === 'streak') {
        const chord = [440, 554.37, 659.25];
        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.onended = () => {
            try { osc.disconnect(); gain.disconnect(); } catch {}
          };
          osc.start(now);
          osc.stop(now + 0.4);
        });
      } else if (type === 'call') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.9);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.onended = () => {
          try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch {}
        };
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
      }
    } catch {
      // AudioContext might be blocked before first user gesture
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // If profile doesn't exist yet, insert with truthful metadata
        const meta = user?.user_metadata || {};
        const userEmail = (user?.email || '').toLowerCase();
        const isFounderUser = userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com';
        const fullName = (meta.full_name as string) || (meta.name as string) || (isFounderUser ? 'Tychique Bongo' : (userEmail ? userEmail.split('@')[0] : 'English Learner'));
        const googleAvatar = (meta.avatar_url as string) || (meta.picture as string);

        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user?.email || null,
            full_name: fullName,
            country: isFounderUser ? "Côte d'Ivoire" : ((meta.country as string) || 'France'),
            flag: isFounderUser ? '🇨🇮' : ((meta.flag as string) || '🇫🇷'),
            current_level: isFounderUser ? 'C2' : ((meta.current_level as string) || 'B1'),
            target_level: isFounderUser ? 'C2' : ((meta.target_level as string) || 'C1'),
            avatar_url: isFounderUser ? '/assets/images/tychique-bongo.jpg' : (googleAvatar || getInitialsAvatar(fullName)),
            role: isFounderUser ? 'admin' : 'student',
            plan: isFounderUser ? 'admin' : 'free',
            plan_status: 'active',
            is_online: true,
            xp: 0,
            streak: 0,
            minutes_spoken: 0,
            bio: isFounderUser ? "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public." : null,
          })
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      } else if (data) {
        const userEmail = (user?.email || data.email || '').toLowerCase();
        const isFounder = userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com' || data.role === 'admin';
        
        if (isFounder) {
          const needsFix = data.country === 'France' || data.current_level === 'B1' || data.plan === 'free' || (data.bio && data.bio.includes('Learning English to communicate'));
          if (needsFix) {
            const realFounderData = {
              full_name: 'Tychique Bongo',
              country: "Côte d'Ivoire",
              flag: '🇨🇮',
              current_level: 'C2',
              target_level: 'C2',
              plan: 'admin',
              role: 'admin',
              bio: "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public."
            };
            supabase.from('profiles').update(realFounderData).eq('id', userId).then(() => {});
            setProfile({ ...data, ...realFounderData });
            return;
          }
        }
        // Sanitize any legacy mock avatars or fill with Google picture if available
        const meta = user?.user_metadata || {};
        const googleAvatar = (meta.avatar_url as string) || (meta.picture as string);

        if (data.avatar_url && data.avatar_url.includes('/assets/avatars/')) {
          data.avatar_url = googleAvatar || null;
          supabase.from('profiles').update({ avatar_url: googleAvatar || null }).eq('id', userId).then(() => {});
        } else if (!data.avatar_url && googleAvatar) {
          data.avatar_url = googleAvatar;
          supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId).then(() => {});
        }

        // Automatically mark active user as online in database
        if (!data.is_online) {
          data.is_online = true;
          supabase.from('profiles').update({ is_online: true, updated_at: new Date().toISOString() }).eq('id', userId).then(() => {});
        }
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }, [supabase, user]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signInBypass = useCallback(async (targetEmail = 'tychiquebongo@gmail.com', targetName?: string): Promise<Profile | null> => {
    playSound('chime');
    const cleanEmail = targetEmail.trim().toLowerCase();
    const isFounder = cleanEmail === 'tychiquebongo@gmail.com' || cleanEmail === 'tychiquebong@gmail.com';
    const resolvedName = targetName || (isFounder ? 'Tychique Bongo' : (cleanEmail ? cleanEmail.split('@')[0] : 'English Learner'));

    let matchedProfile: Profile | null = null;
    let userId = isFounder ? '30c6222c-7d9e-4086-a289-19ca5b81262c' : `bypass-${Date.now()}`;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (data) {
        matchedProfile = data;
        userId = data.id;
      }
    } catch (err) {
      console.warn('Bypass profile lookup fallback:', err);
    }

    if (!matchedProfile) {
      matchedProfile = {
        id: userId,
        email: cleanEmail,
        full_name: resolvedName,
        country: isFounder ? "Côte d'Ivoire" : 'France',
        flag: isFounder ? '🇨🇮' : '🇫🇷',
        current_level: isFounder ? 'C2' : 'B1',
        target_level: isFounder ? 'C2' : 'C1',
        avatar_url: isFounder ? '/assets/images/tychique-bongo.jpg' : getInitialsAvatar(resolvedName),
        role: isFounder ? 'admin' : 'student',
        plan: isFounder ? 'admin' : 'free',
        plan_status: 'active',
        is_online: true,
        xp: isFounder ? 1500 : 100,
        streak: isFounder ? 14 : 1,
        minutes_spoken: isFounder ? 120 : 0,
        bio: isFounder ? "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public." : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;

      try {
        await supabase.from('profiles').upsert(matchedProfile);
      } catch {}
    }

    const mockUser: User = {
      id: userId,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: {
        full_name: matchedProfile.full_name,
        name: matchedProfile.full_name,
        avatar_url: matchedProfile.avatar_url,
        picture: matchedProfile.avatar_url,
        email: cleanEmail,
        email_verified: true,
      },
      aud: 'authenticated',
      confirmation_sent_at: new Date().toISOString(),
      recovery_sent_at: '',
      email_change_sent_at: '',
      new_email: '',
      invited_at: '',
      action_link: '',
      email: cleanEmail,
      phone: '',
      created_at: matchedProfile.created_at || new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: '',
      last_sign_in_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString(),
      identities: [],
      factors: [],
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eb_bypass_user', JSON.stringify(mockUser));
        localStorage.setItem('eb_cached_profile', JSON.stringify(matchedProfile));
      } catch {}
    }

    setUser(mockUser);
    setProfile(matchedProfile);
    setLoading(false);
    playSound('success');
    return matchedProfile;
  }, [playSound, setProfile, supabase]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user ?? null;

        // If no active Supabase OAuth session, check for active bypass user
        if (!currentUser && typeof window !== 'undefined') {
          const bypassJson = localStorage.getItem('eb_bypass_user');
          if (bypassJson) {
            try {
              currentUser = JSON.parse(bypassJson);
            } catch {}
          }
        }

        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser.id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        // If not explicit signOut, check if bypass is active
        const bypassJson = typeof window !== 'undefined' ? localStorage.getItem('eb_bypass_user') : null;
        if (!bypassJson) {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  // Realtime Presence Heartbeat & Disconnect cleanup
  useEffect(() => {
    if (!user?.id) return;

    // Immediately mark active in DB
    supabase
      .from('profiles')
      .update({ is_online: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {});

    // Periodic heartbeat every 30s while user has tab open
    const heartbeat = setInterval(() => {
      supabase
        .from('profiles')
        .update({ is_online: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});
    }, 30000);

    const handleBeforeUnload = () => {
      try {
        supabase
          .from('profiles')
          .update({ is_online: false, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .then(() => {});
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, supabase]);

  const signOut = async () => {
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ is_online: false, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {}
    }
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('eb_bypass_user');
        localStorage.removeItem('eb_cached_profile');
      } catch {}
    }
    setUser(null);
    setProfile(null);
    playSound('click');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const userEmail = (user?.email || '').toLowerCase();
  const isAdmin = profile?.role === 'admin' || userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com';

  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
    refreshProfile,
    signOut,
    signInBypass,
    playSound,
    lang,
    setLang,
    theme,
    setTheme,
    toggleTheme,
  }), [user, profile, loading, isAdmin, refreshProfile, signOut, signInBypass, playSound, lang, theme]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
