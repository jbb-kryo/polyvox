import { useState } from 'react';
import { X, Wallet, Lock, AlertTriangle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface WalletSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletMode = 'private-key' | 'metamask';

export default function WalletSetupModal({ isOpen, onClose }: WalletSetupModalProps) {
  const [mode, setMode] = useState<WalletMode>('private-key');
  const [privateKey, setPrivateKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedWarning, setAcceptedWarning] = useState(false);

  const { setWalletCredentials, updateProfile } = useAuth();

  if (!isOpen) return null;

  const validatePrivateKey = (key: string): boolean => {
    try {
      if (!key.startsWith('0x')) {
        key = '0x' + key;
      }
      new ethers.Wallet(key);
      return true;
    } catch {
      return false;
    }
  };

  const handlePrivateKeySetup = async () => {
    if (!acceptedWarning) {
      toast.error('Please acknowledge the security warning');
      return;
    }

    if (!privateKey) {
      toast.error('Please enter your private key');
      return;
    }

    if (!validatePrivateKey(privateKey)) {
      toast.error('Invalid private key format');
      return;
    }

    if (masterPassword.length < 12) {
      toast.error('Master password must be at least 12 characters');
      return;
    }

    if (masterPassword !== confirmMasterPassword) {
      toast.error('Master passwords do not match');
      return;
    }

    setLoading(true);
    try {
      let formattedKey = privateKey;
      if (!formattedKey.startsWith('0x')) {
        formattedKey = '0x' + formattedKey;
      }

      const wallet = new ethers.Wallet(formattedKey);
      const walletAddress = wallet.address;

      const { error } = await setWalletCredentials(
        walletAddress,
        formattedKey,
        masterPassword
      );

      if (error) {
        throw new Error(error.message);
      }

      await updateProfile({ demo_mode: false });

      toast.success('Wallet configured successfully!');
      onClose();

      setPrivateKey('');
      setMasterPassword('');
      setConfirmMasterPassword('');
      setAcceptedWarning(false);
    } catch (error: any) {
      console.error('Error setting up wallet:', error);
      toast.error(error.message || 'Failed to configure wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaMaskSetup = async () => {
    toast.error('MetaMask integration coming soon!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Wallet Setup</h2>
            <p className="text-sm text-gray-400 mt-1">Configure your trading wallet</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-yellow-500 font-semibold mb-1">Security Notice</h3>
                <p className="text-sm text-yellow-200">
                  Your private key will be encrypted using AES-256-GCM with your master password before storage.
                  Never share your private key or master password with anyone. PolyVOX cannot recover your keys if you lose your master password.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setMode('private-key')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                mode === 'private-key'
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <Lock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-white font-medium">Private Key</div>
              <div className="text-xs text-gray-400 mt-1">Encrypted storage</div>
            </button>

            <button
              onClick={() => setMode('metamask')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                mode === 'metamask'
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <Wallet className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <div className="text-white font-medium">MetaMask</div>
              <div className="text-xs text-gray-400 mt-1">Coming soon</div>
            </button>
          </div>

          {mode === 'private-key' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Private Key
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="0x..."
                    autoComplete="off"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Your Polygon wallet private key (starts with 0x)
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Master Password
                </h4>
                <p className="text-xs text-gray-400">
                  Create a strong master password to encrypt your private key. You'll need this password every time you want to execute trades.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter master password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Minimum 12 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Master Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm master password"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
                <input
                  type="checkbox"
                  id="accept-warning"
                  checked={acceptedWarning}
                  onChange={(e) => setAcceptedWarning(e.target.checked)}
                  className="mt-1"
                  disabled={loading}
                />
                <label htmlFor="accept-warning" className="text-sm text-red-200 flex-1">
                  I understand that if I lose my master password, I will permanently lose access to my private key and funds. PolyVOX cannot recover lost passwords.
                </label>
              </div>

              <button
                onClick={handlePrivateKeySetup}
                disabled={loading || !acceptedWarning}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? 'Encrypting...' : 'Encrypt & Save Wallet'}
              </button>

              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-2">Security Features:</h4>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• AES-256-GCM encryption with PBKDF2 key derivation</li>
                  <li>• Private key never stored in plain text</li>
                  <li>• Encryption happens entirely in your browser</li>
                  <li>• Master password never leaves your device</li>
                  <li>• Keys are only decrypted on-demand for trading</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">MetaMask Integration</h3>
              <p className="text-gray-400 mb-6">
                Connect your MetaMask wallet for a more secure trading experience. This feature is coming soon.
              </p>
              <button
                onClick={handleMetaMaskSetup}
                disabled
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Connect MetaMask
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
