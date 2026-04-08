import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Extended user type that includes Firebase user info
interface ExtendedUser extends User {
  firebaseUid?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to get or create Supabase user from Firebase user
  const getOrCreateSupabaseUser = async (firebaseUser: FirebaseUser): Promise<ExtendedUser | null> => {
    try {
      // Check if we already have a mapping for this Firebase user
      const { data: existingMapping } = await supabase
        .from('user_mappings')
        .select('supabase_user_id')
        .eq('firebase_uid', firebaseUser.uid)
        .single();

      if (existingMapping) {
        // Get the Supabase user
        const { data: supabaseUser } = await supabase.auth.admin.getUserById(existingMapping.supabase_user_id);
        if (supabaseUser.user) {
          return { ...supabaseUser.user, firebaseUid: firebaseUser.uid } as ExtendedUser;
        }
      }

      // No mapping exists, create a new Supabase user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: firebaseUser.email!,
        password: `firebase_${firebaseUser.uid}_${Date.now()}`, // Generate a secure password
        options: {
          data: {
            full_name: firebaseUser.displayName || firebaseUser.email,
          },
        },
      });

      if (signUpError) {
        console.error('Error creating Supabase user:', signUpError);
        return null;
      }

      if (signUpData.user) {
        // Create the mapping
        await supabase.from('user_mappings').insert({
          firebase_uid: firebaseUser.uid,
          supabase_user_id: signUpData.user.id,
        });

        return { ...signUpData.user, firebaseUid: firebaseUser.uid } as ExtendedUser;
      }

      return null;
    } catch (error) {
      console.error('Error in getOrCreateSupabaseUser:', error);
      return null;
    }
  };

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user signed in, get/create corresponding Supabase user
        const supabaseUser = await getOrCreateSupabaseUser(firebaseUser);
        setUser(supabaseUser);
      } else {
        // Firebase user signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Also listen to Supabase auth state for email/password users
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !session.user.app_metadata?.firebase_uid) {
        // This is a direct Supabase user (email/password)
        const validatedUser = isValidUuid(session.user.id) ? session.user : null;
        setUser(validatedUser);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeFirebase();
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Firebase auth state change will handle the rest
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
