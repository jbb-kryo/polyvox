import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useWeb3Connection } from '../hooks/useWeb3Connection';

interface Web3ConnectionStatusProps {
  showText?: boolean;
  showDetails?: boolean;
  showGasPrice?: boolean;
  onConnect?: () => void;
}

export function Web3ConnectionStatus({
  showText = true,
  showDetails = false,
  showGasPrice = false,
  onConnect
}: Web3ConnectionStatusProps) {
  const {
    status,
    connectionType,
    chainId,
    isConnected,
    isWrongNetwork,
    error,
    connectRPC,
    connectWallet,
    switchNetwork,
    getGasEstimate
  } = useWeb3Connection();

  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isConnected && showGasPrice) {
      const fetchGasPrice = async () => {
        try {
          const estimate = await getGasEstimate();
          const gasPriceGwei = Number(estimate.gasPrice) / 1e9;
          setGasPrice(gasPriceGwei.toFixed(1));
        } catch (err) {
          console.error('Failed to fetch gas price:', err);
        }
      };

      fetchGasPrice();
      const interval = setInterval(fetchGasPrice, 15000);

      return () => clearInterval(interval);
    }
  }, [isConnected, showGasPrice, getGasEstimate]);

  const getStatusConfig = () => {
    if (isWrongNetwork) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        text: 'Wrong Network',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        description: 'Please switch to Polygon Mainnet'
      };
    }

    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          description: connectionType === 'injected' ? 'Connected via MetaMask' : 'Connected via RPC'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          description: 'Establishing connection to Polygon'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'Not connected to network'
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          description: error || 'Connection error occurred'
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig();

  const handleConnect = async (type: 'rpc' | 'wallet') => {
    setShowDropdown(false);

    try {
      if (type === 'wallet') {
        await connectWallet();
      } else {
        await connectRPC();
      }
      onConnect?.();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleSwitchNetwork = async () => {
    await switchNetwork();
  };

  if (!showDetails) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            if (isWrongNetwork) {
              handleSwitchNetwork();
            } else if (!isConnected) {
              setShowDropdown(!showDropdown);
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${config.bgColor} ${config.borderColor} hover:opacity-80`}
        >
          <div className={config.color}>{config.icon}</div>
          {showText && (
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
          )}
          {showGasPrice && gasPrice && isConnected && (
            <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-white rounded border border-gray-200">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700">{gasPrice} Gwei</span>
            </div>
          )}
        </button>

        {showDropdown && !isConnected && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Connect to Polygon</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleConnect('wallet')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors"
                >
                  <Wifi className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">MetaMask</div>
                    <div className="text-xs text-orange-100">Connect your wallet</div>
                  </div>
                </button>
                <button
                  onClick={() => handleConnect('rpc')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Wifi className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">RPC Only</div>
                    <div className="text-xs text-gray-500">Read-only connection</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white ${config.color}`}>
            {config.icon}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${config.color}`}>
              Polygon Network
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">{config.description}</p>
          </div>
        </div>

        {isWrongNetwork && (
          <button
            onClick={handleSwitchNetwork}
            className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            Switch Network
          </button>
        )}

        {!isConnected && status !== 'connecting' && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>

            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  <button
                    onClick={() => handleConnect('wallet')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Wifi className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Connect Wallet</div>
                      <div className="text-xs text-gray-500">Use MetaMask</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleConnect('rpc')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Wifi className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">RPC Only</div>
                      <div className="text-xs text-gray-500">Read-only mode</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isConnected && (
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Chain ID:</span>
            <span className="font-medium text-gray-900">{chainId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Connection:</span>
            <span className="font-medium text-gray-900 capitalize">{connectionType}</span>
          </div>
          {gasPrice && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Gas Price:</span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="font-medium text-gray-900">{gasPrice} Gwei</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !isWrongNetwork && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

export function CompactWeb3Status() {
  const { isConnected, status, isWrongNetwork } = useWeb3Connection();

  const getIndicatorColor = () => {
    if (isWrongNetwork) return 'bg-orange-500';
    if (isConnected) return 'bg-green-500';
    if (status === 'connecting') return 'bg-blue-500';
    if (status === 'error') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isWrongNetwork) return 'Wrong Network';
    if (isConnected) return 'Polygon';
    if (status === 'connecting') return 'Connecting...';
    if (status === 'error') return 'Error';
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()} ${isConnected ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-gray-700">{getStatusText()}</span>
    </div>
  );
}
