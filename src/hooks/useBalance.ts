import { useState, useEffect, useCallback } from 'react';
import { checkUSDCBalance } from '../services/polymarketTrading';
import { web3Provider } from '../services/web3Provider';

interface BalanceData {
  balance: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isLowBalance: boolean;
  isSufficientFor: (amount: number) => boolean;
}

const LOW_BALANCE_THRESHOLD = 10;

export function useBalance(
  walletAddress: string | null,
  autoRefresh: boolean = true,
  refreshInterval: number = 15000
): BalanceData {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0);
      setError(null);
      setLastUpdated(null);
      return;
    }

    const connection = web3Provider.getConnection();
    if (!connection || connection.status !== 'connected') {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await checkUSDCBalance(walletAddress);
      setBalance(result.balance);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (!autoRefresh || !walletAddress) return;

    const intervalId = setInterval(fetchBalance, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, walletAddress, refreshInterval, fetchBalance]);

  useEffect(() => {
    const unsubscribe = web3Provider.subscribe((connection) => {
      if (connection?.status === 'connected' && walletAddress) {
        fetchBalance();
      } else if (connection?.status === 'disconnected') {
        setBalance(0);
        setError('Wallet disconnected');
        setLastUpdated(null);
      }
    });

    return unsubscribe;
  }, [walletAddress, fetchBalance]);

  const isSufficientFor = useCallback((amount: number): boolean => {
    return balance >= amount;
  }, [balance]);

  return {
    balance,
    isLoading,
    error,
    lastUpdated,
    isLowBalance: balance > 0 && balance < LOW_BALANCE_THRESHOLD,
    isSufficientFor
  };
}

export function formatBalance(balance: number, decimals: number = 2): string {
  if (balance === 0) return '0.00';
  if (balance < 0.01) return '<0.01';

  return balance.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function getBalanceStatus(balance: number): {
  status: 'good' | 'low' | 'critical' | 'zero';
  message: string;
  color: string;
} {
  if (balance === 0) {
    return {
      status: 'zero',
      message: 'No balance. Deposit USDC to start trading.',
      color: 'text-red-600'
    };
  }

  if (balance < 5) {
    return {
      status: 'critical',
      message: 'Critical: Balance too low for trading',
      color: 'text-red-600'
    };
  }

  if (balance < LOW_BALANCE_THRESHOLD) {
    return {
      status: 'low',
      message: 'Low balance. Consider depositing more USDC.',
      color: 'text-yellow-600'
    };
  }

  return {
    status: 'good',
    message: 'Balance sufficient',
    color: 'text-green-600'
  };
}
