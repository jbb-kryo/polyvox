import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Zap, CheckCircle, XCircle, Wifi } from 'lucide-react';
import { useWeb3Connection } from '../hooks/useWeb3Connection';
import { Web3ConnectionStatus, CompactWeb3Status } from './Web3ConnectionStatus';

export function Web3ConnectionDemo() {
  const {
    isConnected,
    chainId,
    connectionType,
    status,
    error,
    connectRPC,
    connectWallet,
    disconnect,
    healthCheck,
    ensureConnection,
    getGasEstimate,
    getRpcEndpoint,
    getAvailableRpcEndpoints,
    resetRpcFailures
  } = useWeb3Connection();

  const [health, setHealth] = useState<any>(null);
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFetchingGas, setIsFetchingGas] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchGasEstimate();
      performHealthCheck();
    }
  }, [isConnected]);

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const result = await healthCheck();
      setHealth(result);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const fetchGasEstimate = async () => {
    setIsFetchingGas(true);
    try {
      const estimate = await getGasEstimate();
      setGasEstimate(estimate);
    } catch (err) {
      console.error('Gas estimate failed:', err);
    } finally {
      setIsFetchingGas(false);
    }
  };

  const handleEnsureConnection = async () => {
    try {
      await ensureConnection();
    } catch (err) {
      console.error('Failed to ensure connection:', err);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Web3 Connection Test
        </h2>
        <CompactWeb3Status />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Web3ConnectionStatus
            showDetails
            showGasPrice
            onConnect={() => console.log('Connected!')}
          />

          {!isConnected && (
            <div className="space-y-3">
              <button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors"
              >
                <Wifi className="w-5 h-5" />
                Connect with MetaMask
              </button>
              <button
                onClick={connectRPC}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Wifi className="w-5 h-5" />
                Connect via RPC
              </button>
            </div>
          )}

          {isConnected && (
            <div className="space-y-3">
              <button
                onClick={disconnect}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
              <button
                onClick={handleEnsureConnection}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ensure Connection
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Connection Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-gray-900 capitalize">{status}</span>
              </div>
              {chainId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID:</span>
                  <span className="font-medium text-gray-900">{chainId}</span>
                </div>
              )}
              {connectionType && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{connectionType}</span>
                </div>
              )}
              {isConnected && (
                <div className="flex justify-between">
                  <span className="text-gray-600">RPC Endpoint:</span>
                  <span className="font-medium text-gray-900 text-xs truncate max-w-[200px]">
                    {getRpcEndpoint()}
                  </span>
                </div>
              )}
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mt-2">
                  {error}
                </div>
              )}
            </div>
          </div>

          {isConnected && (
            <>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Health Check
                  </h3>
                  <button
                    onClick={performHealthCheck}
                    disabled={isChecking}
                    className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {health && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center gap-1">
                        {health.isHealthy ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">Healthy</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-600">Unhealthy</span>
                          </>
                        )}
                      </div>
                    </div>
                    {health.latency && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latency:</span>
                        <span className="font-medium text-gray-900">{health.latency}ms</span>
                      </div>
                    )}
                    {health.blockNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Block:</span>
                        <span className="font-medium text-gray-900">#{health.blockNumber}</span>
                      </div>
                    )}
                    {health.error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {health.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Gas Estimate
                  </h3>
                  <button
                    onClick={fetchGasEstimate}
                    disabled={isFetchingGas}
                    className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingGas ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {gasEstimate && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gas Price:</span>
                      <span className="font-medium text-gray-900">
                        {(Number(gasEstimate.gasPrice) / 1e9).toFixed(2)} Gwei
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Fee:</span>
                      <span className="font-medium text-gray-900">
                        {(Number(gasEstimate.maxFeePerGas) / 1e9).toFixed(2)} Gwei
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority Fee:</span>
                      <span className="font-medium text-gray-900">
                        {(Number(gasEstimate.maxPriorityFeePerGas) / 1e9).toFixed(2)} Gwei
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Est. Cost:</span>
                      <span className="font-semibold text-gray-900">
                        ${gasEstimate.estimatedCostUSD.toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Available RPC Endpoints
                </h3>
                <div className="space-y-1">
                  {getAvailableRpcEndpoints().map((endpoint, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="truncate">{endpoint}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={resetRpcFailures}
                  className="w-full mt-3 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                >
                  Reset Failed Endpoints
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
