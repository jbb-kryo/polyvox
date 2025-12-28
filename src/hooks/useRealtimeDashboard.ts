import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardMetrics {
  totalPnL: number;
  dailyPnL: number;
  weeklyPnL: number;
  activePositions: number;
  totalPositions: number;
  totalTrades: number;
  winRate: number;
  moduleStatuses: {
    arbitrage: boolean;
    snipe: boolean;
    trend: boolean;
    value: boolean;
    whale: boolean;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'trade' | 'position' | 'alert' | 'execution';
  module: string;
  message: string;
  timestamp: string;
  amount?: number;
  status: 'success' | 'warning' | 'error' | 'info';
}

export interface UseRealtimeDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 15000,
  } = options;

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPnL: 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    activePositions: 0,
    totalPositions: 0,
    totalTrades: 0,
    winRate: 0,
    moduleStatuses: {
      arbitrage: false,
      snipe: false,
      trend: false,
      value: false,
      whale: false,
    },
    recentActivity: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        positionsResult,
        tradesResult,
        moduleSettingsResult,
        executionsResult,
      ] = await Promise.all([
        supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('module_settings')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('order_executions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const positions = positionsResult.data || [];
      const trades = tradesResult.data || [];
      const moduleSettings = moduleSettingsResult.data || [];
      const executions = executionsResult.data || [];

      const activePositions = positions.filter(p => p.status === 'open');
      const totalPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

      const dailyTrades = trades.filter(t => new Date(t.created_at) >= oneDayAgo);
      const weeklyTrades = trades.filter(t => new Date(t.created_at) >= oneWeekAgo);

      const dailyPnL = dailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

      const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

      const getModuleStatus = (moduleName: string) => {
        const setting = moduleSettings.find(s => s.module_name === moduleName);
        return setting?.is_enabled || false;
      };

      const recentActivity: ActivityItem[] = [];

      executions.slice(0, 5).forEach(exec => {
        recentActivity.push({
          id: exec.id,
          type: 'execution',
          module: exec.module || 'system',
          message: `${exec.order_type} order ${exec.status}: ${exec.market_name}`,
          timestamp: exec.created_at,
          amount: exec.amount,
          status: exec.status === 'filled' ? 'success' : exec.status === 'failed' ? 'error' : 'info',
        });
      });

      trades.slice(0, 5).forEach(trade => {
        recentActivity.push({
          id: trade.id,
          type: 'trade',
          module: trade.module || 'manual',
          message: `${trade.side} ${trade.outcome} - ${trade.market_name}`,
          timestamp: trade.created_at,
          amount: trade.pnl,
          status: (trade.pnl || 0) > 0 ? 'success' : (trade.pnl || 0) < 0 ? 'error' : 'info',
        });
      });

      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setMetrics({
        totalPnL,
        dailyPnL,
        weeklyPnL,
        activePositions: activePositions.length,
        totalPositions: positions.length,
        totalTrades: trades.length,
        winRate,
        moduleStatuses: {
          arbitrage: getModuleStatus('arbitrage'),
          snipe: getModuleStatus('snipe'),
          trend: getModuleStatus('trend'),
          value: getModuleStatus('value'),
          whale: getModuleStatus('whale'),
        },
        recentActivity: recentActivity.slice(0, 10),
      });

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchDashboardData();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_executions',
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  return {
    metrics,
    isLoading,
    lastRefresh,
    error,
    refresh,
  };
}
