import { supabase } from '../lib/supabase';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export interface MarketSnapshot {
  marketId: string;
  question?: string;
  yesPrice: number;
  noPrice: number;
  yesBid: number;
  yesAsk: number;
  noBid: number;
  noAsk: number;
  volume24h: number;
  liquidity: number;
  openInterest: number;
  lastTradePrice?: number;
  lastTradeTime?: Date;
  active: boolean;
  closed: boolean;
  timestamp: Date;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  ordersCount: number;
}

export interface OrderBook {
  marketId: string;
  tokenId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

export interface Trade {
  marketId: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  maker?: string;
  taker?: string;
  tradeId: string;
  timestamp: Date;
}

export interface MarketDataUpdate {
  snapshot?: MarketSnapshot;
  orderBook?: OrderBook;
  trades?: Trade[];
}

export type MarketDataCallback = (update: MarketDataUpdate) => void;
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;

const POLYMARKET_API_BASE = 'https://clob.polymarket.com';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

const DEFAULT_POLL_INTERVAL = 8000;
const MIN_POLL_INTERVAL = 5000;
const MAX_POLL_INTERVAL = 30000;
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 100;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = MAX_REQUESTS_PER_WINDOW, windowMs: number = RATE_LIMIT_WINDOW) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkRateLimit(endpoint: string): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      console.warn(`Rate limit reached for ${endpoint}. Waiting...`);
      await this.recordRateLimit(endpoint);
      return false;
    }

    this.requests.push(now);
    return true;
  }

  private async recordRateLimit(endpoint: string): Promise<void> {
    try {
      const windowStart = new Date();
      const windowEnd = new Date(Date.now() + this.windowMs);

      await supabase.from('api_rate_limits').insert({
        endpoint,
        request_count: this.requests.length,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        last_request: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording rate limit:', error);
    }
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}

export class MarketDataStream {
  private subscriptions = new Map<string, Set<MarketDataCallback>>();
  private statusCallbacks = new Set<ConnectionStatusCallback>();
  private pollIntervals = new Map<string, NodeJS.Timeout>();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private rateLimiter = new RateLimiter();
  private reconnectAttempts = 0;
  private lastSuccessfulFetch = new Map<string, number>();
  private cachedData = new Map<string, MarketDataUpdate>();
  private pollInterval: number = DEFAULT_POLL_INTERVAL;

  constructor(pollInterval?: number) {
    if (pollInterval) {
      this.pollInterval = Math.max(MIN_POLL_INTERVAL, Math.min(MAX_POLL_INTERVAL, pollInterval));
    }
  }

  subscribe(marketId: string, callback: MarketDataCallback): () => void {
    if (!this.subscriptions.has(marketId)) {
      this.subscriptions.set(marketId, new Set());
      this.startPolling(marketId);
    }

    this.subscriptions.get(marketId)!.add(callback);

    if (this.cachedData.has(marketId)) {
      callback(this.cachedData.get(marketId)!);
    }

    return () => this.unsubscribe(marketId, callback);
  }

  unsubscribe(marketId: string, callback: MarketDataCallback): void {
    const callbacks = this.subscriptions.get(marketId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(marketId);
        this.stopPolling(marketId);
        this.cachedData.delete(marketId);
      }
    }
  }

  subscribeToStatus(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.connectionStatus);
    return () => this.statusCallbacks.delete(callback);
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private async startPolling(marketId: string): Promise<void> {
    if (this.pollIntervals.has(marketId)) {
      return;
    }

    this.updateConnectionStatus('connecting');

    await this.fetchMarketData(marketId);

    const interval = setInterval(async () => {
      try {
        await this.fetchMarketData(marketId);
      } catch (error) {
        console.error(`Error polling market ${marketId}:`, error);
        this.handleConnectionError(marketId);
      }
    }, this.pollInterval);

    this.pollIntervals.set(marketId, interval);
  }

  private stopPolling(marketId: string): void {
    const interval = this.pollIntervals.get(marketId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(marketId);
    }
    this.lastSuccessfulFetch.delete(marketId);
  }

  private async fetchMarketData(marketId: string): Promise<void> {
    try {
      if (!await this.rateLimiter.checkRateLimit('market-data')) {
        const resetTime = this.rateLimiter.getResetTime();
        console.warn(`Rate limited. Reset in ${Math.ceil(resetTime / 1000)}s`);
        this.updateConnectionStatus('connected');
        return;
      }

      const update: MarketDataUpdate = {};

      const [snapshot, orderBook, trades] = await Promise.all([
        this.fetchMarketSnapshot(marketId),
        this.fetchOrderBook(marketId),
        this.fetchRecentTrades(marketId)
      ]);

      if (snapshot) update.snapshot = snapshot;
      if (orderBook) update.orderBook = orderBook;
      if (trades && trades.length > 0) update.trades = trades;

      if (Object.keys(update).length > 0) {
        this.cachedData.set(marketId, update);
        this.lastSuccessfulFetch.set(marketId, Date.now());
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected');

        await this.cacheMarketData(update);

        const callbacks = this.subscriptions.get(marketId);
        if (callbacks) {
          callbacks.forEach(callback => callback(update));
        }
      }
    } catch (error: any) {
      console.error(`Error fetching market data for ${marketId}:`, error);
      throw error;
    }
  }

  private async fetchMarketSnapshot(marketId: string): Promise<MarketSnapshot | null> {
    try {
      const response = await fetch(`${GAMMA_API_BASE}/markets/${marketId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return this.getCachedSnapshot(marketId);
        }
        throw new Error(`Failed to fetch market snapshot: ${response.status}`);
      }

      const data = await response.json();

      const snapshot: MarketSnapshot = {
        marketId,
        question: data.question,
        yesPrice: parseFloat(data.outcomePrices?.[0] || data.bestBid || '0'),
        noPrice: parseFloat(data.outcomePrices?.[1] || '0'),
        yesBid: parseFloat(data.bestBid || '0'),
        yesAsk: parseFloat(data.bestAsk || '0'),
        noBid: parseFloat(data.bestBid || '0'),
        noAsk: parseFloat(data.bestAsk || '0'),
        volume24h: parseFloat(data.volume24hr || '0'),
        liquidity: parseFloat(data.liquidity || '0'),
        openInterest: parseFloat(data.volume || '0'),
        active: data.active !== false,
        closed: data.closed === true,
        timestamp: new Date()
      };

      return snapshot;
    } catch (error) {
      console.error('Error fetching market snapshot:', error);
      return this.getCachedSnapshot(marketId);
    }
  }

  private async fetchOrderBook(marketId: string): Promise<OrderBook | null> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/book?market=${marketId}`);

      if (!response.ok) {
        return this.getCachedOrderBook(marketId);
      }

      const data = await response.json();

      if (!data.bids || !data.asks) {
        return null;
      }

      const orderBook: OrderBook = {
        marketId,
        tokenId: data.asset_id || marketId,
        bids: data.bids.slice(0, 10).map((bid: any) => ({
          price: parseFloat(bid.price),
          size: parseFloat(bid.size),
          ordersCount: 1
        })),
        asks: data.asks.slice(0, 10).map((ask: any) => ({
          price: parseFloat(ask.price),
          size: parseFloat(ask.size),
          ordersCount: 1
        })),
        timestamp: new Date()
      };

      return orderBook;
    } catch (error) {
      console.error('Error fetching order book:', error);
      return this.getCachedOrderBook(marketId);
    }
  }

  private async fetchRecentTrades(marketId: string): Promise<Trade[]> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/trades?market=${marketId}&limit=20`);

      if (!response.ok) {
        return this.getCachedTrades(marketId);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      const trades: Trade[] = data.map((trade: any) => ({
        marketId,
        tokenId: trade.asset_id || trade.token_id || marketId,
        side: trade.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
        price: parseFloat(trade.price),
        size: parseFloat(trade.size || trade.amount),
        maker: trade.maker,
        taker: trade.taker,
        tradeId: trade.id || `${Date.now()}-${Math.random()}`,
        timestamp: new Date(trade.timestamp || Date.now())
      }));

      return trades;
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      return this.getCachedTrades(marketId);
    }
  }

  private async cacheMarketData(update: MarketDataUpdate): Promise<void> {
    try {
      if (update.snapshot) {
        await supabase.from('market_snapshots').insert({
          market_id: update.snapshot.marketId,
          question: update.snapshot.question,
          yes_price: update.snapshot.yesPrice,
          no_price: update.snapshot.noPrice,
          yes_bid: update.snapshot.yesBid,
          yes_ask: update.snapshot.yesAsk,
          no_bid: update.snapshot.noBid,
          no_ask: update.snapshot.noAsk,
          volume_24h: update.snapshot.volume24h,
          liquidity: update.snapshot.liquidity,
          open_interest: update.snapshot.openInterest,
          last_trade_price: update.snapshot.lastTradePrice,
          last_trade_time: update.snapshot.lastTradeTime?.toISOString(),
          active: update.snapshot.active,
          closed: update.snapshot.closed,
          timestamp: update.snapshot.timestamp.toISOString()
        });
      }

      if (update.orderBook) {
        const bookInserts = [
          ...update.orderBook.bids.map(bid => ({
            market_id: update.orderBook!.marketId,
            token_id: update.orderBook!.tokenId,
            side: 'BUY',
            price: bid.price,
            size: bid.size,
            orders_count: bid.ordersCount,
            timestamp: update.orderBook!.timestamp.toISOString()
          })),
          ...update.orderBook.asks.map(ask => ({
            market_id: update.orderBook!.marketId,
            token_id: update.orderBook!.tokenId,
            side: 'SELL',
            price: ask.price,
            size: ask.size,
            orders_count: ask.ordersCount,
            timestamp: update.orderBook!.timestamp.toISOString()
          }))
        ];

        if (bookInserts.length > 0) {
          await supabase.from('order_book_snapshots').insert(bookInserts);
        }
      }

      if (update.trades && update.trades.length > 0) {
        const tradeInserts = update.trades.map(trade => ({
          market_id: trade.marketId,
          token_id: trade.tokenId,
          side: trade.side,
          price: trade.price,
          size: trade.size,
          maker: trade.maker,
          taker: trade.taker,
          trade_id: trade.tradeId,
          timestamp: trade.timestamp.toISOString()
        }));

        await supabase.from('trade_activity').insert(tradeInserts);
      }
    } catch (error) {
      console.error('Error caching market data:', error);
    }
  }

  private async getCachedSnapshot(marketId: string): Promise<MarketSnapshot | null> {
    try {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('*')
        .eq('market_id', marketId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        marketId: data.market_id,
        question: data.question,
        yesPrice: data.yes_price,
        noPrice: data.no_price,
        yesBid: data.yes_bid,
        yesAsk: data.yes_ask,
        noBid: data.no_bid,
        noAsk: data.no_ask,
        volume24h: data.volume_24h,
        liquidity: data.liquidity,
        openInterest: data.open_interest,
        lastTradePrice: data.last_trade_price,
        lastTradeTime: data.last_trade_time ? new Date(data.last_trade_time) : undefined,
        active: data.active,
        closed: data.closed,
        timestamp: new Date(data.timestamp)
      };
    } catch (error) {
      console.error('Error getting cached snapshot:', error);
      return null;
    }
  }

  private async getCachedOrderBook(marketId: string): Promise<OrderBook | null> {
    try {
      const { data, error } = await supabase
        .from('order_book_snapshots')
        .select('*')
        .eq('market_id', marketId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) return null;

      const bids = data
        .filter(d => d.side === 'BUY')
        .map(d => ({
          price: d.price,
          size: d.size,
          ordersCount: d.orders_count
        }));

      const asks = data
        .filter(d => d.side === 'SELL')
        .map(d => ({
          price: d.price,
          size: d.size,
          ordersCount: d.orders_count
        }));

      return {
        marketId,
        tokenId: data[0].token_id,
        bids,
        asks,
        timestamp: new Date(data[0].timestamp)
      };
    } catch (error) {
      console.error('Error getting cached order book:', error);
      return null;
    }
  }

  private async getCachedTrades(marketId: string): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trade_activity')
        .select('*')
        .eq('market_id', marketId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error || !data) return [];

      return data.map(d => ({
        marketId: d.market_id,
        tokenId: d.token_id,
        side: d.side as 'BUY' | 'SELL',
        price: d.price,
        size: d.size,
        maker: d.maker,
        taker: d.taker,
        tradeId: d.trade_id,
        timestamp: new Date(d.timestamp)
      }));
    } catch (error) {
      console.error('Error getting cached trades:', error);
      return [];
    }
  }

  private handleConnectionError(marketId: string): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.updateConnectionStatus('error');
      console.error(`Max reconnection attempts reached for ${marketId}`);
      this.stopPolling(marketId);
      return;
    }

    this.updateConnectionStatus('reconnecting');
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    setTimeout(() => {
      if (this.subscriptions.has(marketId)) {
        this.fetchMarketData(marketId);
      }
    }, RECONNECT_DELAY);
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  getRateLimitInfo(): { remaining: number; resetTime: number } {
    return {
      remaining: this.rateLimiter.getRemainingRequests(),
      resetTime: this.rateLimiter.getResetTime()
    };
  }

  setPollInterval(intervalMs: number): void {
    this.pollInterval = Math.max(MIN_POLL_INTERVAL, Math.min(MAX_POLL_INTERVAL, intervalMs));

    this.subscriptions.forEach((_, marketId) => {
      this.stopPolling(marketId);
      this.startPolling(marketId);
    });
  }

  cleanup(): void {
    this.subscriptions.forEach((_, marketId) => this.stopPolling(marketId));
    this.subscriptions.clear();
    this.statusCallbacks.clear();
    this.cachedData.clear();
    this.lastSuccessfulFetch.clear();
    this.updateConnectionStatus('disconnected');
  }
}

export const marketDataStream = new MarketDataStream();
