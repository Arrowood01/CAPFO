'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true); // Ensure loading is true at the start of check
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('AuthGuard: Error getting session:', error);
        // Don't redirect if already on login or if it's a public page that shouldn't be guarded
        if (pathname !== '/login') {
          router.push('/login');
        }
        setUser(null); // Explicitly set user to null on error
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser && pathname !== '/login') {
          // More robust check: if no user and not on login, redirect.
          // Specific event checks like 'SIGNED_OUT' are good but this is a catch-all.
          router.push('/login');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname]); // Add pathname to dependency array

  // If it's the login page, always render children once initial loading/session check is attempted.
  // This prevents the login page itself from being hidden by the guard.
  if (pathname === '/login') {
    if (loading && !user) { // Still show loading if initial check on login page is happening
        return <div className="flex justify-center items-center min-h-screen">Loading Auth...</div>;
    }
    return <>{children}</>; // Render login page content
  }

  // For other pages:
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading Auth...</div>;
  }

  if (!user) {
    // For protected routes, if no user and not loading, useEffect should have redirected.
    // Returning null here prevents rendering children on protected routes if redirect is pending.
    // This state should ideally be brief.
    console.log('AuthGuard: No user, not loading, not on /login. Path:', pathname); // For debugging
    return null;
  }

  return <>{children}</>; // User is authenticated, render protected content
};

export default AuthGuard;