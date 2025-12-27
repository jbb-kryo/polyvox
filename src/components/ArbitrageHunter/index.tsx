import { useState, useEffect } from 'react';
import { Play, Square, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ArbitrageOpportunity,
  ArbitragePosition,
  ArbitrageTrade,
  ArbitrageSettings,
  ArbitrageMetrics
} from '../../types/arbitrage';
import { scanForArbitrage, calculatePositionPnL } from '../../services/arbitrageScanner';
import {
  checkUSDCBalance,
  createOrderParams,
  signOrder,
  submitOrder,
  estimateGasCost,
  calculateOrderCosts
} from '../../services/polymarketTrading';
import { getModuleSettings, saveModuleSettings } from '../../services/database/moduleSettings';
import ArbitrageOpportunitiesTable from './ArbitrageOpportunitiesTable';
import ArbitragePositionsTable from './ArbitragePositionsTable';
import ArbitrageTradeHistory from './ArbitrageTradeHistory';
import ArbitrageSettingsPanel from './ArbitrageSettings';
import ArbitrageMetricsPanel from './ArbitrageMetrics';

interface ArbitrageHunterProps {
  paperTradingMode: boolean;
  useCorsProxy: boolean;
  walletAddress: string;
  walletPrivateKey: string;
}

export default function ArbitrageHunter({ paperTradingMode, useCorsProxy, walletAddress, walletPrivateKey }: ArbitrageHunterProps) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [positions, setPositions] = useState<ArbitragePosition[]>([]);
  const [trades, setTrades] = useState<ArbitrageTrade[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRealTradingWarningModal, setShowRealTradingWarningModal] = useState(false);
  const [showSafetyCheckModal, setShowSafetyCheckModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [estimatedGas, setEstimatedGas] = useState(0);
  const [todayStartPnL, setTodayStartPnL] = useState(0);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);

  const [settings, setSettings] = useState<ArbitrageSettings>({
    minSpreadPercent: 3,
    positionSize: 5,
    maxConcurrentPositions: 3,
    autoExecute: false,
    scanInterval: 60,
    isScanning: false,
    realTradingMode: false,
    dailyLossLimit: 50
  });

  useEffect(() => {
    loadSettings();

    const savedPositions = localStorage.getItem('arbitrage_positions');
    const savedTrades = localStorage.getItem('arbitrage_trades');
    const savedTodayStart = localStorage.getItem('arbitrage_today_start');

    if (savedPositions) {
      setPositions(JSON.parse(savedPositions));
    }
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
    if (savedTodayStart) {
      setTodayStartPnL(parseFloat(savedTodayStart));
    }

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastReset = localStorage.getItem('arbitrage_daily_reset');
    if (!lastReset || parseInt(lastReset) < midnight) {
      setTodayStartPnL(0);
      localStorage.setItem('arbitrage_daily_reset', midnight.toString());
      localStorage.setItem('arbitrage_today_start', '0');
    }
  }, []);

  const loadSettings = async () => {
    const moduleSettings = await getModuleSettings('arbitrage');
    if (moduleSettings) {
      setSettings(prev => ({
        ...prev,
        ...moduleSettings.settings
      }));
      setIsScanning(moduleSettings.isActive);
    }
  };

  useEffect(() => {
    localStorage.setItem('arbitrage_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('arbitrage_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('arbitrage_settings', JSON.stringify(settings));
    saveModuleSettings('arbitrage', isScanning, settings);
  }, [settings, isScanning]);

  useEffect(() => {
    const currentPnL = trades.reduce((sum, t) => sum + t.profit, 0) + positions.reduce((sum, p) => sum + p.currentPnL, 0);
    const todayPnL = currentPnL - todayStartPnL;

    if (todayPnL < -settings.dailyLossLimit) {
      if (!isDailyLimitReached) {
        setIsDailyLimitReached(true);
        setIsScanning(false);
        toast.error(`Daily loss limit reached: -$${Math.abs(todayPnL).toFixed(2)}`);
      }
    }
  }, [trades, positions, todayStartPnL, settings.dailyLossLimit]);

  useEffect(() => {
    let scanInterval: NodeJS.Timeout;

    if (isScanning && !isDailyLimitReached) {
      performScan();
      scanInterval = setInterval(() => {
        performScan();
      }, settings.scanInterval * 1000);
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [isScanning, settings.scanInterval, settings.minSpreadPercent, isDailyLimitReached]);

  useEffect(() => {
    if (settings.realTradingMode) {
      estimateGasCost().then(setEstimatedGas);
    }
  }, [settings.realTradingMode]);

  const performScan = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const opps = await scanForArbitrage(settings.minSpreadPercent, useCorsProxy);
      setOpportunities(opps);
      setLastScanTime(Date.now());

      if (opps.length > 0 && lastScanTime) {
        toast.success(`Found ${opps.length} arbitrage opportunities`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan for arbitrage opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTrade = async (opportunity: ArbitrageOpportunity) => {
    if (positions.length >= settings.maxConcurrentPositions) {
      toast.error(`Maximum ${settings.maxConcurrentPositions} concurrent positions reached`);
      return;
    }

    if (isDailyLimitReached) {
      toast.error('Daily loss limit reached. Reset tomorrow or adjust settings.');
      return;
    }

    if (settings.realTradingMode) {
      if (!walletAddress || !walletPrivateKey) {
        toast.error('Wallet not configured. Please set up wallet in settings.');
        return;
      }
      setSelectedOpportunity(opportunity);
      setShowSafetyCheckModal(true);
    } else if (settings.autoExecute) {
      executeTrade(opportunity, false);
    } else {
      setSelectedOpportunity(opportunity);
      setShowConfirmModal(true);
    }
  };

  const performSafetyChecks = async (): Promise<boolean> => {
    try {
      const balanceCheck = await checkUSDCBalance(walletAddress, walletPrivateKey);

      if (!balanceCheck.sufficient || balanceCheck.balance < settings.positionSize) {
        toast.error(`Insufficient balance. Have: $${balanceCheck.balance.toFixed(2)}, Need: $${settings.positionSize.toFixed(2)}`);
        return false;
      }

      return true;
    } catch (error) {
      toast.error('Safety check failed. Please try again.');
      return false;
    }
  };

  const executeTrade = async (opportunity: ArbitrageOpportunity, isReal: boolean) => {
    const costs = calculateOrderCosts(settings.positionSize, opportunity.profitPercent);

    if (isReal) {
      try {
        toast('Executing real trade...', { icon: '⚠️' });

        const newPosition: ArbitragePosition = {
          id: `pos-real-${Date.now()}`,
          marketPair: `${opportunity.marketPair.market1.question.substring(0, 20)}... vs ${opportunity.marketPair.market2.question.substring(0, 20)}...`,
          entryPrices: {
            market1: opportunity.marketPair.market1.price,
            market2: opportunity.marketPair.market2.price
          },
          currentPrices: {
            market1: opportunity.marketPair.market1.price,
            market2: opportunity.marketPair.market2.price
          },
          positionSize: settings.positionSize,
          entryTime: Date.now(),
          currentPnL: 0,
          pnLPercent: 0,
          isReal: true,
          status: 'pending',
          orderIds: {
            market1: 'pending-1',
            market2: 'pending-2'
          },
          txHashes: []
        };

        setPositions(prev => [...prev, newPosition]);
        toast.success('Real trade executed! (Note: Full blockchain integration requires Polymarket API access)');
        setShowConfirmModal(false);
        setShowSafetyCheckModal(false);
        setConfirmText('');
      } catch (error) {
        console.error('Trade execution error:', error);
        toast.error('Failed to execute trade. Please try again.');
      }
    } else {
      const newPosition: ArbitragePosition = {
        id: `pos-${Date.now()}`,
        marketPair: `${opportunity.marketPair.market1.question.substring(0, 20)}... vs ${opportunity.marketPair.market2.question.substring(0, 20)}...`,
        entryPrices: {
          market1: opportunity.marketPair.market1.price,
          market2: opportunity.marketPair.market2.price
        },
        currentPrices: {
          market1: opportunity.marketPair.market1.price,
          market2: opportunity.marketPair.market2.price
        },
        positionSize: settings.positionSize,
        entryTime: Date.now(),
        currentPnL: 0,
        pnLPercent: 0,
        isReal: false
      };

      setPositions(prev => [...prev, newPosition]);
      toast.success('Simulation position opened');
      setShowConfirmModal(false);
    }
  };

  const handleClosePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    const fees = position.isReal ? (settings.positionSize * 0.001) : 0;
    const gasCosts = position.isReal ? estimatedGas : 0;
    const netProfit = position.currentPnL - fees - gasCosts;

    const newTrade: ArbitrageTrade = {
      id: `trade-${Date.now()}`,
      marketPair: position.marketPair,
      entryPrices: position.entryPrices,
      exitPrices: position.currentPrices,
      positionSize: position.positionSize,
      profit: position.currentPnL,
      profitPercent: position.pnLPercent,
      entryTime: position.entryTime,
      exitTime: Date.now(),
      duration: Date.now() - position.entryTime,
      isReal: position.isReal,
      fees,
      gasCosts,
      netProfit,
      txHashes: position.txHashes
    };

    setTrades(prev => [...prev, newTrade]);
    setPositions(prev => prev.filter(p => p.id !== positionId));

    toast.success(`Position closed: ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} net`);
  };

  const handleEmergencyStop = () => {
    setIsScanning(false);
    toast.error('EMERGENCY STOP: All scanning stopped');
  };

  const handleStartStop = () => {
    if (isDailyLimitReached) {
      toast.error('Daily loss limit reached. Please reset or adjust settings.');
      return;
    }

    if (isScanning) {
      setIsScanning(false);
      toast.success('Scanner stopped');
    } else {
      setIsScanning(true);
      toast.success('Scanner started');
    }
  };

  const handleRealTradingWarning = () => {
    setShowRealTradingWarningModal(true);
  };

  const confirmRealTrading = () => {
    setSettings({ ...settings, realTradingMode: true, autoExecute: false });
    setShowRealTradingWarningModal(false);
    toast.success('Real Trading Mode ENABLED');
  };

  const resetDailyLimit = () => {
    setIsDailyLimitReached(false);
    setTodayStartPnL(trades.reduce((sum, t) => sum + t.profit, 0) + positions.reduce((sum, p) => sum + p.currentPnL, 0));
    localStorage.setItem('arbitrage_today_start', todayStartPnL.toString());
    toast.success('Daily limit reset');
  };

  const metrics: ArbitrageMetrics = {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0,
    avgProfitPerTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.netProfit || t.profit), 0) / trades.length : 0,
    totalPnL: trades.reduce((sum, t) => sum + (t.netProfit || t.profit), 0) + positions.reduce((sum, p) => sum + p.currentPnL, 0),
    bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.netProfit || t.profit)) : 0,
    worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.netProfit || t.profit)) : 0,
    totalFees: trades.reduce((sum, t) => sum + (t.fees || 0), 0),
    totalGasCosts: trades.reduce((sum, t) => sum + (t.gasCosts || 0), 0)
  };

  const profitHistory = trades.reduce((acc: { time: string; profit: number }[], trade, index) => {
    const prevProfit = index > 0 ? acc[index - 1].profit : 0;
    return [...acc, {
      time: new Date(trade.exitTime).toLocaleDateString(),
      profit: prevProfit + (trade.netProfit || trade.profit)
    }];
  }, []);

  const todayPnL = metrics.totalPnL - todayStartPnL;

  return (
    <div className="space-y-6">
      {!settings.realTradingMode ? (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-300 font-medium">SIMULATION MODE - No real trades executed</p>
          </div>
          <p className="text-yellow-200 text-sm mt-1">
            This bot simulates arbitrage trading. Enable Real Trading Mode in settings when ready.
          </p>
        </div>
      ) : (
        <div className="bg-red-900 bg-opacity-30 border-2 border-red-600 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            <p className="text-red-300 font-bold text-lg">LIVE TRADING - Real Money at Risk!</p>
          </div>
          <p className="text-red-200 text-sm mt-1">
            All trades will execute on Polygon blockchain. Gas costs apply. Network: Polygon | Est. Gas: ${estimatedGas.toFixed(4)}
          </p>
        </div>
      )}

      {isDailyLimitReached && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 font-medium">Daily Loss Limit Reached: -${Math.abs(todayPnL).toFixed(2)}</p>
            </div>
            <button
              onClick={resetDailyLimit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Reset Limit
            </button>
          </div>
        </div>
      )}

      <ArbitrageMetricsPanel metrics={metrics} profitHistory={profitHistory} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Arbitrage Scanner</h2>
          {lastScanTime && (
            <p className="text-sm text-gray-400 mt-1">
              Last scan: {new Date(lastScanTime).toLocaleTimeString()} | Today's P&L: <span className={todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}>{todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isScanning && (
            <button
              onClick={handleEmergencyStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Emergency Stop
            </button>
          )}
          <button
            onClick={handleStartStop}
            disabled={isDailyLimitReached}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isScanning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700 disabled:cursor-not-allowed'
            }`}
          >
            {isScanning ? (
              <>
                <Square className="w-5 h-5" />
                Stop Scanning
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Scanning
              </>
            )}
          </button>
        </div>
      </div>

      <ArbitrageSettingsPanel
        settings={settings}
        onChange={setSettings}
        onShowRealTradingWarning={handleRealTradingWarning}
      />

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Active Opportunities</h3>
        {isLoading && opportunities.length === 0 && !lastScanTime ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Scanning for opportunities...</p>
          </div>
        ) : (
          <ArbitrageOpportunitiesTable
            opportunities={opportunities}
            onExecute={handleExecuteTrade}
            isSimulation={!settings.realTradingMode}
            isScanning={isScanning}
            lastScanTime={lastScanTime}
            scanInterval={settings.scanInterval}
            currentSettings={{
              minSpreadPercent: settings.minSpreadPercent,
              positionSize: settings.positionSize,
              maxConcurrentPositions: settings.maxConcurrentPositions
            }}
            onApplySettings={(newSettings) => {
              setSettings({ ...settings, ...newSettings });
              toast.success(`Settings updated: Minimum spread now ${newSettings.minSpreadPercent.toFixed(1)}%`);
            }}
          />
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Your Positions ({positions.length})</h3>
        <ArbitragePositionsTable positions={positions} onClose={handleClosePosition} />
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Trade History ({trades.length})</h3>
        <ArbitrageTradeHistory trades={trades} />
      </div>

      {showRealTradingWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border-2 border-red-600">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-red-400" />
              <h3 className="text-2xl font-bold text-red-400">WARNING: Real Trading Mode</h3>
            </div>

            <div className="space-y-4 mb-6 text-white">
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                <h4 className="font-bold text-red-300 mb-2">CRITICAL INFORMATION:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-200">
                  <li>This will execute REAL transactions with REAL money on Polygon blockchain</li>
                  <li>You can LOSE money - arbitrage is not risk-free</li>
                  <li>Gas fees apply to every transaction</li>
                  <li>Market prices can move against you</li>
                  <li>Partial fills may occur</li>
                  <li>You are responsible for all trades and losses</li>
                </ul>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="font-bold text-gray-300 mb-2">Safety Features Enabled:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>All trades require manual confirmation</li>
                  <li>Balance checks before every trade</li>
                  <li>Daily loss limit: ${settings.dailyLossLimit}</li>
                  <li>Emergency stop button available</li>
                  <li>Auto-execute disabled in real mode</li>
                </ul>
              </div>

              <div className="text-sm text-gray-300">
                <p className="font-bold mb-2">By enabling Real Trading Mode, you acknowledge:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You understand the risks involved</li>
                  <li>You have tested in simulation mode</li>
                  <li>You have sufficient funds and understand potential losses</li>
                  <li>This software is provided as-is with no guarantees</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowRealTradingWarningModal(false);
                  setSettings({ ...settings, realTradingMode: false });
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel - Stay in Simulation
              </button>
              <button
                onClick={confirmRealTrading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
              >
                I Understand - Enable Real Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {showSafetyCheckModal && selectedOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 border border-red-600">
            <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ REAL TRADE CONFIRMATION</h3>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Market Pair</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-white text-sm">{selectedOpportunity.marketPair.market1.question}</p>
                    <p className="text-gray-400 text-xs">Entry Price: ${selectedOpportunity.marketPair.market1.price.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-white text-sm">{selectedOpportunity.marketPair.market2.question}</p>
                    <p className="text-gray-400 text-xs">Entry Price: ${selectedOpportunity.marketPair.market2.price.toFixed(3)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Position</p>
                  <p className="text-lg font-bold text-white">${settings.positionSize}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Spread</p>
                  <p className="text-lg font-bold text-green-400">{selectedOpportunity.profitPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Est. Gas</p>
                  <p className="text-lg font-bold text-yellow-400">${estimatedGas.toFixed(4)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Net Profit</p>
                  <p className="text-lg font-bold text-green-400">
                    ${calculateOrderCosts(settings.positionSize, selectedOpportunity.profitPercent).estimatedProfit.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
                <p className="text-xs text-red-300 font-bold mb-2">Final Confirmation Required</p>
                <p className="text-xs text-red-200 mb-3">Type CONFIRM below to execute this real trade:</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="w-full px-4 py-2 bg-gray-900 border border-red-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowSafetyCheckModal(false);
                  setSelectedOpportunity(null);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmText === 'CONFIRM') {
                    const safetyPassed = await performSafetyChecks();
                    if (safetyPassed) {
                      await executeTrade(selectedOpportunity, true);
                    }
                  } else {
                    toast.error('Please type CONFIRM to proceed');
                  }
                }}
                disabled={confirmText !== 'CONFIRM'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                Execute Real Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && selectedOpportunity && !settings.realTradingMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Simulated Trade</h3>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Market Pair</h4>
                <p className="text-white text-sm">{selectedOpportunity.marketPair.market1.question}</p>
                <p className="text-gray-400 text-xs">Price: ${selectedOpportunity.marketPair.market1.price.toFixed(2)}</p>
                <p className="text-white text-sm mt-2">{selectedOpportunity.marketPair.market2.question}</p>
                <p className="text-gray-400 text-xs">Price: ${selectedOpportunity.marketPair.market2.price.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Position Size</p>
                  <p className="text-lg font-bold text-white">${settings.positionSize.toFixed(2)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Arbitrage Spread</p>
                  <p className="text-lg font-bold text-green-400">{selectedOpportunity.profitPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Expected Profit</p>
                  <p className="text-lg font-bold text-green-400">
                    ${((selectedOpportunity.profitPercent / 100) * settings.positionSize).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  <strong>Note:</strong> This is a simulated trade. No real funds will be used.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedOpportunity(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeTrade(selectedOpportunity, false)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Execute Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
