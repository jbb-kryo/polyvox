import { RiskMetrics as RiskMetricsType } from '../../types/analytics';
import { AlertTriangle, TrendingDown, Activity, Shield } from 'lucide-react';

interface RiskMetricsProps {
  metrics: RiskMetricsType;
}

export default function RiskMetrics({ metrics }: RiskMetricsProps) {
  const formatPercent = (value: number | null) => value !== null ? `${value.toFixed(2)}%` : '0.00%';
  const formatCurrency = (value: number | null) => value !== null ? `$${Math.abs(value).toFixed(2)}` : '$0.00';

  const getRiskLevel = (sharpe: number | null): { label: string; color: string } => {
    if (sharpe === null || sharpe === 0) return { label: 'N/A', color: 'text-gray-400' };
    if (sharpe >= 2) return { label: 'Excellent', color: 'text-green-400' };
    if (sharpe >= 1) return { label: 'Good', color: 'text-blue-400' };
    if (sharpe >= 0) return { label: 'Fair', color: 'text-yellow-400' };
    return { label: 'Poor', color: 'text-red-400' };
  };

  const riskLevel = getRiskLevel(metrics.sharpeRatio);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Risk Metrics</h2>
        <Shield className="w-5 h-5 text-blue-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Sharpe Ratio</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.sharpeRatio !== null ? metrics.sharpeRatio.toFixed(2) : 'N/A'}
          </div>
          <div className={`text-xs font-medium ${riskLevel.color}`}>
            {riskLevel.label}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Max Drawdown</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(metrics.maxDrawdown)}
          </div>
          <div className="text-xs text-gray-500">
            {formatPercent(metrics.maxDrawdownPercent)}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Volatility</span>
            <Activity className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPercent(metrics.volatility)}
          </div>
          <div className="text-xs text-gray-500">
            Annualized
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Calmar Ratio</span>
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.calmarRatio !== null ? metrics.calmarRatio.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            Risk-adjusted
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Sortino Ratio</div>
          <div className="text-xl font-bold text-white">{metrics.sortinoRatio !== null ? metrics.sortinoRatio.toFixed(2) : 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1">Downside deviation adjusted</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Value at Risk (95%)</span>
          </div>
          <div className="text-xl font-bold text-orange-400">{formatPercent(metrics.valueAtRisk)}</div>
          <div className="text-xs text-gray-500 mt-1">Potential loss threshold</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Expected Shortfall</span>
          </div>
          <div className="text-xl font-bold text-red-400">{formatPercent(metrics.expectedShortfall)}</div>
          <div className="text-xs text-gray-500 mt-1">Tail risk</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-300 mb-1">Risk Assessment</div>
            <p className="text-xs text-gray-400">
              {metrics.sharpeRatio !== null && metrics.sharpeRatio >= 1
                ? 'Your portfolio shows good risk-adjusted returns. Continue monitoring drawdowns and maintain diversification.'
                : metrics.sharpeRatio !== null && metrics.sharpeRatio > 0
                ? 'Consider improving risk management. Focus on reducing volatility and protecting against drawdowns.'
                : 'Start trading to build performance history and analyze risk metrics.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
