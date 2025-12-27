import { useMemo } from 'react';
import { TradeCalendarDay } from '../../types/analytics';
import { Calendar } from 'lucide-react';

interface TradeCalendarProps {
  data: TradeCalendarDay[];
}

export default function TradeCalendar({ data }: TradeCalendarProps) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 89);

    const weeks: (TradeCalendarDay | null)[][] = [];
    let currentWeek: (TradeCalendarDay | null)[] = [];

    const dayOffset = startDate.getDay();
    for (let i = 0; i < dayOffset; i++) {
      currentWeek.push(null);
    }

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = data.find((d) => d.date === dateStr);

      currentWeek.push(dayData || { date: dateStr, pnl: 0, trades: 0, winRate: 0 });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data]);

  const maxPnL = useMemo(() => {
    return Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  }, [data]);

  const getColor = (day: TradeCalendarDay | null): string => {
    if (!day || day.trades === 0) return 'bg-gray-800';

    const intensity = Math.min(Math.abs(day.pnl) / maxPnL, 1);
    const level = Math.ceil(intensity * 4);

    if (day.pnl > 0) {
      const greenLevels = [
        'bg-green-900 bg-opacity-30',
        'bg-green-800 bg-opacity-50',
        'bg-green-600 bg-opacity-70',
        'bg-green-500'
      ];
      return greenLevels[level - 1] || greenLevels[0];
    } else {
      const redLevels = [
        'bg-red-900 bg-opacity-30',
        'bg-red-800 bg-opacity-50',
        'bg-red-600 bg-opacity-70',
        'bg-red-500'
      ];
      return redLevels[level - 1] || redLevels[0];
    }
  };

  const getTooltip = (day: TradeCalendarDay | null): string => {
    if (!day) return '';
    if (day.trades === 0) return `${day.date}: No trades`;

    const pnlStr = day.pnl >= 0 ? `+$${day.pnl.toFixed(2)}` : `-$${Math.abs(day.pnl).toFixed(2)}`;
    return `${day.date}\n${pnlStr}\n${day.trades} trades\n${day.winRate.toFixed(0)}% win rate`;
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Trading Activity Calendar</h2>
        <Calendar className="w-5 h-5 text-blue-400" />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 mb-2 ml-8">
            {calendarData[0] && calendarData[0].map((day, i) => (
              <div key={i} className="w-3 text-xs text-gray-500">
                {dayLabels[i]}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex flex-col gap-1 w-6 text-xs text-gray-500 justify-around">
              {calendarData.map((_, weekIndex) => {
                if (weekIndex % 4 === 0 && calendarData[weekIndex][0]) {
                  const date = new Date(calendarData[weekIndex][0]!.date);
                  return <div key={weekIndex}>{monthLabels[date.getMonth()]}</div>;
                }
                return <div key={weekIndex} />;
              })}
            </div>

            <div className="flex flex-col gap-1">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3 h-3 rounded-sm ${getColor(day)} border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer`}
                      title={getTooltip(day)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-800 rounded-sm border border-gray-700" />
              <div className="w-3 h-3 bg-green-900 bg-opacity-30 rounded-sm border border-gray-700" />
              <div className="w-3 h-3 bg-green-800 bg-opacity-50 rounded-sm border border-gray-700" />
              <div className="w-3 h-3 bg-green-600 bg-opacity-70 rounded-sm border border-gray-700" />
              <div className="w-3 h-3 bg-green-500 rounded-sm border border-gray-700" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-700">
        <div>
          <div className="text-sm text-gray-400 mb-1">Total Trading Days</div>
          <div className="text-2xl font-bold text-white">
            {data.filter((d) => d.trades > 0).length}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Avg Trades/Day</div>
          <div className="text-2xl font-bold text-white">
            {data.length > 0
              ? (data.reduce((sum, d) => sum + d.trades, 0) / data.filter((d) => d.trades > 0).length || 0).toFixed(1)
              : '0'}
          </div>
        </div>
      </div>
    </div>
  );
}
