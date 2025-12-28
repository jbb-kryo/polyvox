import React, { useState } from 'react';
import {
  Wallet,
  RefreshCw,
  Power,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  Key
} from 'lucide-react';
import { useWalletProviders } from '../hooks/useWalletProviders';
import toast from 'react-hot-toast';

interface WalletConnectionManagerProps {
  onConnected?: (address: string) => void;
}

export default function WalletConnectionManager({ onConnected }: WalletConnectionManagerProps) {
  const {
    isConnected,
    address,
    providerType,
    chainId,
    isCorrectNetwork,
    error,
    isConnecting,
    usdcBalance,
    maticBalance,
    connectMetaMask,
    connectWalletConnect,
    connectPrivateKey,
    disconnect,
    switchNetwork,
    fetchBalances,
    formatAddress
  } = useWalletProviders();

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const handleMetaMaskConnect = async () => {
    try {
      await connectMetaMask();
      setShowConnectionModal(false);
      toast.success('Connected to MetaMask');
      if (address) {
        onConnected?.(address);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleWalletConnectConnect = async () => {
    try {
      await connectWalletConnect();
      setShowConnectionModal(false);
      toast.success('Connected via WalletConnect');
      if (address) {
        onConnected?.(address);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handlePrivateKeyConnect = async () => {
    if (!privateKeyInput) {
      toast.error('Please enter a private key');
      return;
    }

    try {
      await connectPrivateKey(privateKeyInput);
      setShowConnectionModal(false);
      setShowPrivateKeyInput(false);
      setPrivateKeyInput('');
      toast.success('Connected with private key');
      if (address) {
        onConnected?.(address);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid private key');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Wallet disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      const success = await switchNetwork(137);
      if (success) {
        toast.success('Switched to Polygon network');
      } else {
        toast.error('Failed to switch network');
      }
    } catch (err) {
      toast.error('Failed to switch network');
    }
  };

  const handleRefreshBalance = async () => {
    setIsFetchingBalance(true);
    try {
      await fetchBalances();
      toast.success('Balances updated');
    } catch (err) {
      toast.error('Failed to refresh balances');
    } finally {
      setIsFetchingBalance(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`https://polygonscan.com/address/${address}`, '_blank');
    }
  };

  const getProviderIcon = () => {
    switch (providerType) {
      case 'metamask':
        return '🦊';
      case 'walletconnect':
        return '🔗';
      case 'privatekey':
        return '🔑';
      default:
        return null;
    }
  };

  const getProviderName = () => {
    switch (providerType) {
      case 'metamask':
        return 'MetaMask';
      case 'walletconnect':
        return 'WalletConnect';
      case 'privatekey':
        return 'Private Key';
      default:
        return 'Not Connected';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white" />
              <h3 className="text-sm font-semibold text-white">Wallet Connection</h3>
            </div>
            {isConnected && (
              <button
                onClick={handleRefreshBalance}
                disabled={isFetchingBalance}
                className="p-1.5 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh balances"
              >
                <RefreshCw
                  className={`w-4 h-4 text-white ${isFetchingBalance ? 'animate-spin' : ''}`}
                />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {!isConnected ? (
            <div className="space-y-3">
              <div className="text-center py-4">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-4">
                  Connect your wallet to start trading
                </p>
                <button
                  onClick={() => setShowConnectionModal(true)}
                  disabled={isConnecting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {getProviderIcon()} {getProviderName()}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                  title="Disconnect"
                >
                  <Power className="w-4 h-4 text-green-700" />
                </button>
              </div>

              {!isCorrectNetwork && chainId && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-xs text-orange-700">
                      Wrong network detected. Please switch to Polygon.
                    </p>
                  </div>
                  <button
                    onClick={handleSwitchNetwork}
                    className="w-full px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                  >
                    Switch to Polygon
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Address</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-gray-900">
                      {formatAddress(address || '')}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy address"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={openExplorer}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="View on PolygonScan"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>

                {chainId && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Network</span>
                    <span className={`text-xs font-medium ${isCorrectNetwork ? 'text-green-600' : 'text-orange-600'}`}>
                      {chainId === 137 ? 'Polygon' : `Chain ${chainId}`}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">USDC Balance</span>
                    <span className="text-sm font-bold text-green-600">
                      ${usdcBalance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">MATIC Balance</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {maticBalance} MATIC
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose how you want to connect
              </p>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={handleMetaMaskConnect}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-4xl">🦊</div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">MetaMask</div>
                  <div className="text-xs text-gray-600">
                    Connect using MetaMask browser extension
                  </div>
                </div>
              </button>

              <button
                onClick={handleWalletConnectConnect}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-4xl">🔗</div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">WalletConnect</div>
                  <div className="text-xs text-gray-600">
                    Scan QR code with your mobile wallet
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Key className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Private Key</div>
                  <div className="text-xs text-gray-600">
                    Connect using your private key
                  </div>
                </div>
              </button>

              {showPrivateKeyInput && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Private Key
                    </label>
                    <input
                      type="password"
                      value={privateKeyInput}
                      onChange={(e) => setPrivateKeyInput(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      Never share your private key. It will be stored locally and encrypted.
                    </p>
                  </div>
                  <button
                    onClick={handlePrivateKeyConnect}
                    disabled={isConnecting || !privateKeyInput}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setShowPrivateKeyInput(false);
                  setPrivateKeyInput('');
                }}
                disabled={isConnecting}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
