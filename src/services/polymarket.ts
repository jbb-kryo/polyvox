import { PolymarketMarket, OrderBook, MarketPrices } from '../types';
import { polymarketRateLimiter, RequestPriority } from './apiRateLimiter';

const CLOB_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';
const REQUEST_TIMEOUT = 10000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export async function fetchMarkets(
  limit = 50,
  useCorsProxy = false,
  offset = 0
): Promise<PolymarketMarket[]> {
  const cacheKey = `markets-${limit}-${offset}`;

  return polymarketRateLimiter.request<PolymarketMarket[]>(
    cacheKey,
    async () => {
      const endpoint = `/markets?limit=${limit}&offset=${offset}&active=true`;
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polymarket-proxy?endpoint=${encodeURIComponent(endpoint)}&type=gamma`;

      console.log('Fetching markets via Supabase proxy:', proxyUrl);

      const response = await fetchWithTimeout(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      let marketsData = data;
      if (!Array.isArray(data)) {
        if (data.data && Array.isArray(data.data)) {
          marketsData = data.data;
        } else if (data.markets && Array.isArray(data.markets)) {
          marketsData = data.markets;
        } else {
          console.error('Unexpected API response structure:', data);
          throw new Error('Invalid API response format');
        }
      }

      if (!Array.isArray(marketsData) || marketsData.length === 0) {
        console.warn('No markets found in API response');
        return [];
      }

      const markets: PolymarketMarket[] = marketsData.map((item: any) => {
        const bestBid = parseFloat(item.best_bid || item.bestBidPrice || '0');
        const bestAsk = parseFloat(item.best_ask || item.bestAskPrice || '0');

        let spread = 0.02;

        if (item.spread !== undefined && item.spread !== null && item.spread !== '') {
          const parsedSpread = parseFloat(item.spread);
          if (!isNaN(parsedSpread) && parsedSpread >= 0 && parsedSpread <= 1) {
            spread = parsedSpread;
          }
        }

        if ((spread === 0 || spread === 0.02) && bestAsk > 0 && bestBid > 0 && bestAsk > bestBid) {
          spread = bestAsk - bestBid;
        }

        if (isNaN(spread) || spread < 0 || spread > 1) {
          spread = 0.05;
        }

        return {
          id: item.condition_id || item.id,
          question: item.question || item.title,
          description: item.description,
          outcomes: item.outcomes || ['Yes', 'No'],
          category: item.category || 'Other',
          volume: parseFloat(item.volume || '0') || 0,
          liquidity: parseFloat(item.liquidity || '0') || 0,
          bestBid: bestBid || 0,
          bestAsk: bestAsk || 0,
          spread: spread,
          endDate: item.end_date_iso || item.end_date,
          active: item.active !== false
        };
      });

      console.log(`Successfully fetched ${markets.length} markets`);
      return markets;
    },
    {
      priority: RequestPriority.NORMAL,
      endpoint: 'gamma-markets',
      cacheConfig: { ttl: 30000 }
    }
  );
}

export async function fetchMarketById(
  marketId: string,
  useCorsProxy = false
): Promise<PolymarketMarket | null> {
  const cacheKey = `market-${marketId}`;

  try {
    return await polymarketRateLimiter.request<PolymarketMarket>(
      cacheKey,
      async () => {
        const endpoint = `/markets/${marketId}`;
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polymarket-proxy?endpoint=${encodeURIComponent(endpoint)}&type=gamma`;

        const response = await fetchWithTimeout(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const item = await response.json();

        const market: PolymarketMarket = {
          id: item.condition_id || item.id,
          question: item.question || item.title,
          description: item.description,
          outcomes: item.outcomes || ['Yes', 'No'],
          category: item.category || 'Other',
          volume: parseFloat(item.volume || '0'),
          liquidity: parseFloat(item.liquidity || '0'),
          bestBid: parseFloat(item.best_bid || '0'),
          bestAsk: parseFloat(item.best_ask || '0'),
          spread: parseFloat(item.spread || '0'),
          endDate: item.end_date_iso || item.end_date,
          active: item.active !== false
        };

        return market;
      },
      {
        priority: RequestPriority.HIGH,
        endpoint: 'gamma-market',
        cacheConfig: { ttl: 30000 }
      }
    );
  } catch (error) {
    console.error('Error fetching market:', error);
    return null;
  }
}

export async function fetchOrderBook(
  marketId: string,
  useCorsProxy = false
): Promise<OrderBook | null> {
  const cacheKey = `orderbook-${marketId}`;

  try {
    return await polymarketRateLimiter.request<OrderBook>(
      cacheKey,
      async () => {
        const endpoint = `/book?market=${marketId}`;
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polymarket-proxy?endpoint=${encodeURIComponent(endpoint)}&type=clob`;

        const response = await fetchWithTimeout(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        return {
          bids: (data.bids || []).map((b: any) => ({
            price: parseFloat(b.price),
            size: parseFloat(b.size)
          })),
          asks: (data.asks || []).map((a: any) => ({
            price: parseFloat(a.price),
            size: parseFloat(a.size)
          })),
          timestamp: Date.now()
        };
      },
      {
        priority: RequestPriority.HIGH,
        endpoint: 'clob-orderbook',
        cacheConfig: { ttl: 10000 }
      }
    );
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
}

export function getMarketPrices(orderBook: OrderBook | null): MarketPrices {
  if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return {
      bestBid: 0,
      bestAsk: 0,
      spread: 0,
      midPrice: 0
    };
  }

  const bestBid = orderBook.bids[0].price;
  const bestAsk = orderBook.asks[0].price;
  const spread = bestAsk - bestBid;
  const midPrice = (bestBid + bestAsk) / 2;

  return {
    bestBid,
    bestAsk,
    spread,
    midPrice
  };
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

export function formatSpread(spread: number): string {
  return `${(spread * 100).toFixed(2)}%`;
}

export function getRateLimiterMetrics() {
  return polymarketRateLimiter.getMetrics();
}

export function getRateLimiterStatus(endpoint: string) {
  return polymarketRateLimiter.getRateLimitStatus(endpoint);
}

export function getCircuitBreakerStatus(endpoint: string) {
  return polymarketRateLimiter.getCircuitBreakerStatus(endpoint);
}

export function invalidateCache(pattern?: string) {
  polymarketRateLimiter.invalidateCache(pattern);
}

export function getApiHealth() {
  const metrics = polymarketRateLimiter.getMetrics();
  const gammaStatus = polymarketRateLimiter.getRateLimitStatus('gamma-markets');
  const clobStatus = polymarketRateLimiter.getRateLimitStatus('clob-orderbook');

  return {
    healthy: metrics.circuitBreaks === 0 || metrics.successfulRequests > metrics.failedRequests * 2,
    metrics,
    rateLimits: {
      gamma: gammaStatus,
      clob: clobStatus
    },
    cacheSize: polymarketRateLimiter.getCacheSize(),
    queueLength: polymarketRateLimiter.getQueueLength(),
    activeRequests: polymarketRateLimiter.getActiveRequests()
  };
}
