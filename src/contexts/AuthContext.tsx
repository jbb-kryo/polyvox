import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  getCurrentUser,
  getCurrentSession,
  getUserProfile,
  updateUserProfile,
  onAuthStateChange,
  UserProfile,
  ProfileUpdateData,
  encryptPrivateKey,
  decryptPrivateKey,
} from '../services/auth';
import LegalAcceptanceModal from '../components/LegalAcceptanceModal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  needsLegalAcceptance: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  updateProfile: (updates: ProfileUpdateData) => Promise<{ error: any }>;
  setWalletCredentials: (
    walletAddress: string,
    privateKey: string,
    masterPassword: string
  ) => Promise<{ error: any }>;
  getDecryptedPrivateKey: (masterPassword: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);

  const checkLegalAcceptance = (userProfile: UserProfile | null) => {
    if (!userProfile) {
      setNeedsLegalAcceptance(false);
      return;
    }

    const needsAcceptance =
      !userProfile.terms_accepted_at ||
      !userProfile.privacy_accepted_at ||
      !userProfile.risk_disclaimer_acknowledged;

    setNeedsLegalAcceptance(needsAcceptance);
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await getUserProfile(user.id);
      setProfile(userProfile);
      checkLegalAcceptance(userProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        const currentUser = await getCurrentUser();

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.id);
          setProfile(userProfile);
          checkLegalAcceptance(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const userProfile = await getUserProfile(newSession.user.id);
        setProfile(userProfile);
        checkLegalAcceptance(userProfile);
      } else {
        setProfile(null);
        setNeedsLegalAcceptance(false);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        setNeedsLegalAcceptance(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: signedInUser, error } = await authSignIn(email, password);

    if (signedInUser && !error) {
      const userProfile = await getUserProfile(signedInUser.id);
      setProfile(userProfile);
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { user: newUser, error } = await authSignUp(email, password);

    if (newUser && !error) {
      const userProfile = await getUserProfile(newUser.id);
      setProfile(userProfile);
    }

    return { error };
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    return await authResetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await authUpdatePassword(newPassword);
  };

  const updateProfile = async (updates: ProfileUpdateData) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    const { data, error } = await updateUserProfile(user.id, updates);

    if (data && !error) {
      setProfile(data);
    }

    return { error };
  };

  const setWalletCredentials = async (
    walletAddress: string,
    privateKey: string,
    masterPassword: string
  ) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    try {
      const encrypted = await encryptPrivateKey(privateKey, masterPassword);

      const { error } = await updateProfile({
        wallet_address: walletAddress,
        encrypted_private_key: encrypted,
      });

      return { error };
    } catch (error) {
      console.error('Error encrypting private key:', error);
      return { error: { message: 'Failed to encrypt private key' } };
    }
  };

  const getDecryptedPrivateKey = async (masterPassword: string): Promise<string | null> => {
    if (!profile?.encrypted_private_key) {
      return null;
    }

    try {
      return await decryptPrivateKey(profile.encrypted_private_key, masterPassword);
    } catch (error) {
      console.error('Error decrypting private key:', error);
      return null;
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    needsLegalAcceptance,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    setWalletCredentials,
    getDecryptedPrivateKey,
    refreshProfile,
  };

  const handleLegalAcceptance = async () => {
    await refreshProfile();
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsLegalAcceptance && user && (
        <LegalAcceptanceModal
          isOpen={needsLegalAcceptance}
          onAccept={handleLegalAcceptance}
          userId={user.id}
        />
      )}
    </AuthContext.Provider>
  );
}
