import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

type AuthContextType = {
  session: Session | null;
  initialized: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  initialized: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  // Track whether we've completed initial session load so we don't
  // trigger a redirect on the very first null state before hydration.
  const initializedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
      initializedRef.current = true;
    });

    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          const params: Record<string, string> = {};
          hash.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          });
          
          if (params.access_token && params.refresh_token) {
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
          }
        }
      } catch (err) {
        console.error("Deep link parse error", err);
      }
    };

    const linkSubscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    Linking.getInitialURL().then((url) => handleDeepLink(url));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // After initialization, a null session means the user logged out or
      // the token expired — redirect them to login immediately.
      if (initializedRef.current && !session) {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener above will handle the redirect.
  };

  return (
    <AuthContext.Provider value={{ session, initialized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
