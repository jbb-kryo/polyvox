import { ArbitrageOpportunity } from '../../types/arbitrage';
import { TrendingUp, Zap, AlertCircle, Settings, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ArbitrageOpportunitiesTableProps {
  opportunities: ArbitrageOpportunity[];
  onExecute: (opportunity: ArbitrageOpportunity) => void;
  isSimulation: boolean;
  isScanning: boolean;
  lastScanTime: number | null;
  scanInterval: number;
  currentSettings: {
    minSpreadPercent: number;
    positionSize: number;
    maxConcurrentPositions: number;
  };
  onApplySettings?: (settings: { minSpreadPercent: number }) => void;
}

export default function ArbitrageOpportunitiesTable({
  opportunities,
  onExecute,
  isSimulation,
  isScanning,
  lastScanTime,
  scanInterval,
  currentSettings,
  onApplySettings
}: ArbitrageOpportunitiesTableProps) {
  const [secondsUntilNextScan, setSecondsUntilNextScan] = useState<number | null>(null);

  useEffect(() => {
    if (!isScanning || !lastScanTime) {
      setSecondsUntilNextScan(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastScanTime) / 1000);
      const remaining = Math.max(0, scanInterval - elapsed);
      setSecondsUntilNextScan(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isScanning, lastScanTime, scanInterval]);
  const getProfitColor = (percent: number) => {
    if (percent >= 5) return 'text-green-400';
    if (percent >= 3) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getProfitBgColor = (percent: number) => {
    if (percent >= 5) return 'bg-green-900 bg-opacity-20 border-green-700';
    if (percent >= 3) return 'bg-yellow-900 bg-opacity-20 border-yellow-700';
    return 'bg-gray-800 border-gray-700';
  };

  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  if (opportunities.length === 0) {
    const recommendedSpread = Math.max(1.0, currentSettings.minSpreadPercent - 1.5);
    const canOptimize = currentSettings.minSpreadPercent > 1.5;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
        <div className="text-center mb-6">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 text-xl font-semibold">
            No Arbitrage Opportunities Found
          </p>
          {!isSimulation && (
            <p className="text-gray-400 text-sm mt-2">
              Scanning live Polymarket data - no profitable arbitrage detected at current settings
            </p>
          )}
        </div>

        {isScanning && secondsUntilNextScan !== null && (
          <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <p className="text-blue-300 font-medium">
                Next scan in {secondsUntilNextScan}s
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Why No Opportunities?</h4>
                <ul className="text-gray-400 text-sm space-y-1.5">
                  <li>Polymarket is an efficient market with narrow spreads</li>
                  <li>Current minimum spread requirement: {currentSettings.minSpreadPercent}%</li>
                  <li>Real arbitrage opportunities are rare and quickly filled</li>
                  <li>Market makers keep pricing efficient across YES/NO outcomes</li>
                </ul>
              </div>
            </div>
          </div>

          {canOptimize && onApplySettings && (
            <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-green-300 font-semibold mb-2">Recommended Settings Adjustment</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Lowering your minimum spread requirement may reveal more opportunities.
                    The recommended setting of <strong>{recommendedSpread.toFixed(1)}%</strong> provides a balance
                    between opportunity frequency and profit potential.
                  </p>
                  <div className="bg-gray-900 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Current Setting</p>
                        <p className="text-white font-bold">{currentSettings.minSpreadPercent}% minimum</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Recommended Setting</p>
                        <p className="text-green-400 font-bold">{recommendedSpread.toFixed(1)}% minimum</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-yellow-300 text-xs mb-3">
                    Note: Lower spreads mean lower profit per trade but more frequent opportunities
                  </p>
                  <button
                    onClick={() => onApplySettings({ minSpreadPercent: recommendedSpread })}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Apply Recommended Settings ({recommendedSpread.toFixed(1)}% minimum)
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isScanning && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">
                Scanner is not running. Click "Start Scanning" to begin searching for opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opp) => (
        <div
          key={opp.id}
          className={`border rounded-lg p-4 ${getProfitBgColor(opp.profitPercent)}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-4 h-4 ${getProfitColor(opp.profitPercent)}`} />
                <span className={`text-sm font-bold ${getProfitColor(opp.profitPercent)}`}>
                  {opp.profitPercent.toFixed(2)}% Arbitrage
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">
                      {truncate(opp.marketPair.market1.question, 45)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Price: ${opp.marketPair.market1.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">
                      {truncate(opp.marketPair.market2.question, 45)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Price: ${opp.marketPair.market2.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span>Combined: {(opp.combinedProbability * 100).toFixed(1)}%</span>
                <span>
                  Found: {new Date(opp.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className={`text-2xl font-bold ${getProfitColor(opp.profitPercent)}`}>
                  +{opp.profitPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400">Potential Profit</p>
              </div>

              <button
                onClick={() => onExecute(opp)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium mt-2"
              >
                Execute Trade
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
