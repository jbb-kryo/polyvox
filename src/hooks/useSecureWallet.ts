import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useSecureWallet() {
  const { profile, getDecryptedPrivateKey } = useAuth();
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: string | null) => void) | null>(null);

  const requestPrivateKey = useCallback((): Promise<string | null> => {
    if (!profile?.encrypted_private_key) {
      return Promise.resolve(null);
    }

    if (decryptedKey) {
      return Promise.resolve(decryptedKey);
    }

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
      setPromptOpen(true);
    });
  }, [profile, decryptedKey]);

  const handlePasswordSubmit = useCallback(async (password: string): Promise<boolean> => {
    try {
      const key = await getDecryptedPrivateKey(password);
      if (key) {
        setDecryptedKey(key);
        setPromptOpen(false);
        if (resolvePromise) {
          resolvePromise(key);
          setResolvePromise(null);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to decrypt private key');
      return false;
    }
  }, [getDecryptedPrivateKey, resolvePromise]);

  const handlePasswordCancel = useCallback(() => {
    setPromptOpen(false);
    if (resolvePromise) {
      resolvePromise(null);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const clearPrivateKey = useCallback(() => {
    setDecryptedKey(null);
  }, []);

  const hasWallet = !!profile?.wallet_address;
  const walletAddress = profile?.wallet_address || null;

  return {
    requestPrivateKey,
    clearPrivateKey,
    promptOpen,
    handlePasswordSubmit,
    handlePasswordCancel,
    hasWallet,
    walletAddress,
  };
}
