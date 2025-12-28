import { useState, useEffect, useCallback } from 'react';
import { walletProviders, type WalletConnectionState, type WalletAccount } from '../services/walletProviders';
import { ethers } from 'ethers';

export function useWalletProviders() {
  const [state, setState] = useState<WalletConnectionState>(walletProviders.getState());
  const [isConnecting, setIsConnecting] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [maticBalance, setMaticBalance] = useState<string>('0');

  useEffect(() => {
    const unsubscribe = walletProviders.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.isConnected && state.account) {
      fetchBalances();
    }
  }, [state.isConnected, state.account?.address]);

  const connectMetaMask = useCallback(async () => {
    setIsConnecting(true);
    try {
      await walletProviders.connectMetaMask();
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectWalletConnect = useCallback(async (projectId?: string) => {
    setIsConnecting(true);
    try {
      await walletProviders.connectWalletConnect(projectId);
    } catch (error) {
      console.error('Failed to connect WalletConnect:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectPrivateKey = useCallback(async (privateKey: string) => {
    setIsConnecting(true);
    try {
      await walletProviders.connectWithPrivateKey(privateKey);
    } catch (error) {
      console.error('Failed to connect with private key:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await walletProviders.disconnect();
      setUsdcBalance('0');
      setMaticBalance('0');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }, []);

  const switchNetwork = useCallback(async (chainId: number = 137) => {
    try {
      return await walletProviders.switchNetwork(chainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, []);

  const signTransaction = useCallback(async (transaction: ethers.TransactionRequest) => {
    try {
      return await walletProviders.signTransaction(transaction);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }, []);

  const signMessage = useCallback(async (message: string) => {
    try {
      return await walletProviders.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }, []);

  const signTypedData = useCallback(async (
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ) => {
    try {
      return await walletProviders.signTypedData(domain, types, value);
    } catch (error) {
      console.error('Failed to sign typed data:', error);
      throw error;
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!state.account?.address) return;

    try {
      const [usdc, matic] = await Promise.all([
        walletProviders.getUSDCBalance(state.account.address),
        walletProviders.getBalance(state.account.address)
      ]);

      setUsdcBalance(parseFloat(usdc).toFixed(2));
      setMaticBalance(parseFloat(ethers.formatEther(matic)).toFixed(4));
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  }, [state.account?.address]);

  return {
    state,
    account: state.account,
    address: state.account?.address || null,
    providerType: state.providerType,
    chainId: state.chainId,
    isConnected: state.isConnected,
    isCorrectNetwork: walletProviders.isCorrectNetwork(),
    error: state.error,
    isConnecting,
    usdcBalance,
    maticBalance,
    connectMetaMask,
    connectWalletConnect,
    connectPrivateKey,
    disconnect,
    switchNetwork,
    signTransaction,
    signMessage,
    signTypedData,
    fetchBalances,
    getSigner: walletProviders.getSigner.bind(walletProviders),
    getProvider: walletProviders.getProvider.bind(walletProviders),
    formatAddress: walletProviders.formatAddress.bind(walletProviders),
  };
}
