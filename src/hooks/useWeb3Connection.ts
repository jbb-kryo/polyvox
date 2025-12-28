import { useState, useEffect, useCallback } from 'react';
import { web3Provider, type Web3Connection, type ConnectionStatus } from '../services/web3Provider';

export function useWeb3Connection() {
  const [connection, setConnection] = useState<Web3Connection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = web3Provider.subscribe((conn) => {
      setConnection(conn);
      if (conn?.error) {
        setError(conn.error);
      } else {
        setError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connectRPC = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await web3Provider.connectWithRPC();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await web3Provider.connectWithInjectedWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      setError(null);
      const success = await web3Provider.switchToPolygon();
      if (!success) {
        setError('Failed to switch network');
      }
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch network';
      setError(errorMsg);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    web3Provider.disconnect();
    setError(null);
  }, []);

  const reconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await web3Provider.reconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const getGasEstimate = useCallback(async () => {
    try {
      return await web3Provider.getGasEstimate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate gas');
      throw err;
    }
  }, []);

  const waitForTransaction = useCallback(async (
    txHash: string,
    confirmations?: number,
    timeout?: number
  ) => {
    try {
      return await web3Provider.waitForTransaction(txHash, confirmations, timeout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      throw err;
    }
  }, []);

  const verifyNetwork = useCallback(async () => {
    try {
      return await web3Provider.verifyNetwork();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify network');
      return false;
    }
  }, []);

  const getBalance = useCallback(async (address: string) => {
    try {
      return await web3Provider.getBalance(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get balance');
      throw err;
    }
  }, []);

  const healthCheck = useCallback(async () => {
    try {
      return await web3Provider.healthCheck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
      throw err;
    }
  }, []);

  const ensureConnection = useCallback(async () => {
    try {
      await web3Provider.ensureConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure connection');
      throw err;
    }
  }, []);

  return {
    connection,
    provider: connection?.provider,
    signer: connection?.signer,
    connectionType: connection?.type,
    status: connection?.status || 'disconnected' as ConnectionStatus,
    chainId: connection?.chainId,
    isConnected: web3Provider.isConnected(),
    isWrongNetwork: web3Provider.isWrongNetwork(),
    isConnecting,
    error,
    connectRPC,
    connectWallet,
    switchNetwork,
    disconnect,
    reconnect,
    getGasEstimate,
    waitForTransaction,
    verifyNetwork,
    getBalance,
    healthCheck,
    ensureConnection,
    formatMatic: web3Provider.formatMatic.bind(web3Provider),
    parseMatic: web3Provider.parseMatic.bind(web3Provider),
    getRpcEndpoint: web3Provider.getRpcEndpoint.bind(web3Provider),
    getAvailableRpcEndpoints: web3Provider.getAvailableRpcEndpoints.bind(web3Provider),
    resetRpcFailures: web3Provider.resetRpcFailures.bind(web3Provider),
  };
}
