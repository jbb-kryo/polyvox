import { useState, useEffect } from 'react';
import { Download, RefreshCw, BarChart3, History, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import PerformanceComparison from './PerformanceComparison';
import RiskMetrics from './RiskMetrics';
import TradeCalendar from './TradeCalendar';
import ProfitAttribution from './ProfitAttribution';
import PerformanceChart from './PerformanceChart';
import TradeHistory from './TradeHistory';
import MetricsDashboard from './MetricsDashboard';
import TradeCalendarView from './TradeCalendarView';
import {
  getModulePerformance,
  getRiskMetrics,
  getTradeCalendar,
  getProfitAttribution,
  getPerformanceChart,
  exportToCSV
} from '../../services/analyticsService';
import {
  ModulePerformance,
  RiskMetrics as RiskMetricsType,
  TradeCalendarDay,
  ProfitAttribution as ProfitAttributionType,
  PerformanceChart as PerformanceChartType
} from '../../types/analytics';

interface AnalyticsProps {
  userId?: string;
}

type AnalyticsView = 'overview' | 'history' | 'metrics' | 'calendar';

export default function Analytics({ userId: propUserId }: AnalyticsProps) {
  const { user } = useAuth();
  const userId = user?.id || propUserId;

  const [currentView, setCurrentView] = useState<AnalyticsView>('overview');
  const [timeframe, setTimeframe] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  if (!userId || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sign In Required</h3>
          <p className="text-gray-400 mb-4">
            Please sign in to view your trading analytics and performance metrics.
          </p>
        </div>
      </div>
    );
  }

  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetricsType>({
    sharpeRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    volatility: 0,
    calmarRatio: 0,
    sortinoRatio: 0,
    valueAtRisk: 0,
    expectedShortfall: 0
  });
  const [calendarData, setCalendarData] = useState<TradeCalendarDay[]>([]);
  const [profitAttribution, setProfitAttribution] = useState<ProfitAttributionType[]>([]);
  const [performanceChart, setPerformanceChart] = useState<PerformanceChartType[]>([]);

  const loadAnalytics = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [performance, risk, calendar, attribution, chart] = await Promise.all([
        getModulePerformance(userId, timeframe),
        getRiskMetrics(userId, timeframe),
        getTradeCalendar(userId, 90),
        getProfitAttribution(userId, timeframe),
        getPerformanceChart(userId, timeframe)
      ]);

      setModulePerformance(performance);
      setRiskMetrics(risk);
      setCalendarData(calendar);
      setProfitAttribution(attribution);
      setPerformanceChart(chart);

      if (showToast) {
        toast.success('Analytics refreshed');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      if (showToast) {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, userId]);

  const handleExport = () => {
    const exportData = modulePerformance.map((m) => ({
      Module: m.moduleName,
      'Total Trades': m.totalTrades,
      'Winning Trades': m.winningTrades,
      'Win Rate %': m.winRate.toFixed(2),
      'Total P&L': m.totalPnL.toFixed(2),
      'Total Fees': m.totalFees.toFixed(2),
      'ROI %': m.roi.toFixed(2),
      'Sharpe Ratio': m.sharpeRatio?.toFixed(2) || 'N/A',
      'Max Drawdown': m.maxDrawdown?.toFixed(2) || 'N/A',
      'Avg Trade Duration (min)': m.avgTradeDuration
    }));

    exportToCSV(exportData, 'polyvox_analytics');
    toast.success('Analytics exported to CSV');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'history', label: 'Trade History', icon: History },
    { id: 'metrics', label: 'Advanced Metrics', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analytics</h2>

        <div className="flex items-center gap-4">
          {currentView === 'overview' && (
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          )}

          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {currentView === 'overview' && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as AnalyticsView)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-colors
                ${
                  currentView === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      ) : (
        <>
          {currentView === 'overview' && (
            <>
              {modulePerformance.length === 0 && performanceChart.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Trading Data Yet</h3>
                    <p className="text-gray-400 mb-4">
                      Start trading with one of the modules to see your analytics and performance metrics here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <PerformanceChart data={performanceChart} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PerformanceComparison modules={modulePerformance} />
                    <ProfitAttribution data={profitAttribution} />
                  </div>

                  <RiskMetrics metrics={riskMetrics} />

                  <TradeCalendar data={calendarData} />
                </div>
              )}
            </>
          )}

          {currentView === 'history' && (
            <TradeHistory userId={userId} />
          )}

          {currentView === 'metrics' && (
            <MetricsDashboard userId={userId} days={timeframe} />
          )}

          {currentView === 'calendar' && (
            <TradeCalendarView userId={userId} />
          )}
        </>
      )}
    </div>
  );
}
