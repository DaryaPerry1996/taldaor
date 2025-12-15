import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // 🔹 Normalize email (so it matches how it's stored in approved_emails)
    const normalizedEmail = email.trim().toLowerCase();

    // 🔹 1. Check if the email is in approved_emails
    const { data: approvalRecord, error: approvalError } = await supabase
      .from('approved_emails')
      .select('Admin')//why check admin column here?
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (approvalError) {
      console.error('Error checking approved_emails:', approvalError);
      return { error: approvalError };
    }

    // 🔹 2. If not found in approved_emails → block signup
    if (!approvalRecord) {
      const customError = { message: 'This email is not approved for signup.' };
      return { error: customError };
    }

    // 🔹 3. Decide role based on the admin column
    // if admin === true → 'admin', else 'tenant'
    const role = approvalRecord.Admin ? 'admin' : 'tenant';

    // 🔹 4. Create the auth user with the correct role in metadata
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { role }, // stored in user.user_metadata.role
      },
    });

    if (error) {
      return { error };
    }
    
    
    // 🔹 5. Insert corresponding profile row with the same role
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert(
  { id: data.user.id, email: normalizedEmail, role },
  { onConflict: 'id' }
);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
