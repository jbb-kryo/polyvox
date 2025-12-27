import { Clock, TrendingUp, TrendingDown, X } from 'lucide-react';
import { SnipeOrder } from '../../types/snipemaster';

interface SnipeOrdersTableProps {
  orders: SnipeOrder[];
  onCancel: (orderId: string) => void;
}

export default function SnipeOrdersTable({ orders, onCancel }: SnipeOrdersTableProps) {
  const getStatusColor = (status: SnipeOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'filled':
        return 'text-green-400';
      case 'cancelled':
        return 'text-gray-400';
      case 'expired':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (orders.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No active orders</p>
        <p className="text-gray-500 text-sm mt-1">Orders will appear here when limit orders are placed</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-750">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Market
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Side
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Limit Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white max-w-xs truncate">
                    {order.marketTitle}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {order.side === 'yes' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Yes</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">No</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${order.limitPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-300 font-mono">
                    ${order.currentPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-purple-400 font-semibold">
                    {order.discount.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-white font-mono">
                    ${order.size.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-400">
                    {formatTime(order.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => onCancel(order.id)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Cancel order"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
