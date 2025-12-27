import { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, BarChart3, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import WhaleMetrics from './WhaleMetrics';
import WhaleMonitor from './WhaleMonitor';
import WhaleLeaderboard from './WhaleLeaderboard';
import CopiedPositions from './CopiedPositions';
import WhaleSettings from './WhaleSettings';
import WhaleAnalytics from './WhaleAnalytics';
import {
  WhaleOrder,
  WhaleProfile,
  CopiedPosition,
  WhaleWatcherSettings,
  WhaleWatcherMetrics,
  WhaleAnalytics as WhaleAnalyticsType
} from '../../types/whalewatcher';
import {
  scanForWhales,
  calculateWhaleMetrics,
  identifyWhaleWallet,
  updateWhaleProfileFromOrders,
  getTopWhales,
  addWhaleToWhitelist,
  addWhaleToBlacklist,
  removeWhaleFromWhitelist,
  removeWhaleFromBlacklist,
  getUserWhitelistBlacklist
} from '../../services/whaleDetector';
import {
  evaluateCopyTrade,
  executeCopyTrade,
  monitorAndManagePositions,
  calculatePerformanceAttribution,
  checkDailyLossLimit
} from '../../services/whaleCopyTrading';
import { useAuth } from '../../contexts/AuthContext';
import { saveWhaleOrder } from '../../services/database/whaleDb';

interface WhaleWatcherProps {
  useCorsProxy: boolean;
}

export default function WhaleWatcher({ useCorsProxy }: WhaleWatcherProps) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'positions' | 'analytics'>('monitor');
  const [showRealTradingWarning, setShowRealTradingWarning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);

  const [settings, setSettings] = useState<WhaleWatcherSettings>({
    realTradingMode: false,
    minWhaleOrderSize: 1000,
    copyPositionMode: 'fixed',
    copyPositionSize: 50,
    copyPositionPercent: 5,
    monitorAllMarkets: true,
    categoryWhitelist: [],
    whaleWhitelist: [],
    whaleBlacklist: [],
    exitStrategy: 'hybrid',
    takeProfitPercent: 15,
    stopLossPercent: 8,
    maxConcurrentCopies: 5,
    maxCopiesPerWhale: 2,
    dailyLossLimit: 100,
    autoExecute: false,
    alerts: {
      browser: true,
      sound: false,
      email: false,
      telegram: false
    },
    scanInterval: 30
  });

  const [whaleOrders, setWhaleOrders] = useState<WhaleOrder[]>([]);
  const [whaleProfiles, setWhaleProfiles] = useState<WhaleProfile[]>([]);
  const [copiedPositions, setCopiedPositions] = useState<CopiedPosition[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('whale_settings');
    const savedOrders = localStorage.getItem('whale_orders');
    const savedProfiles = localStorage.getItem('whale_profiles');
    const savedPositions = localStorage.getItem('whale_positions');

    if (savedSettings) setSettings({ ...settings, ...JSON.parse(savedSettings) });
    if (savedOrders) setWhaleOrders(JSON.parse(savedOrders));
    if (savedProfiles) setWhaleProfiles(JSON.parse(savedProfiles));
    if (savedPositions) setCopiedPositions(JSON.parse(savedPositions));
  }, []);

  useEffect(() => {
    localStorage.setItem('whale_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('whale_orders', JSON.stringify(whaleOrders));
  }, [whaleOrders]);

  useEffect(() => {
    localStorage.setItem('whale_profiles', JSON.stringify(whaleProfiles));
  }, [whaleProfiles]);

  useEffect(() => {
    localStorage.setItem('whale_positions', JSON.stringify(copiedPositions));
  }, [copiedPositions]);

  useEffect(() => {
    if (user) {
      loadUserWhitelistBlacklist();
      loadTopWhales();
    }
  }, [user]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      await handleScan();
    }, settings.scanInterval * 1000);

    return () => clearInterval(interval);
  }, [isActive, settings.scanInterval]);

  useEffect(() => {
    let positionMonitorInterval: NodeJS.Timeout;

    if (copiedPositions.filter(p => p.status === 'open').length > 0) {
      positionMonitorInterval = setInterval(async () => {
        await monitorPositions();
      }, 5000);
    }

    return () => {
      if (positionMonitorInterval) clearInterval(positionMonitorInterval);
    };
  }, [copiedPositions, settings]);

  const loadUserWhitelistBlacklist = async () => {
    if (!user) return;

    try {
      const lists = await getUserWhitelistBlacklist(user.id);
      setSettings(prev => ({
        ...prev,
        whaleWhitelist: lists.whitelist,
        whaleBlacklist: lists.blacklist
      }));
    } catch (error) {
      console.error('Error loading whitelist/blacklist:', error);
    }
  };

  const loadTopWhales = async () => {
    try {
      const profiles = await getTopWhales(20, 'profitLoss');
      if (profiles.length > 0) {
        setWhaleProfiles(profiles);
      }
    } catch (error) {
      console.error('Error loading top whales:', error);
    }
  };

  const handleScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setLastScanTime(Date.now());

    try {
      const newOrders = await scanForWhales(settings, useCorsProxy);

      if (newOrders.length > 0) {
        setWhaleOrders(prev => [...newOrders, ...prev].slice(0, 50));

        if (settings.alerts.browser) {
          toast.success(`${newOrders.length} whale order${newOrders.length > 1 ? 's' : ''} detected!`, {
            icon: '🐋'
          });

          if (settings.alerts.sound) {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZTRQMV6zn7q1aEAk+lunxwmsgBDWM0/PPhTMHIHLI8N2VRAsYZ7rt56ZRFQ1Mp+Hvr2AcBjiN1fPOgDMGIHPC8N6TTgsYZrnt6KVTFAo9lunwwGseBC+F0fLSgy0GHG3A7+CaTA8PVqvn7bBYFQk/mObxwGsc');
            audio.play().catch(() => {});
          }
        }

        for (const order of newOrders) {
          if (user) {
            await saveWhaleOrder(order);
          }

          let profile = await identifyWhaleWallet(order.walletAddress, useCorsProxy);

          if (profile) {
            profile = await updateWhaleProfileFromOrders(order.walletAddress, order);
            if (profile) {
              setWhaleProfiles(prev => {
                const existing = prev.find(p => p.walletAddress === profile.walletAddress);
                if (existing) {
                  return prev.map(p => p.walletAddress === profile.walletAddress ? profile : p);
                }
                return [profile, ...prev].slice(0, 20);
              });
            }
          }

          if (settings.autoExecute && !settings.realTradingMode) {
            await evaluateAndCopyWhale(order, profile);
          }
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan for whales');
    } finally {
      setIsScanning(false);
    }
  };

  const evaluateAndCopyWhale = async (order: WhaleOrder, profile: WhaleProfile | null) => {
    const decision = evaluateCopyTrade(order, profile, settings, copiedPositions);

    if (!decision.shouldCopy) {
      setWhaleOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: 'ignored' as const } : o
      ));
      return;
    }

    const lossCheck = checkDailyLossLimit(copiedPositions, settings.dailyLossLimit);
    if (lossCheck.limitReached) {
      toast.error(`Daily loss limit reached: -$${lossCheck.todayLoss.toFixed(2)}`);
      setIsActive(false);
      return;
    }

    await handleCopyWhale(order, decision.positionSize!, decision.confidence!);
  };

  const handleCopyWhale = async (order: WhaleOrder, positionSize?: number, confidence?: number) => {
    if (settings.realTradingMode) {
      toast.error('Cannot auto-copy in Real Trading Mode');
      return;
    }

    const size = positionSize || (settings.copyPositionMode === 'fixed'
      ? settings.copyPositionSize
      : (order.size * settings.copyPositionPercent) / 100);

    try {
      const position = await executeCopyTrade(
        order,
        size,
        confidence || 50,
        user?.id || '',
        settings.realTradingMode
      );

      if (position) {
        setCopiedPositions(prev => [position, ...prev]);
        setWhaleOrders(prev => prev.map(o =>
          o.id === order.id ? { ...o, status: 'copied' as const } : o
        ));

        toast.success(`Copied whale: $${size.toFixed(2)} ${order.side}`, {
          icon: '🐋'
        });
      }
    } catch (error) {
      console.error('Error copying whale:', error);
      toast.error('Failed to execute copy trade');
    }
  };

  const monitorPositions = async () => {
    if (!user) return;

    const openPositions = copiedPositions.filter(p => p.status === 'open');
    if (openPositions.length === 0) return;

    try {
      const result = await monitorAndManagePositions(
        openPositions,
        settings,
        user.id,
        useCorsProxy
      );

      setCopiedPositions(prev => {
        let updated = [...prev];

        for (const updatedPos of result.updated) {
          updated = updated.map(p =>
            p.id === updatedPos.id ? updatedPos : p
          );
        }

        for (const closedId of result.closed) {
          updated = updated.map(p =>
            p.id === closedId ? { ...p, status: 'closed' as const } : p
          );
        }

        return updated;
      });

      if (result.actions.length > 0) {
        for (const action of result.actions) {
          if (action.action === 'close') {
            const position = copiedPositions.find(p => p.id === action.positionId);
            if (position) {
              const reason = action.reason.replace('_', ' ');
              toast(`Position closed: ${reason}`, {
                icon: position.pnl > 0 ? '✅' : '❌'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error monitoring positions:', error);
    }
  };

  const handleStart = () => {
    setIsActive(true);
    toast.success('Whale monitoring started');
    handleScan();
  };

  const handleStop = () => {
    setIsActive(false);
    toast('Whale monitoring stopped', { icon: '⏸️' });
  };

  const handleIgnoreWhale = (orderId: string) => {
    setWhaleOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'ignored' as const } : o
    ));
    toast('Whale order ignored', { icon: '👋' });
  };

  const handleClosePosition = async (positionId: string) => {
    setCopiedPositions(prev => prev.map(p =>
      p.id === positionId
        ? {
            ...p,
            status: 'closed' as const,
            exitTime: new Date(),
            exitPrice: p.currentPrice,
            exitReason: 'manual' as const
          }
        : p
    ));
    toast.success('Position closed manually');
  };

  const handleWhitelist = async (wallet: string) => {
    if (!user) {
      toast.error('Please login to manage whitelist');
      return;
    }

    const isCurrentlyWhitelisted = settings.whaleWhitelist.includes(wallet);

    if (isCurrentlyWhitelisted) {
      const success = await removeWhaleFromWhitelist(wallet, user.id);
      if (success) {
        setSettings(prev => ({
          ...prev,
          whaleWhitelist: prev.whaleWhitelist.filter(w => w !== wallet)
        }));
        toast.success('Removed from whitelist');
      }
    } else {
      const success = await addWhaleToWhitelist(wallet, user.id);
      if (success) {
        setSettings(prev => ({
          ...prev,
          whaleWhitelist: [...prev.whaleWhitelist, wallet],
          whaleBlacklist: prev.whaleBlacklist.filter(w => w !== wallet)
        }));
        toast.success('Added to whitelist');
      }
    }

    setWhaleProfiles(prev => prev.map(p =>
      p.walletAddress === wallet
        ? { ...p, isWhitelisted: !isCurrentlyWhitelisted, isBlacklisted: false }
        : p
    ));
  };

  const handleBlacklist = async (wallet: string) => {
    if (!user) {
      toast.error('Please login to manage blacklist');
      return;
    }

    const isCurrentlyBlacklisted = settings.whaleBlacklist.includes(wallet);

    if (isCurrentlyBlacklisted) {
      const success = await removeWhaleFromBlacklist(wallet, user.id);
      if (success) {
        setSettings(prev => ({
          ...prev,
          whaleBlacklist: prev.whaleBlacklist.filter(w => w !== wallet)
        }));
        toast.success('Removed from blacklist');
      }
    } else {
      const success = await addWhaleToBlacklist(wallet, user.id);
      if (success) {
        setSettings(prev => ({
          ...prev,
          whaleBlacklist: [...prev.whaleBlacklist, wallet],
          whaleWhitelist: prev.whaleWhitelist.filter(w => w !== wallet)
        }));
        toast.success('Added to blacklist');
      }
    }

    setWhaleProfiles(prev => prev.map(p =>
      p.walletAddress === wallet
        ? { ...p, isBlacklisted: !isCurrentlyBlacklisted, isWhitelisted: false }
        : p
    ));
  };

  const confirmRealTrading = () => {
    setSettings(prev => ({ ...prev, realTradingMode: true, autoExecute: false }));
    setShowRealTradingWarning(false);
    toast.success('Real Trading Mode enabled');
  };

  const metrics: WhaleWatcherMetrics = {
    activeWhales: whaleProfiles.filter(p => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return p.lastActive >= today;
    }).length,
    ordersToday: whaleOrders.filter(o => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return o.timestamp >= today;
    }).length,
    copiedToday: copiedPositions.filter(p => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return p.entryTime >= today;
    }).length,
    totalPnL: copiedPositions.reduce((sum, p) => sum + p.pnl, 0),
    winRate: copiedPositions.length > 0
      ? copiedPositions.filter(p => p.pnl > 0).length / copiedPositions.length
      : 0,
    avgWhaleSize: whaleOrders.length > 0
      ? whaleOrders.reduce((sum, o) => sum + o.size, 0) / whaleOrders.length
      : 0,
    largestWhaleToday: whaleOrders.length > 0
      ? Math.max(...whaleOrders.map(o => o.size))
      : 0,
    activeCopies: copiedPositions.filter(p => p.status === 'open').length
  };

  const perfAttribution = calculatePerformanceAttribution(copiedPositions);

  const topWhalePerformances = Array.from(perfAttribution.byWhale.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 8)
    .map(([wallet, stats]) => ({
      wallet,
      copied: stats.count,
      winRate: stats.winRate,
      pnl: stats.pnl
    }));

  const analytics: WhaleAnalyticsType = {
    totalCopied: copiedPositions.length,
    successfulCopies: copiedPositions.filter(p => p.pnl > 0).length,
    winRate: metrics.winRate,
    totalPnL: metrics.totalPnL,
    avgPnL: copiedPositions.length > 0
      ? metrics.totalPnL / copiedPositions.length
      : 0,
    bestWhale: {
      wallet: topWhalePerformances[0]?.wallet || '0x0000000000000000000000000000000000000000',
      winRate: topWhalePerformances[0]?.winRate || 0,
      pnl: topWhalePerformances[0]?.pnl || 0
    },
    bestCategory: {
      category: 'Crypto',
      winRate: 0.65,
      pnl: 125.50
    },
    hourlyActivity: Array.from({ length: 24 }, (_, i) => {
      const hourOrders = whaleOrders.filter(o => o.timestamp.getHours() === i);
      return {
        hour: i,
        orderCount: hourOrders.length,
        avgSize: hourOrders.length > 0
          ? hourOrders.reduce((sum, o) => sum + o.size, 0) / hourOrders.length
          : 0
      };
    }),
    performanceByWhale: topWhalePerformances,
    performanceByCategory: [
      { category: 'Crypto', copied: 45, winRate: 0.65, pnl: 125.50 },
      { category: 'Politics', copied: 32, winRate: 0.58, pnl: 78.20 },
      { category: 'Sports', copied: 28, winRate: 0.62, pnl: 92.15 },
      { category: 'Economics', copied: 15, winRate: 0.55, pnl: 34.80 }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">WhaleWatcher</h2>
          <p className="text-gray-400">Copy trade successful whale positions</p>
          {lastScanTime && (
            <p className="text-sm text-gray-500 mt-1">
              Last scan: {new Date(lastScanTime).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Now
          </button>
          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>
      </div>

      <WhaleMetrics metrics={metrics} />

      <WhaleSettings
        settings={settings}
        onChange={setSettings}
        onShowRealTradingWarning={() => setShowRealTradingWarning(true)}
      />

      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'monitor'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Monitor & Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'positions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Copied Positions
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {activeTab === 'monitor' && (
        <div className="space-y-6">
          <WhaleMonitor
            orders={whaleOrders}
            onCopyWhale={(order) => handleCopyWhale(order)}
            onIgnoreWhale={handleIgnoreWhale}
            realTradingMode={settings.realTradingMode}
          />
          <WhaleLeaderboard
            profiles={whaleProfiles}
            onWhitelist={handleWhitelist}
            onBlacklist={handleBlacklist}
          />
        </div>
      )}

      {activeTab === 'positions' && (
        <CopiedPositions
          positions={copiedPositions}
          onClosePosition={handleClosePosition}
        />
      )}

      {activeTab === 'analytics' && (
        <WhaleAnalytics analytics={analytics} />
      )}

      {showRealTradingWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border-2 border-red-600 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Real Trading Mode Warning</h3>
            <div className="space-y-3 text-sm text-gray-300 mb-6">
              <p>You are about to enable Real Trading Mode. This means:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>Copied positions will use REAL money</li>
                <li>Transactions will be executed on Polygon blockchain</li>
                <li>You could LOSE money if whales make bad trades</li>
                <li>Gas fees will apply to all transactions</li>
                <li>Auto-copy will be disabled for safety</li>
              </ul>
              <p className="text-red-400 font-bold mt-4">
                Only enable this if you understand the risks!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRealTradingWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRealTrading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                I Understand, Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
