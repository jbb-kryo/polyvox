import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import {
  signOrder,
  submitOrder,
  getOrderStatus,
  cancelOrder,
  createOrderParams,
  checkUSDCBalance,
  OrderParams,
  SignedOrder,
  OrderResponse
} from './polymarketTrading';

export type OrderStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED'
  | 'EXPIRED';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'GTC' | 'FOK' | 'IOC';

export interface CreateOrderRequest {
  userId: string;
  moduleType: string;
  marketId: string;
  tokenId: string;
  side: OrderSide;
  orderType: OrderType;
  price: number;
  size: number;
  paperTrading: boolean;
  walletAddress: string;
  privateKey?: string;
  metadata?: Record<string, any>;
}

export interface Order {
  id: string;
  user_id: string;
  module_type: string;
  market_id: string;
  token_id: string;
  side: OrderSide;
  order_type: OrderType;
  price: number;
  size: number;
  filled_size: number;
  remaining_size: number;
  status: OrderStatus;
  clob_order_id?: string;
  signature?: string;
  order_hash?: string;
  paper_trading: boolean;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  filled_at?: string;
  cancelled_at?: string;
  error_message?: string;
  retry_count: number;
  metadata?: Record<string, any>;
}

export interface OrderFill {
  id: string;
  order_id: string;
  fill_id: string;
  price: number;
  size: number;
  fee: number;
  timestamp: string;
  transaction_hash?: string;
  metadata?: Record<string, any>;
}

export interface OrderExecutionLog {
  order_id: string;
  event_type: string;
  message: string;
  data?: Record<string, any>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const STATUS_POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

export class OrderExecutionService {
  private activePollers = new Map<string, NodeJS.Timeout>();

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: request.userId,
          module_type: request.moduleType,
          market_id: request.marketId,
          token_id: request.tokenId,
          side: request.side,
          order_type: request.orderType,
          price: request.price,
          size: request.size,
          filled_size: 0,
          remaining_size: request.size,
          status: 'PENDING',
          paper_trading: request.paperTrading,
          retry_count: 0,
          metadata: request.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      await this.logEvent(order.id, 'ORDER_CREATED', 'Order created successfully', {
        moduleType: request.moduleType,
        marketId: request.marketId,
        side: request.side,
        price: request.price,
        size: request.size
      });

      if (request.paperTrading) {
        await this.simulatePaperTrade(order.id);
      } else {
        if (!request.privateKey) {
          throw new Error('Private key required for live trading');
        }
        await this.executeOrder(order.id, request.walletAddress, request.privateKey);
      }

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  private async executeOrder(
    orderId: string,
    walletAddress: string,
    privateKey: string,
    retryCount: number = 0
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) throw new Error('Order not found');

      await this.logEvent(orderId, 'EXECUTION_STARTED', `Starting order execution (attempt ${retryCount + 1})`);

      const balanceCheck = await checkUSDCBalance(walletAddress, privateKey);
      const requiredBalance = order.side === 'BUY' ? order.price * order.size : 0;

      if (!balanceCheck.sufficient || balanceCheck.balance < requiredBalance) {
        await this.updateOrderStatus(orderId, 'FAILED', {
          error_message: `Insufficient USDC balance. Required: ${requiredBalance}, Available: ${balanceCheck.balance}`
        });
        await this.logEvent(orderId, 'INSUFFICIENT_BALANCE', 'Order failed due to insufficient balance', {
          required: requiredBalance,
          available: balanceCheck.balance
        });
        return;
      }

      const orderParams = createOrderParams(
        walletAddress,
        order.token_id,
        order.size,
        order.price,
        order.side.toLowerCase() as 'buy' | 'sell'
      );

      await this.logEvent(orderId, 'SIGNING_ORDER', 'Signing order with EIP-712');
      const signedOrder = await signOrder(orderParams, privateKey);

      const orderHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'uint256', 'uint256'],
          [orderParams.maker, orderParams.tokenId, orderParams.nonce, orderParams.expiration]
        )
      );

      await this.updateOrderStatus(orderId, 'SUBMITTED', {
        signature: signedOrder.signature,
        order_hash: orderHash,
        submitted_at: new Date().toISOString()
      });

      await this.logEvent(orderId, 'ORDER_SIGNED', 'Order signed successfully', {
        orderHash,
        signature: signedOrder.signature.substring(0, 20) + '...'
      });

      await this.logEvent(orderId, 'SUBMITTING_TO_CLOB', 'Submitting order to Polymarket CLOB');
      const submitResponse = await submitOrder(signedOrder, false);

      await this.updateOrderStatus(orderId, 'OPEN', {
        clob_order_id: submitResponse.orderId
      });

      await this.logEvent(orderId, 'ORDER_SUBMITTED', 'Order submitted to CLOB successfully', {
        clobOrderId: submitResponse.orderId,
        status: submitResponse.status
      });

      this.startStatusPolling(orderId, submitResponse.orderId);
    } catch (error: any) {
      await this.logEvent(orderId, 'EXECUTION_ERROR', `Error executing order: ${error.message}`, {
        error: error.message,
        retryCount
      });

      if (retryCount < MAX_RETRIES) {
        await this.updateOrderStatus(orderId, 'PENDING', {
          retry_count: retryCount + 1,
          error_message: error.message
        });

        await this.logEvent(orderId, 'RETRYING', `Retrying order execution in ${RETRY_DELAY_MS}ms`, {
          retryCount: retryCount + 1,
          maxRetries: MAX_RETRIES
        });

        setTimeout(() => {
          this.executeOrder(orderId, walletAddress, privateKey, retryCount + 1);
        }, RETRY_DELAY_MS);
      } else {
        await this.updateOrderStatus(orderId, 'FAILED', {
          error_message: `Order execution failed after ${MAX_RETRIES} attempts: ${error.message}`
        });

        await this.logEvent(orderId, 'EXECUTION_FAILED', 'Order execution failed after maximum retries', {
          error: error.message,
          maxRetries: MAX_RETRIES
        });
      }
    }
  }

  private async simulatePaperTrade(orderId: string): Promise<void> {
    await this.logEvent(orderId, 'PAPER_TRADE', 'Simulating paper trade execution');

    await this.updateOrderStatus(orderId, 'SUBMITTED', {
      submitted_at: new Date().toISOString(),
      clob_order_id: `paper-${orderId.substring(0, 8)}`
    });

    setTimeout(async () => {
      await this.updateOrderStatus(orderId, 'OPEN');
      await this.logEvent(orderId, 'PAPER_TRADE_OPEN', 'Paper trade order is now open');

      setTimeout(async () => {
        const order = await this.getOrder(orderId);
        if (!order) return;

        await this.recordFill(orderId, {
          fill_id: `paper-fill-${Date.now()}`,
          price: order.price,
          size: order.size,
          fee: 0,
          timestamp: new Date().toISOString(),
          metadata: { paperTrade: true }
        });

        await this.updateOrderStatus(orderId, 'FILLED', {
          filled_size: order.size,
          remaining_size: 0,
          filled_at: new Date().toISOString()
        });

        await this.logEvent(orderId, 'PAPER_TRADE_FILLED', 'Paper trade order filled successfully', {
          price: order.price,
          size: order.size
        });
      }, 3000);
    }, 1000);
  }

  private startStatusPolling(orderId: string, clobOrderId: string): void {
    if (this.activePollers.has(orderId)) {
      clearInterval(this.activePollers.get(orderId)!);
    }

    let pollAttempts = 0;

    const pollInterval = setInterval(async () => {
      try {
        pollAttempts++;

        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          clearInterval(pollInterval);
          this.activePollers.delete(orderId);
          await this.logEvent(orderId, 'POLLING_TIMEOUT', 'Status polling timeout - max attempts reached');
          return;
        }

        const order = await this.getOrder(orderId);
        if (!order || ['FILLED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(order.status)) {
          clearInterval(pollInterval);
          this.activePollers.delete(orderId);
          return;
        }

        const statusResponse = await getOrderStatus(clobOrderId, false);
        await this.handleStatusUpdate(orderId, statusResponse);
      } catch (error: any) {
        await this.logEvent(orderId, 'POLLING_ERROR', `Error polling order status: ${error.message}`);
      }
    }, STATUS_POLL_INTERVAL_MS);

    this.activePollers.set(orderId, pollInterval);
  }

  private async handleStatusUpdate(orderId: string, statusResponse: OrderResponse): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) return;

    const clobStatus = statusResponse.status;
    let newStatus: OrderStatus = order.status;

    if (clobStatus === 'filled') {
      newStatus = 'FILLED';
    } else if (clobStatus === 'partially_filled') {
      newStatus = 'PARTIALLY_FILLED';
    } else if (clobStatus === 'cancelled') {
      newStatus = 'CANCELLED';
    } else if (clobStatus === 'open') {
      newStatus = 'OPEN';
    }

    if (newStatus !== order.status) {
      const updates: any = { status: newStatus };

      if (statusResponse.filledAmount) {
        const filledSize = parseFloat(ethers.formatUnits(statusResponse.filledAmount, 6));
        updates.filled_size = filledSize;
        updates.remaining_size = order.size - filledSize;

        if (filledSize > order.filled_size) {
          await this.recordFill(orderId, {
            fill_id: `fill-${Date.now()}`,
            price: order.price,
            size: filledSize - order.filled_size,
            fee: 0,
            timestamp: new Date().toISOString()
          });
        }
      }

      if (newStatus === 'FILLED') {
        updates.filled_at = new Date().toISOString();
        updates.filled_size = order.size;
        updates.remaining_size = 0;
      } else if (newStatus === 'CANCELLED') {
        updates.cancelled_at = new Date().toISOString();
      }

      await this.updateOrderStatus(orderId, newStatus, updates);
      await this.logEvent(orderId, 'STATUS_UPDATED', `Order status changed to ${newStatus}`, {
        previousStatus: order.status,
        newStatus,
        filledSize: updates.filled_size,
        remainingSize: updates.remaining_size
      });
    }
  }

  async cancelOrderById(
    orderId: string,
    privateKey: string
  ): Promise<boolean> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) throw new Error('Order not found');

      if (['FILLED', 'CANCELLED', 'FAILED'].includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      if (order.paper_trading) {
        await this.updateOrderStatus(orderId, 'CANCELLED', {
          cancelled_at: new Date().toISOString()
        });
        await this.logEvent(orderId, 'ORDER_CANCELLED', 'Paper trade order cancelled');
        return true;
      }

      if (!order.clob_order_id) {
        throw new Error('Order has no CLOB order ID');
      }

      await this.logEvent(orderId, 'CANCELLING_ORDER', 'Requesting order cancellation from CLOB');
      const success = await cancelOrder(order.clob_order_id, privateKey, false);

      if (success) {
        await this.updateOrderStatus(orderId, 'CANCELLED', {
          cancelled_at: new Date().toISOString()
        });
        await this.logEvent(orderId, 'ORDER_CANCELLED', 'Order cancelled successfully');
      } else {
        await this.logEvent(orderId, 'CANCELLATION_FAILED', 'Failed to cancel order on CLOB');
      }

      if (this.activePollers.has(orderId)) {
        clearInterval(this.activePollers.get(orderId)!);
        this.activePollers.delete(orderId);
      }

      return success;
    } catch (error: any) {
      await this.logEvent(orderId, 'CANCELLATION_ERROR', `Error cancelling order: ${error.message}`);
      throw error;
    }
  }

  private async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }

    return data;
  }

  async getOrdersByUser(userId: string, limit: number = 100): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }

    return data || [];
  }

  async getOrdersByModule(
    userId: string,
    moduleType: string,
    limit: number = 100
  ): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('module_type', moduleType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching module orders:', error);
      return [];
    }

    return data || [];
  }

  async getOrderFills(orderId: string): Promise<OrderFill[]> {
    const { data, error } = await supabase
      .from('order_fills')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching fills:', error);
      return [];
    }

    return data || [];
  }

  async getOrderLogs(orderId: string): Promise<OrderExecutionLog[]> {
    const { data, error } = await supabase
      .from('order_execution_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }

    return data || [];
  }

  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    additionalUpdates: Partial<Order> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        ...additionalUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  private async recordFill(
    orderId: string,
    fill: Omit<OrderFill, 'id' | 'order_id'>
  ): Promise<void> {
    const { error } = await supabase
      .from('order_fills')
      .insert({
        order_id: orderId,
        ...fill
      });

    if (error) {
      console.error('Error recording fill:', error);
      throw error;
    }

    await this.logEvent(orderId, 'FILL_RECORDED', 'Order fill recorded', {
      fillId: fill.fill_id,
      price: fill.price,
      size: fill.size,
      fee: fill.fee
    });
  }

  private async logEvent(
    orderId: string,
    eventType: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('order_execution_logs')
        .insert({
          order_id: orderId,
          event_type: eventType,
          message,
          data: data || {},
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  cleanup(): void {
    this.activePollers.forEach((interval) => clearInterval(interval));
    this.activePollers.clear();
  }
}

export const orderExecutionService = new OrderExecutionService();
