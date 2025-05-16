'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct
import type { User } from '@supabase/supabase-js'; // Removed unused Session import

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        router.push('/login'); // Redirect on error as well, or handle differently
        return;
      }

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        router.push('/login');
      }
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          // Only redirect if not already on login page to avoid loop
          // and if the event is SIGNED_OUT etc.
          if (event === 'SIGNED_OUT') {
             if (window.location.pathname !== '/login') {
                router.push('/login');
             }
          } else if (!session?.user && window.location.pathname !== '/login') {
            // If session becomes null for other reasons and not on login, redirect
            router.push('/login');
          }
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>; // Or a proper loading spinner
  }

  if (!user) {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback or if router.push hasn't completed.
    // router.push('/login') might have already been called.
    // Returning null or a loading indicator here can prevent rendering children if user is null.
    return null; // Or redirect again, though useEffect should handle it.
  }

  return <>{children}</>;
};

export default AuthGuard;