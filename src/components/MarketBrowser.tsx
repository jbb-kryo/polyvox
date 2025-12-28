import { useState, useEffect } from 'react';
import { Search, RefreshCw, TrendingUp, Filter, AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { PolymarketMarket, MarketFilters } from '../types';
import { fetchMarkets, formatVolume, formatSpread } from '../services/polymarket';
import toast from 'react-hot-toast';
import { TableSkeleton } from './Skeletons';
import { ErrorDisplay, InlineError } from './ErrorDisplay';
import { isNetworkError } from '../services/connectionStatus';
import { ResponsiveTableWrapper } from './ResponsiveTable';

interface MarketBrowserProps {
  paperTradingMode: boolean;
  useCorsProxy: boolean;
}

type SortField = 'volume' | 'liquidity' | 'spread' | 'price';
type SortDirection = 'asc' | 'desc';

export default function MarketBrowser({ paperTradingMode, useCorsProxy }: MarketBrowserProps) {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<PolymarketMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const marketsPerPage = 50;

  const [filters, setFilters] = useState<MarketFilters>({
    searchQuery: '',
    category: 'All',
    minVolume: 0,
    maxSpread: 100,
    minLiquidity: 0
  });

  const categories = ['All', 'Politics', 'Crypto', 'Sports', 'Economics', 'Technology', 'Stocks', 'Health', 'Other'];

  const loadMarkets = async (reset = true) => {
    if (reset) {
      setIsLoading(true);
      setCurrentPage(1);
    }
    setError(null);

    try {
      console.log('Fetching markets with CORS proxy:', useCorsProxy);
      const data = await fetchMarkets(marketsPerPage, useCorsProxy, 0);
      console.log('Received markets:', data.length);
      setMarkets(data);
      setHasMore(data.length === marketsPerPage);

      if (data.length === 0) {
        toast.error('No markets available. Try enabling CORS Proxy in settings.');
        setError('No markets found. Try toggling the CORS Proxy setting.');
      } else {
        toast.success(`Loaded ${data.length} markets`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load markets';
      console.error('Market loading error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMarkets = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = currentPage * marketsPerPage;
      const data = await fetchMarkets(marketsPerPage, useCorsProxy, offset);

      if (data.length > 0) {
        setMarkets(prev => [...prev, ...data]);
        setCurrentPage(prev => prev + 1);
        setHasMore(data.length === marketsPerPage);
        toast.success(`Loaded ${data.length} more markets`);
      } else {
        setHasMore(false);
        toast.info('No more markets to load');
      }
    } catch (err) {
      toast.error('Failed to load more markets');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMarkets();

    const interval = setInterval(() => {
      loadMarkets();
    }, 60000);

    return () => clearInterval(interval);
  }, [useCorsProxy]);

  useEffect(() => {
    let filtered = [...markets];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.question.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query)
      );
    }

    if (filters.category !== 'All') {
      filtered = filtered.filter(m => m.category === filters.category);
    }

    filtered = filtered.filter(m => {
      const volume = m.volume || 0;
      return volume >= filters.minVolume;
    });

    filtered = filtered.filter(m => {
      const liquidity = m.liquidity || 0;
      return liquidity >= (filters.minLiquidity || 0);
    });

    const maxSpreadValue = filters.maxSpread / 100;
    const epsilon = 0.001;
    filtered = filtered.filter(m => {
      const spread = m.spread || 0;
      return !isNaN(spread) && spread <= (maxSpreadValue + epsilon);
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'volume':
          comparison = (a.volume || 0) - (b.volume || 0);
          break;
        case 'liquidity':
          comparison = (a.liquidity || 0) - (b.liquidity || 0);
          break;
        case 'spread':
          comparison = (a.spread || 0) - (b.spread || 0);
          break;
        case 'price':
          comparison = (a.bestBid || 0) - (b.bestBid || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredMarkets(filtered);
  }, [markets, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const truncateQuestion = (question: string, maxLength = 60) => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <TableSkeleton rows={10} columns={5} />
        </div>
      </div>
    );
  }

  if (error) {
    const isNetwork = isNetworkError(error);
    return (
      <ErrorDisplay
        title={isNetwork ? 'Connection Error' : 'Error Loading Markets'}
        message={isNetwork ? 'Unable to fetch markets. Please check your connection and try again.' : error}
        type={isNetwork ? 'offline' : 'error'}
        onRetry={() => loadMarkets()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 touch-manipulation min-h-[44px] text-sm sm:text-base ${
              showFilters ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Filters</span>
          </button>

          <button
            onClick={loadMarkets}
            disabled={isLoading}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 touch-manipulation min-h-[44px] text-sm sm:text-base"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-900 rounded-lg mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Volume: {formatVolume(filters.minVolume)}
              </label>
              <input
                type="range"
                min="0"
                max="1000000"
                step="10000"
                value={filters.minVolume}
                onChange={(e) => setFilters({ ...filters, minVolume: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Liquidity: {formatVolume(filters.minLiquidity || 0)}
              </label>
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={filters.minLiquidity || 0}
                onChange={(e) => setFilters({ ...filters, minLiquidity: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Spread: {filters.maxSpread}%
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.maxSpread}
                onChange={(e) => setFilters({ ...filters, maxSpread: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">
            Showing {filteredMarkets.length} of {markets.length} markets
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="volume">Volume</option>
              <option value="liquidity">Liquidity</option>
              <option value="spread">Spread</option>
              <option value="price">Price</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ResponsiveTableWrapper minWidth="1000px">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-400">Market</th>
                <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-400 hidden sm:table-cell">Category</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  <button
                    onClick={() => handleSort('volume')}
                    className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                  >
                    Volume
                    {sortField === 'volume' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  <button
                    onClick={() => handleSort('liquidity')}
                    className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                  >
                    Liquidity
                    {sortField === 'liquidity' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  <button
                    onClick={() => handleSort('price')}
                    className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                  >
                    Price
                    {sortField === 'price' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  <button
                    onClick={() => handleSort('spread')}
                    className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                  >
                    Spread
                    {sortField === 'spread' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMarkets.map((market) => (
                <tr
                  key={market.id}
                  className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                >
                  <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <p className="text-white font-medium text-sm sm:text-base">{truncateQuestion(market.question, 40)}</p>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 hidden sm:table-cell">
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                      {market.category}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right">
                    <span className="text-gray-300 font-medium text-xs sm:text-sm">{formatVolume(market.volume)}</span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right">
                    <span className="text-gray-300 font-medium text-xs sm:text-sm">{formatVolume(market.liquidity)}</span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-green-400 font-bold text-xs sm:text-sm">
                        ${market.bestBid.toFixed(2)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        Ask: ${market.bestAsk.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right">
                    <span className={`font-medium text-xs sm:text-sm ${
                      market.spread < 0.03 ? 'text-green-400' :
                      market.spread < 0.05 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {formatSpread(market.spread)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTableWrapper>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No markets match your filters</p>
            <button
              onClick={() => setFilters({
                searchQuery: '',
                category: 'All',
                minVolume: 0,
                maxSpread: 100,
                minLiquidity: 0
              })}
              className="mt-4 text-blue-400 hover:text-blue-300 touch-manipulation min-h-[44px]"
            >
              Reset Filters
            </button>
          </div>
        )}

        {hasMore && filteredMarkets.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMoreMarkets}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px] text-sm sm:text-base"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Load More Markets</span>
                </>
              )}
            </button>
          </div>
        )}

        {!hasMore && markets.length > 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            All available markets loaded ({markets.length} total)
          </div>
        )}
      </div>
    </div>
  );
}
