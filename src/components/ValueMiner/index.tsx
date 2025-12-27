import { useState, useEffect } from 'react';
import { Play, Square, AlertCircle, Shield, Calculator, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import ValueMinerMetricsPanel from './ValueMinerMetrics';
import MarketScanner from './MarketScanner';
import ValueMinerSettingsPanel from './ValueMinerSettings';
import { ValueMinerSettings, ValueMarket, ValuePosition, ValueMinerMetrics } from '../../types/valueminer';
import { calculateKellyFraction } from '../../services/edgeCalculator';
import {
  scanForValueOpportunities,
  saveValueMarkets,
  filterHighQualitySignals,
  rankMarketsByQuality
} from '../../services/valueOpportunityScanner';
import { useAuth } from '../../contexts/AuthContext';

interface ValueMinerProps {
  paperTradingMode: boolean;
  walletAddress: string;
  useCorsProxy: boolean;
}

export default function ValueMiner({ paperTradingMode, walletAddress, useCorsProxy }: ValueMinerProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [showRealTradingWarningModal, setShowRealTradingWarningModal] = useState(false);
  const [scanDuration, setScanDuration] = useState<number | null>(null);

  const [settings, setSettings] = useState<ValueMinerSettings>({
    minEdge: 5,
    maxEdge: 50,
    categoryFilters: [],
    minVolume: 10000,
    autoTradeEnabled: false,
    autoTradeMinEdge: 10,
    positionSizingMethod: 'kelly',
    kellyFraction: 0.5,
    fixedPercent: 5,
    fixedAmount: 100,
    maxPositionPercent: 10,
    maxCategoryPercent: 30,
    diversificationRules: {
      maxPerMarket: 500,
      maxPerCategory: 2000,
      maxCorrelation: 0.7
    },
    exitRules: {
      exitWhenEdgeGone: true,
      minEdgeToHold: 2,
      autoExitOnExpiry: true,
      stopLossPercent: 20
    },
    dataSources: {
      use538: true,
      useWeather: true,
      useSportsOdds: true,
      useHistoricalRates: true,
      allowManualInputs: false
    },
    realTradingMode: false
  });

  const [markets, setMarkets] = useState<ValueMarket[]>([]);
  const [positions, setPositions] = useState<ValuePosition[]>([]);
  const [bankroll] = useState(10000);

  const [metrics, setMetrics] = useState<ValueMinerMetrics>({
    totalSignals: 0,
    highEdgeSignals: 0,
    openPositions: 0,
    totalPnL: 0,
    roi: 0,
    winRate: 0
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('valueminer_settings');
    const savedPositions = localStorage.getItem('valueminer_positions');
    const savedMarkets = localStorage.getItem('valueminer_markets');

    if (savedSettings) {
      try {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    if (savedPositions) {
      try {
        setPositions(JSON.parse(savedPositions));
      } catch (e) {
        console.error('Error loading positions:', e);
      }
    }

    if (savedMarkets) {
      try {
        setMarkets(JSON.parse(savedMarkets));
      } catch (e) {
        console.error('Error loading markets:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('valueminer_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('valueminer_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('valueminer_markets', JSON.stringify(markets));
  }, [markets]);

  useEffect(() => {
    let scanInterval: NodeJS.Timeout;

    if (isRunning) {
      performScan();
      scanInterval = setInterval(() => {
        performScan();
      }, 60000);
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [isRunning, settings, bankroll]);

  useEffect(() => {
    const filteredMarkets = markets.filter(m =>
      m.best_edge !== null &&
      m.best_edge >= settings.minEdge &&
      m.best_edge <= settings.maxEdge &&
      m.volume_24h >= settings.minVolume
    );

    const highEdge = filteredMarkets.filter(m => m.best_edge! >= settings.autoTradeMinEdge).length;
    const closedPositions = positions.filter(p => p.status === 'closed');
    const winningPositions = closedPositions.filter(p => p.pnl > 0).length;
    const winRate = closedPositions.length > 0 ? (winningPositions / closedPositions.length) * 100 : 0;
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const totalStaked = positions.reduce((sum, p) => sum + p.position_size, 0);
    const roi = totalStaked > 0 ? (totalPnL / totalStaked) * 100 : 0;

    setMetrics({
      totalSignals: filteredMarkets.length,
      highEdgeSignals: highEdge,
      openPositions: positions.filter(p => p.status === 'open').length,
      totalPnL,
      roi,
      winRate
    });
  }, [markets, positions, settings]);

  const performScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setLastScanTime(Date.now());

    try {
      const result = await scanForValueOpportunities(settings, bankroll, useCorsProxy, false);

      setScanDuration(result.scanDuration);

      const rankedMarkets = rankMarketsByQuality(result.markets, {
        edgeWeight: 0.5,
        confidenceWeight: 0.3,
        volumeWeight: 0.2
      });

      setMarkets(rankedMarkets);

      const highQuality = filterHighQualitySignals(rankedMarkets, 0.7, settings.autoTradeMinEdge);

      if (user) {
        await saveValueMarkets(rankedMarkets.slice(0, 20), user.id);
      }

      if (result.valueOpportunities > 0) {
        toast.success(
          `Found ${result.valueOpportunities} value opportunities (${result.highEdgeOpportunities} high-edge)`,
          { icon: <TrendingUp className="w-5 h-5" />, duration: 4000 }
        );
      } else {
        toast('No value opportunities found', { icon: '🔍' });
      }

      if (settings.autoTradeEnabled && highQuality.length > 0 && !settings.realTradingMode) {
        for (const market of highQuality.slice(0, 3)) {
          await handleTakePosition(market);
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan for value opportunities');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTakePosition = async (market: ValueMarket) => {
    if (settings.realTradingMode) {
      toast.error('Real trading not implemented yet');
      return;
    }

    if (!market.best_side || !market.best_edge) {
      toast.error('Invalid market signal');
      return;
    }

    const side = market.best_side;
    const odds = side === 'YES' ? market.pm_yes_odds : market.pm_no_odds;
    const edge = market.best_edge;

    let positionSize = 0;

    if (settings.positionSizingMethod === 'kelly') {
      positionSize = calculateKellyFraction(edge, odds, bankroll, settings.kellyFraction);
    } else if (settings.positionSizingMethod === 'fixed_percent') {
      positionSize = bankroll * (settings.fixedPercent / 100);
    } else {
      positionSize = settings.fixedAmount;
    }

    positionSize = Math.min(positionSize, settings.diversificationRules.maxPerMarket);

    if (positionSize < 10) {
      toast.error('Position size too small');
      return;
    }

    const newPosition: ValuePosition = {
      id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: user?.id || walletAddress || 'demo-user',
      market_id: market.market_id,
      market_question: market.market_question,
      side: side,
      entry_odds: odds,
      entry_edge: edge,
      position_size: positionSize,
      kelly_fraction: settings.positionSizingMethod === 'kelly' ? settings.kellyFraction : null,
      current_odds: odds,
      current_edge: edge,
      pnl: 0,
      expected_value: (edge / 100) * positionSize,
      status: 'open',
      exit_odds: null,
      exit_reason: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setPositions(prev => [...prev, newPosition]);
    toast.success(
      `Position opened: ${side} @ ${(odds * 100).toFixed(1)}% | Edge: ${edge.toFixed(1)}% | Size: $${positionSize.toFixed(2)}`,
      { duration: 5000 }
    );
  };

  const handleStartStop = () => {
    if (isRunning) {
      setIsRunning(false);
      toast.success('Scanner stopped');
    } else {
      setIsRunning(true);
      toast.success('Scanner started');
    }
  };

  const handleRealTradingWarning = () => {
    setShowRealTradingWarningModal(true);
  };

  const confirmRealTrading = () => {
    setSettings({ ...settings, realTradingMode: true, autoTradeEnabled: false });
    setShowRealTradingWarningModal(false);
    toast.success('Real Trading Mode ENABLED');
  };

  return (
    <div className="space-y-6">
      {!settings.realTradingMode ? (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-300 font-medium">SIMULATION MODE - Demo value bets</p>
          </div>
          <p className="text-yellow-200 text-sm mt-1">
            Scanning {markets.length > 0 ? markets.length : 'markets'} for statistical edge using fair value estimation. All positions are simulated.
          </p>
        </div>
      ) : (
        <div className="bg-red-900 bg-opacity-30 border-2 border-red-600 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            <p className="text-red-300 font-bold text-lg">LIVE TRADING - Real Money at Risk!</p>
          </div>
          <p className="text-red-200 text-sm mt-1">
            Value bets will be placed on Polygon blockchain. Kelly sizing active.
          </p>
        </div>
      )}

      <ValueMinerMetricsPanel metrics={metrics} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            ValueMiner - Statistical Edge Calculator
          </h2>
          {lastScanTime && (
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-400">
                Last scan: {new Date(lastScanTime).toLocaleTimeString()}
              </p>
              {scanDuration && (
                <p className="text-sm text-gray-500">
                  Duration: {(scanDuration / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleStartStop}
          disabled={isScanning}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRunning ? (
            <>
              <Square className="w-5 h-5" />
              Stop Scanner
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Scanner
            </>
          )}
        </button>
      </div>

      <ValueMinerSettingsPanel
        settings={settings}
        onUpdate={setSettings}
        onShowRealTradingWarning={handleRealTradingWarning}
      />

      <MarketScanner
        markets={markets}
        onTakePosition={handleTakePosition}
        isScanning={isScanning}
      />

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
                  <li>Value bets based on edge calculations may be incorrect</li>
                  <li>External data sources may be inaccurate or outdated</li>
                  <li>You can LOSE money - positive edge does not guarantee profit</li>
                  <li>Gas fees apply to every transaction</li>
                  <li>Kelly criterion is theoretical - actual results vary</li>
                  <li>Market inefficiencies may not exist as calculated</li>
                </ul>
              </div>

              <div className="text-sm text-gray-300">
                <p className="font-bold mb-2">By enabling Real Trading Mode, you acknowledge:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You understand statistical edge does not guarantee wins</li>
                  <li>You have tested in simulation mode</li>
                  <li>You are responsible for all bets and losses</li>
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
    </div>
  );
}
