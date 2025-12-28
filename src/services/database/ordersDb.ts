import { supabase } from '../../lib/supabase';
import {
  orderExecutionService,
  CreateOrderRequest,
  Order,
  OrderFill,
  OrderExecutionLog,
  OrderStatus,
  OrderSide
} from '../orderExecution';
import { queryOptimizer, PaginationParams, PaginatedResult } from './queryOptimizer';

export interface OrderSummary {
  totalOrders: number;
  openOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  totalVolume: number;
  totalFees: number;
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  return await orderExecutionService.createOrder(request);
}

export async function cancelOrder(orderId: string, privateKey: string): Promise<boolean> {
  return await orderExecutionService.cancelOrderById(orderId, privateKey);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }

  return data;
}

export async function getUserOrders(
  userId: string,
  filters?: {
    status?: OrderStatus;
    moduleType?: string;
    marketId?: string;
    paperTrading?: boolean;
  },
  limit: number = 100
): Promise<Order[]> {
  const result = await queryOptimizer.measureQuery(
    'getUserOrders',
    async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.moduleType) {
        query = query.eq('module', filters.moduleType);
      }

      if (filters?.marketId) {
        query = query.eq('market_id', filters.marketId);
      }

      return await query
        .order('created_at', { ascending: false })
        .limit(limit);
    }
  );

  if (result.error) {
    console.error('Error fetching user orders:', result.error);
    return [];
  }

  return result.data || [];
}

export async function getUserOrdersPaginated(
  userId: string,
  params: PaginationParams,
  filters?: {
    status?: OrderStatus;
    module?: string;
    marketId?: string;
  }
): Promise<PaginatedResult<Order>> {
  return queryOptimizer.getOrdersPaginated(userId, params, filters);
}

export async function getOpenOrders(userId: string, moduleType?: string): Promise<Order[]> {
  const result = await queryOptimizer.measureQuery(
    'getOpenOrders',
    async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'partially_filled']);

      if (moduleType) {
        query = query.eq('module', moduleType);
      }

      return await query.order('created_at', { ascending: false });
    }
  );

  if (result.error) {
    console.error('Error fetching open orders:', result.error);
    return [];
  }

  return result.data || [];
}

export async function getOrderFills(orderId: string): Promise<OrderFill[]> {
  return await orderExecutionService.getOrderFills(orderId);
}

export async function getOrderLogs(orderId: string): Promise<OrderExecutionLog[]> {
  return await orderExecutionService.getOrderLogs(orderId);
}

export async function getOrderSummary(
  userId: string,
  moduleType?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<OrderSummary> {
  try {
    const result = await queryOptimizer.measureQuery(
      'getOrderSummary',
      async () => {
        let query = supabase
          .from('orders')
          .select('status, size, price, filled_size')
          .eq('user_id', userId);

        if (moduleType) {
          query = query.eq('module', moduleType);
        }

        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }

        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }

        return await query;
      }
    );

    const { data: orders, error } = result;

    if (error) throw error;

    const summary: OrderSummary = {
      totalOrders: orders?.length || 0,
      openOrders: 0,
      filledOrders: 0,
      cancelledOrders: 0,
      failedOrders: 0,
      totalVolume: 0,
      totalFees: 0
    };

    orders?.forEach((order) => {
      if (['OPEN', 'SUBMITTED', 'PARTIALLY_FILLED'].includes(order.status)) {
        summary.openOrders++;
      } else if (order.status === 'FILLED') {
        summary.filledOrders++;
        summary.totalVolume += order.size * order.price;
      } else if (order.status === 'CANCELLED') {
        summary.cancelledOrders++;
      } else if (['FAILED', 'REJECTED'].includes(order.status)) {
        summary.failedOrders++;
      }

      if (order.filled_size > 0) {
        summary.totalVolume += order.filled_size * order.price;
      }
    });

    const { data: fills, error: fillsError } = await supabase
      .from('order_fills')
      .select('fee, order_id')
      .in(
        'order_id',
        orders?.map((o: any) => o.id) || []
      );

    if (!fillsError && fills) {
      summary.totalFees = fills.reduce((sum, fill) => sum + (fill.fee || 0), 0);
    }

    return summary;
  } catch (error) {
    console.error('Error getting order summary:', error);
    return {
      totalOrders: 0,
      openOrders: 0,
      filledOrders: 0,
      cancelledOrders: 0,
      failedOrders: 0,
      totalVolume: 0,
      totalFees: 0
    };
  }
}

export async function getRecentOrderActivity(
  userId: string,
  hours: number = 24,
  limit: number = 50
): Promise<Order[]> {
  const dateFrom = new Date();
  dateFrom.setHours(dateFrom.getHours() - hours);

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', dateFrom.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }

  return data || [];
}

export async function getOrdersByMarket(
  userId: string,
  marketId: string,
  limit: number = 50
): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching market orders:', error);
    return [];
  }

  return data || [];
}

export async function getTotalOrderVolume(
  userId: string,
  moduleType?: string,
  paperTrading?: boolean
): Promise<number> {
  try {
    let query = supabase
      .from('orders')
      .select('filled_size, price')
      .eq('user_id', userId)
      .eq('status', 'FILLED');

    if (moduleType) {
      query = query.eq('module_type', moduleType);
    }

    if (paperTrading !== undefined) {
      query = query.eq('paper_trading', paperTrading);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.reduce((sum, order) => sum + (order.filled_size * order.price), 0) || 0;
  } catch (error) {
    console.error('Error calculating order volume:', error);
    return 0;
  }
}

export async function updateOrderMetadata(
  orderId: string,
  metadata: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ metadata })
      .eq('id', orderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating order metadata:', error);
    return false;
  }
}

export async function bulkCancelOrders(
  userId: string,
  orderIds: string[],
  privateKey: string
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const orderId of orderIds) {
    try {
      const success = await cancelOrder(orderId, privateKey);
      if (success) {
        results.success.push(orderId);
      } else {
        results.failed.push(orderId);
      }
    } catch (error) {
      results.failed.push(orderId);
    }
  }

  return results;
}

export async function cancelAllOpenOrders(
  userId: string,
  privateKey: string,
  moduleType?: string
): Promise<{ cancelled: number; failed: number }> {
  const openOrders = await getOpenOrders(userId, moduleType);
  const orderIds = openOrders.map((order) => order.id);

  const results = await bulkCancelOrders(userId, orderIds, privateKey);

  return {
    cancelled: results.success.length,
    failed: results.failed.length
  };
}
