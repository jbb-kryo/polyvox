import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getTradeCalendar, CalendarData } from '../../services/analyticsService';

interface TradeCalendarViewProps {
  userId: string;
}

export default function TradeCalendarView({ userId }: TradeCalendarViewProps) {
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [selectedDate, setSelectedDate] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');

  useEffect(() => {
    loadCalendar();
  }, [userId, viewMode]);

  const loadCalendar = async () => {
    setIsLoading(true);
    try {
      const days = viewMode === 'month' ? 30 : 90;
      const data = await getTradeCalendar(userId, days);
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'bg-green-900 border-green-700';
    if (pnl < 0) return 'bg-red-900 border-red-700';
    return 'bg-gray-800 border-gray-700';
  };

  const getIntensity = (tradeCount: number) => {
    if (tradeCount === 0) return 'opacity-30';
    if (tradeCount < 3) return 'opacity-50';
    if (tradeCount < 6) return 'opacity-75';
    return 'opacity-100';
  };

  const groupedByWeek: CalendarData[][] = [];
  let currentWeek: CalendarData[] = [];

  calendarData.forEach((day, index) => {
    currentWeek.push(day);
    const dayOfWeek = new Date(day.date).getDay();

    if (dayOfWeek === 6 || index === calendarData.length - 1) {
      groupedByWeek.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const totalStats = calendarData.reduce((acc, day) => ({
    trades: acc.trades + day.tradeCount,
    wins: acc.wins + day.winningTrades,
    losses: acc.losses + day.losingTrades,
    pnl: acc.pnl + day.totalPnl
  }), { trades: 0, wins: 0, losses: 0, pnl: 0 });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Trade Calendar
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('quarter')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Quarter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-white">{totalStats.trades}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-white">
            {totalStats.trades > 0 ? ((totalStats.wins / totalStats.trades) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total P&L</div>
          <div className={`text-2xl font-bold ${totalStats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalStats.pnl)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Avg Daily P&L</div>
          <div className={`text-2xl font-bold ${totalStats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(calendarData.length > 0 ? totalStats.pnl / calendarData.length : 0)}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((day) => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day)}
                className={`
                  p-3 rounded-lg border-2 transition-all hover:scale-105
                  ${getPnlColor(day.totalPnl)}
                  ${getIntensity(day.tradeCount)}
                  ${selectedDate?.date === day.date ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className="text-xs text-gray-400 mb-1">{date.getDate()}</div>
                {day.tradeCount > 0 && (
                  <>
                    <div className="flex items-center justify-center gap-1 text-xs mb-1">
                      {day.totalPnl > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={day.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {Math.abs(day.totalPnl).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {day.tradeCount} {day.tradeCount === 1 ? 'trade' : 'trades'}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-bold text-white mb-4">
            {new Date(selectedDate.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Trades</div>
              <div className="text-xl font-bold text-white">{selectedDate.tradeCount}</div>
              <div className="text-xs text-gray-500 mt-1">
                {selectedDate.winningTrades}W / {selectedDate.losingTrades}L
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Win Rate</div>
              <div className="text-xl font-bold text-white">{selectedDate.winRate.toFixed(1)}%</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Total P&L</div>
              <div className={`text-xl font-bold ${selectedDate.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(selectedDate.totalPnl)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Best / Worst</div>
              <div className="text-sm">
                <div className="text-green-400">{formatCurrency(selectedDate.bestTradePnl)}</div>
                <div className="text-red-400">{formatCurrency(selectedDate.worstTradePnl)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-900 border-2 border-green-700 rounded"></div>
            <span className="text-gray-400">Profitable Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-900 border-2 border-red-700 rounded"></div>
            <span className="text-gray-400">Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800 border-2 border-gray-700 rounded"></div>
            <span className="text-gray-400">No Trades</span>
          </div>
          <div className="ml-auto text-gray-400">
            Opacity indicates trade volume
          </div>
        </div>
      </div>
    </div>
  );
}
