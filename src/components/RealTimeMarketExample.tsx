import React from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import {
  useRealTimeMarket,
  useOrderBookDepth,
  usePriceHistory
} from '../hooks/useRealTimeMarket';
import { ConnectionStatusIndicator, LiveUpdateBadge } from './ConnectionStatusIndicator';

interface RealTimeMarketCardProps {
  marketId: string;
  title: string;
}

export function RealTimeMarketCard({ marketId, title }: RealTimeMarketCardProps) {
  const {
    snapshot,
    trades,
    connectionStatus,
    isConnected,
    isLoading,
    error,
    refresh
  } = useRealTimeMarket(marketId, {
    pollInterval: 8000,
    enableOrderBook: true,
    enableTrades: true,
    maxTrades: 10
  });

  const { change24h, changePercent } = usePriceHistory(marketId, 24);

  if (isLoading && !snapshot) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-red-600 mb-2">Error loading market data</div>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const priceChange = change24h || 0;
  const priceChangePercent = changePercent || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">Market ID: {marketId.substring(0, 12)}...</p>
        </div>
        <ConnectionStatusIndicator compact showText={false} />
      </div>

      {snapshot && (
        <>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold text-gray-900">
              ${snapshot.yesPrice.toFixed(3)}
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}
                {priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Bid / Ask</div>
              <div className="text-sm font-medium text-gray-900">
                ${snapshot.yesBid.toFixed(3)} / ${snapshot.yesAsk.toFixed(3)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Spread</div>
              <div className="text-sm font-medium text-gray-900">
                ${(snapshot.yesAsk - snapshot.yesBid).toFixed(4)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">24h Volume</div>
              <div className="text-sm font-medium text-gray-900">
                ${snapshot.volume24h.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Liquidity</div>
              <div className="text-sm font-medium text-gray-900">
                ${snapshot.liquidity.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <LiveUpdateBadge isLive={isConnected} lastUpdate={snapshot.timestamp} />
            {snapshot.closed && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                Closed
              </span>
            )}
          </div>
        </>
      )}

      {trades.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">Recent Trades</h4>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trades.slice(0, 5).map((trade) => (
              <div
                key={trade.tradeId}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      trade.side === 'BUY'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {trade.side}
                  </span>
                  <span className="text-gray-900 font-medium">
                    ${trade.price.toFixed(3)}
                  </span>
                </div>
                <span className="text-gray-500">{trade.size.toFixed(0)} shares</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderBookDisplayProps {
  marketId: string;
  levels?: number;
}

export function OrderBookDisplay({ marketId, levels = 5 }: OrderBookDisplayProps) {
  const { bids, asks, spread, midPrice, isLoading } = useOrderBookDepth(marketId, levels);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Order Book</h3>
          <div className="text-sm">
            <span className="text-gray-500">Spread: </span>
            <span className="font-medium text-gray-900">${spread.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>

          <div className="space-y-1">
            {asks.slice().reverse().map((ask, index) => {
              const percentage = (ask.total / maxTotal) * 100;
              return (
                <div key={`ask-${index}`} className="relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-red-50"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex justify-between text-sm py-1 px-2">
                    <span className="text-red-600 font-medium">
                      ${ask.price.toFixed(3)}
                    </span>
                    <span className="text-gray-600">{ask.size.toFixed(0)}</span>
                    <span className="text-gray-500">{ask.total.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center py-2 bg-gray-50 rounded">
          <div className="text-center">
            <div className="text-xs text-gray-500">Mid Price</div>
            <div className="text-lg font-bold text-gray-900">${midPrice.toFixed(3)}</div>
          </div>
        </div>

        <div>
          <div className="space-y-1">
            {bids.map((bid, index) => {
              const percentage = (bid.total / maxTotal) * 100;
              return (
                <div key={`bid-${index}`} className="relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-green-50"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex justify-between text-sm py-1 px-2">
                    <span className="text-green-600 font-medium">
                      ${bid.price.toFixed(3)}
                    </span>
                    <span className="text-gray-600">{bid.size.toFixed(0)}</span>
                    <span className="text-gray-500">{bid.total.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PriceChartProps {
  marketId: string;
  hours?: number;
}

export function PriceChart({ marketId, hours = 24 }: PriceChartProps) {
  const { prices, change24h, high24h, low24h, isLoading } = usePriceHistory(marketId, hours);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">No price history available</p>
      </div>
    );
  }

  const isPositive = change24h >= 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Price History ({hours}h)</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-500">High: </span>
            <span className="font-medium text-gray-900">${high24h.toFixed(3)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Low: </span>
            <span className="font-medium text-gray-900">${low24h.toFixed(3)}</span>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}${change24h.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center py-8">
        Price history chart visualization would go here.
        <br />
        Data points available: {prices.length}
      </div>
    </div>
  );
}
