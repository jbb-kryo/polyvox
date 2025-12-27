import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface WalletConnectionProps {
  walletAddress: string;
  privateKey: string;
}

export default function WalletConnection({ walletAddress, privateKey }: WalletConnectionProps) {
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const truncateAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchBalance = async () => {
    if (!walletAddress || !privateKey) {
      toast.error('Wallet not configured');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const wallet = new ethers.Wallet(privateKey, provider);

      const usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
      const usdcAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, wallet);
      const [balanceRaw, decimals] = await Promise.all([
        usdcContract.balanceOf(walletAddress),
        usdcContract.decimals()
      ]);

      const formattedBalance = ethers.formatUnits(balanceRaw, decimals);
      setBalance(parseFloat(formattedBalance).toFixed(2));
      toast.success('Balance updated');
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to fetch balance');
      setBalance('0.00');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress && privateKey) {
      fetchBalance();
    }
  }, [walletAddress, privateKey]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-200">Wallet</h3>
        </div>
        <button
          onClick={fetchBalance}
          disabled={isLoading || !walletAddress || !privateKey}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {walletAddress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Address</span>
            <span className="text-xs font-mono text-gray-300">{truncateAddress(walletAddress)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">USDC Balance</span>
            <span className="text-sm font-bold text-green-400">${balance}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500">Configure wallet in settings</p>
        </div>
      )}
    </div>
  );
}
