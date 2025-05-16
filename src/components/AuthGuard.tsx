'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  console.log('AuthGuard: Component rendering/re-rendering. Path:', usePathname()); // Initial log

  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthGuard useEffect: Running. Path:', pathname);

    const checkSession = async () => {
      console.log('AuthGuard useEffect: checkSession started.');
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('AuthGuard useEffect: Error getting session:', error);
        setUser(null);
        if (pathname !== '/login') {
          console.log('AuthGuard useEffect: Error, not on login, redirecting to /login.');
          router.push('/login');
        } else {
          console.log('AuthGuard useEffect: Error, already on /login.');
        }
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('AuthGuard useEffect: Session found, user ID:', session.user.id);
        setUser(session.user);
      } else {
        console.log('AuthGuard useEffect: No session/user found.');
        setUser(null);
        if (pathname !== '/login') {
          console.log('AuthGuard useEffect: No session, not on login, redirecting to /login.');
          router.push('/login');
        } else {
          console.log('AuthGuard useEffect: No session, already on /login.');
        }
      }
      setLoading(false);
      console.log('AuthGuard useEffect: checkSession finished. Loading:', false, 'User:', session?.user?.id || null);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthGuard onAuthStateChange: Event:', event, 'Session User ID:', session?.user?.id || null);
        setLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser && pathname !== '/login') {
          console.log('AuthGuard onAuthStateChange: No user, not on login, redirecting to /login.');
          router.push('/login');
        }
        setLoading(false);
        console.log('AuthGuard onAuthStateChange: Finished. Loading:', false, 'User:', currentUser?.id || null);
      }
    );

    return () => {
      console.log('AuthGuard useEffect: Unsubscribing auth listener.');
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (pathname === '/login') {
    console.log('AuthGuard render: Path is /login. Loading:', loading, 'User:', user?.id || null);
    if (loading && !user) {
      console.log('AuthGuard render: Path /login, loading and no user, showing Loading Div.');
      return <div className="flex justify-center items-center min-h-screen">AuthGuard: Loading Login Page...</div>;
    }
    console.log('AuthGuard render: Path /login, rendering children (login page).');
    return <>{children}</>;
  }

  if (loading) {
    console.log('AuthGuard render: Path not /login, loading, showing Loading Div. Path:', pathname);
    return <div className="flex justify-center items-center min-h-screen">AuthGuard: Loading Protected Page...</div>;
  }

  if (!user) {
    console.log('AuthGuard render: Path not /login, not loading, no user! Path:', pathname, 'SHOULD HAVE REDIRECTED. Rendering fallback div.');
    return <div className="flex justify-center items-center min-h-screen">AuthGuard: No user authenticated. Redirecting... (If you see this, redirect might have failed)</div>;
  }

  console.log('AuthGuard render: Path not /login, not loading, user exists. Rendering children. Path:', pathname, 'User ID:', user.id);
  return <>{children}</>;
};

export default AuthGuard;