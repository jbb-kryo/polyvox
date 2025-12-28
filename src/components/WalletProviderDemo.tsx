import React, { useState } from 'react';
import {
  Wallet,
  Key,
  Shield,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { useWalletProviders } from '../hooks/useWalletProviders';
import WalletConnectionManager from './WalletConnectionManager';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export function WalletProviderDemo() {
  const {
    isConnected,
    address,
    providerType,
    chainId,
    isCorrectNetwork,
    usdcBalance,
    maticBalance,
    signMessage,
    signTypedData,
    signTransaction
  } = useWalletProviders();

  const [message, setMessage] = useState('Hello from PolyVOX!');
  const [signature, setSignature] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [typedDataSignature, setTypedDataSignature] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleSignMessage = async () => {
    if (!message) {
      toast.error('Please enter a message to sign');
      return;
    }

    setIsSigning(true);
    try {
      const sig = await signMessage(message);
      setSignature(sig);
      toast.success('Message signed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign message');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSignTypedData = async () => {
    setIsSigning(true);
    try {
      const domain = {
        name: 'PolyVOX Demo',
        version: '1',
        chainId: 137,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      };

      const types = {
        Message: [
          { name: 'content', type: 'string' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      const value = {
        content: message,
        timestamp: Math.floor(Date.now() / 1000)
      };

      const sig = await signTypedData(domain, types, value);
      setTypedDataSignature(sig);
      toast.success('Typed data signed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign typed data');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSendTestTransaction = async () => {
    if (!isCorrectNetwork) {
      toast.error('Please switch to Polygon network');
      return;
    }

    const balance = parseFloat(maticBalance);
    if (balance < 0.001) {
      toast.error('Insufficient MATIC balance for test transaction');
      return;
    }

    setIsSigning(true);
    try {
      const tx = {
        to: address || '0x0000000000000000000000000000000000000000',
        value: ethers.parseEther('0.0001'),
        data: '0x'
      };

      const hash = await signTransaction(tx);
      setTxHash(hash);
      toast.success('Transaction sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Wallet Provider Demo
        </h2>
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                {providerType === 'metamask' && '🦊 MetaMask'}
                {providerType === 'walletconnect' && '🔗 WalletConnect'}
                {providerType === 'privatekey' && '🔑 Private Key'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WalletConnectionManager />

          {isConnected && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Connection Details
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {providerType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID:</span>
                  <span className="font-medium text-gray-900">{chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span
                    className={`font-medium ${
                      isCorrectNetwork ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {isCorrectNetwork ? 'Polygon ✓' : 'Wrong Network'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!isConnected ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-gray-600">
                Connect your wallet to test signing and transaction features
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Message Signing
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message to Sign
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter message..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSignMessage}
                      disabled={isSigning || !message}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigning ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      Sign Message
                    </button>

                    <button
                      onClick={handleSignTypedData}
                      disabled={isSigning || !message}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigning ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      Sign Typed Data
                    </button>
                  </div>

                  {signature && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-900 mb-1">
                            Message Signature
                          </p>
                          <p className="text-xs text-green-700 font-mono break-all">
                            {signature}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {typedDataSignature && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-900 mb-1">
                            Typed Data Signature
                          </p>
                          <p className="text-xs text-blue-700 font-mono break-all">
                            {typedDataSignature}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Transaction Testing
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Test Transaction Details
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>• Sends 0.0001 MATIC to your own address</p>
                      <p>• Safe test transaction</p>
                      <p>• Verifies wallet signing capability</p>
                    </div>
                  </div>

                  {!isCorrectNetwork ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <p className="text-xs text-orange-700">
                          Please switch to Polygon network to send transactions
                        </p>
                      </div>
                    </div>
                  ) : parseFloat(maticBalance) < 0.001 ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <p className="text-xs text-orange-700">
                          Insufficient MATIC balance. You need at least 0.001 MATIC to
                          send a test transaction.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendTestTransaction}
                      disabled={isSigning}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigning ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      Send Test Transaction
                    </button>
                  )}

                  {txHash && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-900 mb-1">
                            Transaction Sent
                          </p>
                          <p className="text-xs text-green-700 font-mono break-all mb-2">
                            {txHash}
                          </p>
                          <a
                            href={`https://polygonscan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            View on PolygonScan
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  Integration Features
                </h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    MetaMask browser extension support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    WalletConnect mobile wallet support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Private key import option
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Automatic network switching
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Account change detection
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Real-time balance updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Message and typed data signing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    Transaction signing and sending
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
