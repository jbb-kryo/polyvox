import { useState, useEffect, useCallback, useRef } from 'react';
import {
  marketDataStream,
  MarketSnapshot,
  OrderBook,
  Trade,
  ConnectionStatus,
  MarketDataUpdate
} from '../services/marketDataStream';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UseRealTimeMarketOptions {
  pollInterval?: number;
  autoConnect?: boolean;
  enableOrderBook?: boolean;
  enableTrades?: boolean;
  maxTrades?: number;
}

export interface UseRealTimeMarketResult {
  snapshot: MarketSnapshot | null;
  orderBook: OrderBook | null;
  trades: Trade[];
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  rateLimitInfo: {
    remaining: number;
    resetTime: number;
  };
  refresh: () => Promise<void>;
  reconnect: () => void;
  disconnect: () => void;
}

export function useRealTimeMarket(
  marketId: string | null,
  options: UseRealTimeMarketOptions = {}
): UseRealTimeMarketResult {
  const {
    pollInterval,
    autoConnect = true,
    enableOrderBook = true,
    enableTrades = true,
    maxTrades = 20
  } = options;

  const { user } = useAuth();

  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 100, resetTime: 0 });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const handleMarketUpdate = useCallback(
    (update: MarketDataUpdate) => {
      if (!mountedRef.current) return;

      if (update.snapshot) {
        setSnapshot(update.snapshot);
        setError(null);
      }

      if (enableOrderBook && update.orderBook) {
        setOrderBook(update.orderBook);
      }

      if (enableTrades && update.trades) {
        setTrades(prev => {
          const newTrades = [...update.trades!, ...prev];
          const uniqueTrades = Array.from(
            new Map(newTrades.map(t => [t.tradeId, t])).values()
          );
          return uniqueTrades.slice(0, maxTrades);
        });
      }

      setIsLoading(false);
      setRateLimitInfo(marketDataStream.getRateLimitInfo());
    },
    [enableOrderBook, enableTrades, maxTrades]
  );

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    if (!mountedRef.current) return;
    setConnectionStatus(status);

    if (status === 'error') {
      setError('Connection error. Retrying...');
    } else if (status === 'connected') {
      setError(null);
    }
  }, []);

  const connect = useCallback(() => {
    if (!marketId || unsubscribeRef.current) return;

    setIsLoading(true);
    setError(null);

    if (pollInterval) {
      marketDataStream.setPollInterval(pollInterval);
    }

    unsubscribeRef.current = marketDataStream.subscribe(marketId, handleMarketUpdate);
    statusUnsubscribeRef.current = marketDataStream.subscribeToStatus(handleStatusChange);

    if (user) {
      recordSubscription(user.id, marketId).catch(console.error);
    }
  }, [marketId, pollInterval, handleMarketUpdate, handleStatusChange, user]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (statusUnsubscribeRef.current) {
      statusUnsubscribeRef.current();
      statusUnsubscribeRef.current = null;
    }

    setSnapshot(null);
    setOrderBook(null);
    setTrades([]);
    setConnectionStatus('disconnected');
    setIsLoading(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  const refresh = useCallback(async () => {
    if (!marketId) return;

    setIsLoading(true);
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 500));
    connect();
  }, [marketId, disconnect, connect]);

  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect && marketId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, marketId, connect, disconnect]);

  useEffect(() => {
    if (user && marketId && connectionStatus === 'connected') {
      updateSubscriptionAccess(user.id, marketId).catch(console.error);
    }
  }, [user, marketId, connectionStatus]);

  return {
    snapshot,
    orderBook,
    trades,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isLoading,
    error,
    rateLimitInfo,
    refresh,
    reconnect,
    disconnect
  };
}

export function useMultipleMarkets(
  marketIds: string[],
  options: UseRealTimeMarketOptions = {}
): Record<string, UseRealTimeMarketResult> {
  const [results, setResults] = useState<Record<string, UseRealTimeMarketResult>>({});

  const market1 = useRealTimeMarket(marketIds[0] || null, options);
  const market2 = useRealTimeMarket(marketIds[1] || null, options);
  const market3 = useRealTimeMarket(marketIds[2] || null, options);
  const market4 = useRealTimeMarket(marketIds[3] || null, options);
  const market5 = useRealTimeMarket(marketIds[4] || null, options);

  useEffect(() => {
    const newResults: Record<string, UseRealTimeMarketResult> = {};

    if (marketIds[0]) newResults[marketIds[0]] = market1;
    if (marketIds[1]) newResults[marketIds[1]] = market2;
    if (marketIds[2]) newResults[marketIds[2]] = market3;
    if (marketIds[3]) newResults[marketIds[3]] = market4;
    if (marketIds[4]) newResults[marketIds[4]] = market5;

    setResults(newResults);
  }, [marketIds, market1, market2, market3, market4, market5]);

  return results;
}

export function useConnectionStatus(): {
  status: ConnectionStatus;
  isConnected: boolean;
  rateLimitInfo: { remaining: number; resetTime: number };
} {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 100, resetTime: 0 });

  useEffect(() => {
    const unsubscribe = marketDataStream.subscribeToStatus(setStatus);

    const interval = setInterval(() => {
      setRateLimitInfo(marketDataStream.getRateLimitInfo());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    rateLimitInfo
  };
}

export function useOrderBookDepth(
  marketId: string | null,
  levels: number = 5
): {
  bids: Array<{ price: number; size: number; total: number }>;
  asks: Array<{ price: number; size: number; total: number }>;
  spread: number;
  midPrice: number;
  isLoading: boolean;
} {
  const { orderBook, isLoading } = useRealTimeMarket(marketId, {
    enableOrderBook: true,
    enableTrades: false
  });

  const processedData = useCallback(() => {
    if (!orderBook) {
      return {
        bids: [],
        asks: [],
        spread: 0,
        midPrice: 0
      };
    }

    const bids = orderBook.bids.slice(0, levels).map((bid, index, arr) => ({
      price: bid.price,
      size: bid.size,
      total: arr.slice(0, index + 1).reduce((sum, b) => sum + b.size, 0)
    }));

    const asks = orderBook.asks.slice(0, levels).map((ask, index, arr) => ({
      price: ask.price,
      size: ask.size,
      total: arr.slice(0, index + 1).reduce((sum, a) => sum + a.size, 0)
    }));

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;

    return { bids, asks, spread, midPrice };
  }, [orderBook, levels]);

  const data = processedData();

  return {
    ...data,
    isLoading
  };
}

export function usePriceHistory(
  marketId: string | null,
  hours: number = 24
): {
  prices: Array<{ timestamp: Date; price: number }>;
  change24h: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  isLoading: boolean;
} {
  const [prices, setPrices] = useState<Array<{ timestamp: Date; price: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!marketId) return;

    const fetchHistory = async () => {
      try {
        const since = new Date();
        since.setHours(since.getHours() - hours);

        const { data, error } = await supabase
          .from('market_snapshots')
          .select('timestamp, yes_price')
          .eq('market_id', marketId)
          .gte('timestamp', since.toISOString())
          .order('timestamp', { ascending: true });

        if (error) throw error;

        const priceData = data?.map(d => ({
          timestamp: new Date(d.timestamp),
          price: d.yes_price
        })) || [];

        setPrices(priceData);
      } catch (error) {
        console.error('Error fetching price history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [marketId, hours]);

  const stats = useCallback(() => {
    if (prices.length < 2) {
      return { change24h: 0, changePercent: 0, high24h: 0, low24h: 0 };
    }

    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const change24h = lastPrice - firstPrice;
    const changePercent = (change24h / firstPrice) * 100;
    const high24h = Math.max(...prices.map(p => p.price));
    const low24h = Math.min(...prices.map(p => p.price));

    return { change24h, changePercent, high24h, low24h };
  }, [prices]);

  return {
    prices,
    ...stats(),
    isLoading
  };
}

async function recordSubscription(userId: string, marketId: string): Promise<void> {
  try {
    await supabase.from('market_data_subscriptions').upsert({
      user_id: userId,
      market_id: marketId,
      active: true,
      last_accessed: new Date().toISOString()
    }, {
      onConflict: 'user_id,market_id,module_type'
    });
  } catch (error) {
    console.error('Error recording subscription:', error);
  }
}

async function updateSubscriptionAccess(userId: string, marketId: string): Promise<void> {
  try {
    await supabase
      .from('market_data_subscriptions')
      .update({ last_accessed: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('market_id', marketId);
  } catch (error) {
    console.error('Error updating subscription access:', error);
  }
}
