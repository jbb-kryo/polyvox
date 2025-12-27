import { supabase } from '../lib/supabase';
import {
  ModulePerformance,
  RiskMetrics,
  TradeCalendarDay,
  ProfitAttribution,
  PerformanceChart
} from '../types/analytics';

export interface TradeFilters {
  startDate?: Date;
  endDate?: Date;
  moduleType?: string;
  marketId?: string;
  status?: string;
  minPnl?: number;
  maxPnl?: number;
  side?: 'YES' | 'NO' | 'BOTH';
  searchQuery?: string;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgWinPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  expectedValue: number;
  avgTradeDurationHours: number;
  avgWinningDurationHours: number;
  avgLosingDurationHours: number;
  totalFees: number;
}

export interface DailyReturn {
  date: string;
  dailyPnl: number;
  cumulativePnl: number;
  dailyReturnPct: number;
  tradeCount: number;
}

export interface DrawdownData {
  maxDrawdownPct: number;
  maxDrawdownAmount: number;
  peakDate: string | null;
  troughDate: string | null;
  recoveryDate: string | null;
  drawdownDurationDays: number;
}

export interface ModuleAttribution {
  moduleType: string;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  totalVolume: number;
  pnlContributionPct: number;
}

export interface MarketPerformance {
  marketId: string;
  marketQuestion: string;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  totalVolume: number;
  avgHoldTimeHours: number;
}

export interface CalendarData {
  date: string;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  winRate: number;
  bestTradePnl: number;
  worstTradePnl: number;
}

export interface HourlyPerformance {
  hourOfDay: number;
  tradeCount: number;
  winningTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface WinLossStreak {
  streakType: string;
  streakLength: number;
  startDate: string;
  endDate: string;
  totalPnl: number;
}

export async function getTradeHistory(
  userId: string,
  filters?: TradeFilters,
  limit: number = 100,
  offset: number = 0
) {
  let query = supabase
    .from('position_history')
    .select('*')
    .eq('user_id', userId);

  if (filters?.startDate) {
    query = query.gte('closed_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('closed_at', filters.endDate.toISOString());
  }

  if (filters?.moduleType) {
    query = query.eq('module_type', filters.moduleType);
  }

  if (filters?.marketId) {
    query = query.eq('market_id', filters.marketId);
  }

  if (filters?.status) {
    query = query.eq('final_status', filters.status);
  }

  if (filters?.side) {
    query = query.eq('side', filters.side);
  }

  if (filters?.minPnl !== undefined) {
    query = query.gte('realized_pnl', filters.minPnl);
  }

  if (filters?.maxPnl !== undefined) {
    query = query.lte('realized_pnl', filters.maxPnl);
  }

  if (filters?.searchQuery) {
    query = query.ilike('market_question', `%${filters.searchQuery}%`);
  }

  query = query
    .order('closed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching trade history:', error);
    return [];
  }

  return data || [];
}

export async function getTradeStatistics(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  moduleType?: string
): Promise<TradeStatistics> {
  try {
    const { data, error } = await supabase.rpc('get_trade_statistics', {
      p_user_id: userId,
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null,
      p_module_type: moduleType || null
    });

    if (error || !data || data.length === 0) {
      return getEmptyStatistics();
    }

    const stats = data[0];
    return {
      totalTrades: stats.total_trades || 0,
      winningTrades: stats.winning_trades || 0,
      losingTrades: stats.losing_trades || 0,
      breakEvenTrades: stats.break_even_trades || 0,
      winRate: stats.win_rate || 0,
      totalPnl: stats.total_pnl || 0,
      avgWin: stats.avg_win || 0,
      avgLoss: stats.avg_loss || 0,
      largestWin: stats.largest_win || 0,
      largestLoss: stats.largest_loss || 0,
      avgWinPercent: stats.avg_win_pct || 0,
      avgLossPercent: stats.avg_loss_pct || 0,
      profitFactor: stats.profit_factor || 0,
      expectedValue: stats.expected_value || 0,
      avgTradeDurationHours: stats.avg_trade_duration_hours || 0,
      avgWinningDurationHours: stats.avg_winning_duration_hours || 0,
      avgLosingDurationHours: stats.avg_losing_duration_hours || 0,
      totalFees: stats.total_fees || 0
    };
  } catch (error) {
    console.error('Error fetching trade statistics:', error);
    return getEmptyStatistics();
  }
}

export async function getDailyReturns(
  userId: string,
  days: number = 365
): Promise<DailyReturn[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase.rpc('get_daily_returns', {
      p_user_id: userId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0]
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      date: d.date,
      dailyPnl: d.daily_pnl || 0,
      cumulativePnl: d.cumulative_pnl || 0,
      dailyReturnPct: d.daily_return_pct || 0,
      tradeCount: d.trade_count || 0
    }));
  } catch (error) {
    console.error('Error fetching daily returns:', error);
    return [];
  }
}

export async function getSharpeRatio(
  userId: string,
  days: number = 365
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_sharpe_ratio', {
      p_user_id: userId,
      p_days: days,
      p_risk_free_rate: 0.0
    });

    if (error || data === null) {
      return 0;
    }

    return data;
  } catch (error) {
    console.error('Error calculating Sharpe ratio:', error);
    return 0;
  }
}

export async function getSortinoRatio(
  userId: string,
  days: number = 365
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_sortino_ratio', {
      p_user_id: userId,
      p_days: days,
      p_risk_free_rate: 0.0
    });

    if (error || data === null) {
      return 0;
    }

    return data;
  } catch (error) {
    console.error('Error calculating Sortino ratio:', error);
    return 0;
  }
}

export async function getMaxDrawdown(
  userId: string,
  days: number = 365
): Promise<DrawdownData> {
  try {
    const { data, error } = await supabase.rpc('calculate_max_drawdown', {
      p_user_id: userId,
      p_days: days
    });

    if (error || !data || data.length === 0) {
      return {
        maxDrawdownPct: 0,
        maxDrawdownAmount: 0,
        peakDate: null,
        troughDate: null,
        recoveryDate: null,
        drawdownDurationDays: 0
      };
    }

    const dd = data[0];
    return {
      maxDrawdownPct: dd.max_drawdown_pct || 0,
      maxDrawdownAmount: dd.max_drawdown_amount || 0,
      peakDate: dd.peak_date,
      troughDate: dd.trough_date,
      recoveryDate: dd.recovery_date,
      drawdownDurationDays: dd.drawdown_duration_days || 0
    };
  } catch (error) {
    console.error('Error calculating max drawdown:', error);
    return {
      maxDrawdownPct: 0,
      maxDrawdownAmount: 0,
      peakDate: null,
      troughDate: null,
      recoveryDate: null,
      drawdownDurationDays: 0
    };
  }
}

export async function getPerformanceByModule(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ModuleAttribution[]> {
  try {
    const { data, error } = await supabase.rpc('get_performance_by_module', {
      p_user_id: userId,
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      moduleType: d.module_type,
      totalTrades: d.total_trades || 0,
      winningTrades: d.winning_trades || 0,
      winRate: d.win_rate || 0,
      totalPnl: d.total_pnl || 0,
      avgPnl: d.avg_pnl || 0,
      totalVolume: d.total_volume || 0,
      pnlContributionPct: d.pnl_contribution_pct || 0
    }));
  } catch (error) {
    console.error('Error fetching performance by module:', error);
    return [];
  }
}

export async function getPerformanceByMarket(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 20
): Promise<MarketPerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_performance_by_market', {
      p_user_id: userId,
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null,
      p_limit: limit
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      marketId: d.market_id,
      marketQuestion: d.market_question,
      totalTrades: d.total_trades || 0,
      winningTrades: d.winning_trades || 0,
      winRate: d.win_rate || 0,
      totalPnl: d.total_pnl || 0,
      avgPnl: d.avg_pnl || 0,
      totalVolume: d.total_volume || 0,
      avgHoldTimeHours: d.avg_hold_time_hours || 0
    }));
  } catch (error) {
    console.error('Error fetching performance by market:', error);
    return [];
  }
}

export async function getTradeCalendar(
  userId: string,
  days: number = 90
): Promise<CalendarData[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase.rpc('get_trade_calendar', {
      p_user_id: userId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0]
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      date: d.date,
      tradeCount: d.trade_count || 0,
      winningTrades: d.winning_trades || 0,
      losingTrades: d.losing_trades || 0,
      totalPnl: d.total_pnl || 0,
      winRate: d.win_rate || 0,
      bestTradePnl: d.best_trade_pnl || 0,
      worstTradePnl: d.worst_trade_pnl || 0
    }));
  } catch (error) {
    console.error('Error fetching trade calendar:', error);
    return [];
  }
}

export async function getHourlyPerformance(
  userId: string,
  days: number = 90
): Promise<HourlyPerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_hourly_performance', {
      p_user_id: userId,
      p_days: days
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      hourOfDay: d.hour_of_day || 0,
      tradeCount: d.trade_count || 0,
      winningTrades: d.winning_trades || 0,
      winRate: d.win_rate || 0,
      totalPnl: d.total_pnl || 0,
      avgPnl: d.avg_pnl || 0
    }));
  } catch (error) {
    console.error('Error fetching hourly performance:', error);
    return [];
  }
}

export async function getWinLossStreaks(
  userId: string,
  limit: number = 10
): Promise<WinLossStreak[]> {
  try {
    const { data, error } = await supabase.rpc('get_win_loss_streaks', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      streakType: d.streak_type,
      streakLength: d.streak_length || 0,
      startDate: d.start_date,
      endDate: d.end_date,
      totalPnl: d.total_pnl || 0
    }));
  } catch (error) {
    console.error('Error fetching win/loss streaks:', error);
    return [];
  }
}

export async function getRiskMetrics(
  userId: string,
  days: number = 365
): Promise<RiskMetrics> {
  try {
    const [sharpeRatio, sortinoRatio, drawdown, dailyReturns] = await Promise.all([
      getSharpeRatio(userId, days),
      getSortinoRatio(userId, days),
      getMaxDrawdown(userId, days),
      getDailyReturns(userId, days)
    ]);

    const returns = dailyReturns.map(d => d.dailyReturnPct);
    const volatility = calculateVolatility(returns);
    const calmarRatio = drawdown.maxDrawdownPct !== 0
      ? (dailyReturns[dailyReturns.length - 1]?.cumulativePnl || 0) / drawdown.maxDrawdownAmount
      : 0;
    const valueAtRisk = calculateVaR(returns, 0.95);
    const expectedShortfall = calculateES(returns, 0.95);

    return {
      sharpeRatio,
      maxDrawdown: drawdown.maxDrawdownAmount,
      maxDrawdownPercent: drawdown.maxDrawdownPct,
      volatility,
      calmarRatio,
      sortinoRatio,
      valueAtRisk,
      expectedShortfall
    };
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      volatility: 0,
      calmarRatio: 0,
      sortinoRatio: 0,
      valueAtRisk: 0,
      expectedShortfall: 0
    };
  }
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: any[], filename: string): void {
  if (data.length === 0) return;

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getEmptyStatistics(): TradeStatistics {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    winRate: 0,
    totalPnl: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    avgWinPercent: 0,
    avgLossPercent: 0,
    profitFactor: 0,
    expectedValue: 0,
    avgTradeDurationHours: 0,
    avgWinningDurationHours: 0,
    avgLosingDurationHours: 0,
    totalFees: 0
  };
}

function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

function calculateVaR(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  return Math.abs(sorted[index] || 0);
}

function calculateES(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  const tailReturns = sorted.slice(0, index + 1);

  if (tailReturns.length === 0) return 0;

  return Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length);
}

export async function getModulePerformance(
  userId: string,
  daysBack: number = 30
): Promise<ModulePerformance[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const moduleData = await getPerformanceByModule(userId, startDate, new Date());

  return moduleData.map(m => ({
    moduleName: m.moduleType,
    totalTrades: m.totalTrades,
    winningTrades: m.winningTrades,
    winRate: m.winRate,
    totalPnL: m.totalPnl,
    totalFees: 0,
    roi: m.totalVolume > 0 ? (m.totalPnl / m.totalVolume) * 100 : 0,
    sharpeRatio: null,
    maxDrawdown: 0,
    avgTradeDuration: 0
  }));
}

export async function getProfitAttribution(
  userId: string,
  daysBack: number = 30
): Promise<ProfitAttribution[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const moduleData = await getPerformanceByModule(userId, startDate, new Date());

  return moduleData.map(m => ({
    module: m.moduleType,
    profit: m.totalPnl,
    profitPercent: m.totalVolume > 0 ? (m.totalPnl / m.totalVolume) * 100 : 0,
    trades: m.totalTrades,
    avgProfit: m.avgPnl,
    contribution: m.pnlContributionPct
  }));
}

export async function getPerformanceChart(
  userId: string,
  daysBack: number = 30
): Promise<PerformanceChart[]> {
  const dailyReturns = await getDailyReturns(userId, daysBack);

  return dailyReturns.map(d => ({
    date: d.date,
    cumulative_pnl: d.cumulativePnl,
    daily_pnl: d.dailyPnl,
    trades: d.tradeCount
  }));
}

export {
  type ModulePerformance,
  type RiskMetrics,
  type TradeCalendarDay,
  type ProfitAttribution,
  type PerformanceChart
};
