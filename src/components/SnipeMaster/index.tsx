import { useState, useEffect } from 'react';
import { Play, Square, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import SnipeMetrics from './SnipeMetrics';
import SnipeOrdersTable from './SnipeOrdersTable';
import SnipePositionsTable from './SnipePositionsTable';
import SnipeSettings from './SnipeSettings';
import SnipeTradeHistory from './SnipeTradeHistory';
import { SnipeMasterSettings, SnipeOrder, SnipePosition, SnipeMetrics as SnipeMetricsType } from '../../types/snipemaster';
import {
  scanForSnipeOpportunities,
  analyzeOrderBookDepth,
  calculateOptimalSnipePrice,
  createOrderLadder,
  detectOrderFills,
  autoManageOrders,
  createPositionFromFilledOrder,
  updateOrderStatus
} from '../../services/snipeExecutor';
import { useAuth } from '../../contexts/AuthContext';

interface SnipeMasterProps {
  paperTradingMode: boolean;
  useCorsProxy: boolean;
  walletAddress: string;
  walletPrivateKey: string;
}

export default function SnipeMaster({ paperTradingMode, useCorsProxy, walletAddress, walletPrivateKey }: SnipeMasterProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [todayStartPnL, setTodayStartPnL] = useState(0);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const [showRealTradingWarningModal, setShowRealTradingWarningModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [settings, setSettings] = useState<SnipeMasterSettings>({
    enabled: true,
    minProfitPercent: 5,
    maxPositionSize: 100,
    targetDiscount: 3,
    timeoutMinutes: 60,
    autoExecute: false,
    realTradingMode: false,
    dailyLossLimit: 50,
    scanInterval: 30,
    maxConcurrentOrders: 10,
    enableLaddering: true,
    ladderOrders: 3,
    resubmitAfterCancel: true,
    maxResubmits: 2,
    minLiquidity: 1000,
    maxSpread: 10
  });

  const [metrics, setMetrics] = useState<SnipeMetricsType>({
    totalOrders: 0,
    filledOrders: 0,
    avgDiscount: 0,
    totalPnL: 0,
    fillRate: 0,
    avgFillTime: 0,
    cancelledOrders: 0,
    expiredOrders: 0
  });

  const [orders, setOrders] = useState<SnipeOrder[]>([]);
  const [positions, setPositions] = useState<SnipePosition[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    const savedPositions = localStorage.getItem('snipe_positions');
    const savedTrades = localStorage.getItem('snipe_trades');
    const savedSettings = localStorage.getItem('snipe_settings');
    const savedOrders = localStorage.getItem('snipe_orders');
    const savedTodayStart = localStorage.getItem('snipe_today_start');

    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedPositions) setPositions(JSON.parse(savedPositions));
    if (savedTrades) setTrades(JSON.parse(savedTrades));
    if (savedSettings) setSettings({ ...settings, ...JSON.parse(savedSettings) });
    if (savedTodayStart) setTodayStartPnL(parseFloat(savedTodayStart));

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastReset = localStorage.getItem('snipe_daily_reset');
    if (!lastReset || parseInt(lastReset) < midnight) {
      setTodayStartPnL(0);
      localStorage.setItem('snipe_daily_reset', midnight.toString());
      localStorage.setItem('snipe_today_start', '0');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('snipe_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('snipe_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('snipe_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('snipe_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const currentPnL = trades.reduce((sum, t) => sum + t.pnl, 0) + positions.reduce((sum, p) => sum + p.pnl, 0);
    const todayPnL = currentPnL - todayStartPnL;

    if (todayPnL < -settings.dailyLossLimit) {
      if (!isDailyLimitReached) {
        setIsDailyLimitReached(true);
        setIsRunning(false);
        toast.error(`Daily loss limit reached: -$${Math.abs(todayPnL).toFixed(2)}`);
      }
    }
  }, [trades, positions, todayStartPnL, settings.dailyLossLimit]);

  useEffect(() => {
    let scanInterval: NodeJS.Timeout;

    if (isRunning && !isDailyLimitReached) {
      performScan();
      scanInterval = setInterval(() => {
        performScan();
      }, settings.scanInterval * 1000);
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [isRunning, settings.scanInterval, isDailyLimitReached]);

  useEffect(() => {
    let fillCheckInterval: NodeJS.Timeout;

    if (orders.filter(o => o.status === 'pending').length > 0) {
      fillCheckInterval = setInterval(() => {
        checkOrderFills();
      }, 5000);
    }

    return () => {
      if (fillCheckInterval) clearInterval(fillCheckInterval);
    };
  }, [orders]);

  useEffect(() => {
    let orderManagementInterval: NodeJS.Timeout;

    if (isRunning) {
      orderManagementInterval = setInterval(() => {
        manageOrders();
      }, 10000);
    }

    return () => {
      if (orderManagementInterval) clearInterval(orderManagementInterval);
    };
  }, [isRunning, orders, settings]);

  useEffect(() => {
    let priceUpdateInterval: NodeJS.Timeout;

    if (positions.length > 0) {
      priceUpdateInterval = setInterval(() => {
        updatePositionPrices();
      }, 5000);
    }

    return () => {
      if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    };
  }, [positions]);

  const performScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setLastScanTime(Date.now());

    try {
      const activeOrders = orders.filter(o => o.status === 'pending');

      const opportunities = await scanForSnipeOpportunities(
        {
          minProfitPercent: settings.minProfitPercent,
          targetDiscount: settings.targetDiscount,
          maxPositionSize: settings.maxPositionSize,
          maxConcurrentOrders: settings.maxConcurrentOrders
        },
        activeOrders.length,
        useCorsProxy
      );

      if (opportunities.length > 0) {
        toast.success(`Found ${opportunities.length} snipe opportunities`);

        if (settings.autoExecute && opportunities.length > 0 && activeOrders.length < settings.maxConcurrentOrders) {
          const topOpp = opportunities[0];
          await handlePlaceOrder(topOpp.market, topOpp.optimalPrice, topOpp.orderBookDepth);
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan for opportunities');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePlaceOrder = async (
    market: any,
    optimalPrice: any,
    orderBookDepth: any
  ) => {
    try {
      if (settings.enableLaddering && settings.ladderOrders > 1) {
        const ladder = createOrderLadder(
          settings.maxPositionSize,
          optimalPrice,
          settings.ladderOrders,
          2
        );

        const newOrders: SnipeOrder[] = ladder.orders.map((ladderOrder, index) => ({
          id: `order-${Date.now()}-${index}`,
          marketId: market.id,
          marketTitle: market.question,
          side: optimalPrice.side,
          currentPrice: optimalPrice.currentPrice,
          limitPrice: ladderOrder.price,
          discount: ladderOrder.discount,
          size: ladderOrder.size,
          status: 'pending' as const,
          createdAt: new Date(),
          confidence: optimalPrice.confidence,
          expectedFillTime: optimalPrice.expectedFillTime,
          orderBookScore: orderBookDepth.depthScore,
          ladderIndex: index
        }));

        setOrders(prev => [...prev, ...newOrders]);
        toast.success(`Placed ${newOrders.length} ladder orders at avg ${ladder.avgPrice.toFixed(4)}`);
      } else {
        const newOrder: SnipeOrder = {
          id: `order-${Date.now()}`,
          marketId: market.id,
          marketTitle: market.question,
          side: optimalPrice.side,
          currentPrice: optimalPrice.currentPrice,
          limitPrice: optimalPrice.recommendedPrice,
          discount: optimalPrice.discount,
          size: settings.maxPositionSize,
          status: 'pending',
          createdAt: new Date(),
          confidence: optimalPrice.confidence,
          expectedFillTime: optimalPrice.expectedFillTime,
          orderBookScore: orderBookDepth.depthScore
        };

        setOrders(prev => [...prev, newOrder]);
        toast.success(`Order placed at ${optimalPrice.recommendedPrice.toFixed(4)} (${optimalPrice.discount.toFixed(1)}% discount)`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const checkOrderFills = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');

    if (pendingOrders.length === 0) return;

    try {
      const fillResults = await detectOrderFills(pendingOrders, useCorsProxy);

      for (const result of fillResults) {
        if (result.filled) {
          const order = orders.find(o => o.id === result.orderId);
          if (!order) continue;

          setOrders(prev => prev.map(o =>
            o.id === result.orderId
              ? { ...o, status: 'filled' as const, filledAt: result.filledAt }
              : o
          ));

          const newPosition: SnipePosition = {
            id: `pos-${Date.now()}`,
            marketId: order.marketId,
            marketTitle: order.marketTitle,
            side: order.side,
            entryPrice: result.fillPrice || order.limitPrice,
            currentPrice: result.fillPrice || order.limitPrice,
            size: order.size,
            pnl: 0,
            pnlPercent: 0,
            openedAt: new Date()
          };

          setPositions(prev => [...prev, newPosition]);
          toast.success(`Order filled at ${(result.fillPrice || order.limitPrice).toFixed(4)}!`);

          if (user && result.fillPrice) {
            await createPositionFromFilledOrder(order, result.fillPrice, user.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking fills:', error);
    }
  };

  const manageOrders = async () => {
    try {
      const managementResult = await autoManageOrders(
        orders,
        {
          timeoutMinutes: settings.timeoutMinutes,
          resubmitAfterCancel: settings.resubmitAfterCancel,
          maxResubmits: settings.maxResubmits,
          targetDiscount: settings.targetDiscount,
          minProfitPercent: settings.minProfitPercent
        },
        useCorsProxy
      );

      if (managementResult.toCancel.length > 0) {
        setOrders(prev => prev.map(order =>
          managementResult.toCancel.includes(order.id)
            ? { ...order, status: 'expired' as const }
            : order
        ));

        for (const orderId of managementResult.toCancel) {
          if (user) {
            await updateOrderStatus(orderId, 'expired');
          }
        }

        toast(`${managementResult.toCancel.length} orders expired`);
      }

      if (managementResult.toResubmit.length > 0 && settings.resubmitAfterCancel) {
        toast(`Resubmitting ${managementResult.toResubmit.length} orders`);
      }
    } catch (error) {
      console.error('Error managing orders:', error);
    }
  };

  const updatePositionPrices = () => {
    setPositions(prev => prev.map(pos => {
      const priceChange = (Math.random() - 0.5) * 0.02;
      const newPrice = Math.max(0.01, Math.min(0.99, pos.currentPrice + priceChange));
      const pnl = (newPrice - pos.entryPrice) * pos.size;
      const pnlPercent = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100;
      return {
        ...pos,
        currentPrice: newPrice,
        pnl,
        pnlPercent
      };
    }));
  };

  useEffect(() => {
    const totalOrders = orders.length;
    const filledOrders = orders.filter(o => o.status === 'filled').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const expiredOrders = orders.filter(o => o.status === 'expired').length;

    const avgDiscount = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.discount, 0) / orders.length
      : 0;

    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);

    const fillRate = totalOrders > 0 ? (filledOrders / totalOrders) * 100 : 0;

    const filledOrdersWithTime = orders.filter(o => o.status === 'filled' && o.filledAt);
    const avgFillTime = filledOrdersWithTime.length > 0
      ? filledOrdersWithTime.reduce((sum, o) => {
          const fillTime = (new Date(o.filledAt!).getTime() - new Date(o.createdAt).getTime()) / 60000;
          return sum + fillTime;
        }, 0) / filledOrdersWithTime.length
      : 0;

    setMetrics({
      totalOrders,
      filledOrders,
      avgDiscount,
      totalPnL,
      fillRate,
      avgFillTime,
      cancelledOrders,
      expiredOrders
    });
  }, [orders, positions]);

  const handleStartStop = () => {
    if (isDailyLimitReached) {
      toast.error('Daily loss limit reached. Please reset or adjust settings.');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      toast.success('Scanner stopped');
    } else {
      setIsRunning(true);
      toast.success('Scanner started');
    }
  };

  const handleEmergencyStop = () => {
    setIsRunning(false);
    toast.error('EMERGENCY STOP: All scanning stopped');
  };

  const handleCancelOrder = async (orderId: string) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: 'cancelled' as const } : order
    ));

    if (user) {
      await updateOrderStatus(orderId, 'cancelled');
    }

    toast.success('Order cancelled');
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
    setTodayStartPnL(trades.reduce((sum, t) => sum + t.pnl, 0) + positions.reduce((sum, p) => sum + p.pnl, 0));
    localStorage.setItem('snipe_today_start', todayStartPnL.toString());
    toast.success('Daily limit reset');
  };

  const activeOrders = orders.filter(o => o.status === 'pending');

  const profitHistory = trades.reduce((acc: { time: string; profit: number }[], trade, index) => {
    const prevProfit = index > 0 ? acc[index - 1].profit : 0;
    return [...acc, {
      time: new Date(trade.executedAt).toLocaleDateString(),
      profit: prevProfit + trade.pnl
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
            This bot simulates limit order strategy. Enable Real Trading Mode in settings when ready.
          </p>
        </div>
      ) : (
        <div className="bg-red-900 bg-opacity-30 border-2 border-red-600 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            <p className="text-red-300 font-bold text-lg">LIVE TRADING - Real Money at Risk!</p>
          </div>
          <p className="text-red-200 text-sm mt-1">
            All orders will execute on Polygon blockchain. Gas costs apply.
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

      <SnipeMetrics metrics={metrics} profitHistory={profitHistory} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Order Scanner</h2>
          {lastScanTime && (
            <p className="text-sm text-gray-400 mt-1">
              Last scan: {new Date(lastScanTime).toLocaleTimeString()} | Today's P&L: <span className={todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}>{todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isRunning && (
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
              isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700 disabled:cursor-not-allowed'
            }`}
          >
            {isRunning ? (
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

      <SnipeSettings
        settings={settings}
        onUpdate={setSettings}
        onShowRealTradingWarning={handleRealTradingWarning}
      />

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Active Orders ({activeOrders.length})</h3>
        <SnipeOrdersTable orders={activeOrders} onCancel={handleCancelOrder} />
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Filled Positions ({positions.length})</h3>
        <SnipePositionsTable positions={positions} />
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Trade History ({trades.length})</h3>
        <SnipeTradeHistory trades={trades} />
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
                  <li>You can LOSE money - limit orders may not fill at favorable prices</li>
                  <li>Gas fees apply to every transaction</li>
                  <li>Market prices can move against you while orders are pending</li>
                  <li>Orders may expire unfilled</li>
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
    </div>
  );
}
