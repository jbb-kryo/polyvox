import { createOrder, getOpenOrders, cancelOrder, getOrderSummary } from './database/ordersDb';
import { CreateOrderRequest, OrderSide } from './orderExecution';

export async function executeTradeExample(
  userId: string,
  walletAddress: string,
  privateKey: string | undefined,
  paperTradingMode: boolean
) {
  try {
    const orderRequest: CreateOrderRequest = {
      userId,
      moduleType: 'arbitrage',
      marketId: '0x123abc...',
      tokenId: '456789',
      side: 'BUY' as OrderSide,
      orderType: 'LIMIT',
      price: 0.65,
      size: 100,
      paperTrading: paperTradingMode,
      walletAddress,
      privateKey: paperTradingMode ? undefined : privateKey,
      metadata: {
        strategy: 'arbitrage-hunter',
        confidence: 0.85,
        expectedProfit: 5.2
      }
    };

    const order = await createOrder(orderRequest);
    console.log('Order created:', order.id);

    return order;
  } catch (error: any) {
    console.error('Trade execution failed:', error);
    throw new Error(`Failed to execute trade: ${error.message}`);
  }
}

export async function monitorOpenOrders(userId: string, moduleType: string) {
  try {
    const openOrders = await getOpenOrders(userId, moduleType);
    console.log(`Found ${openOrders.length} open orders for ${moduleType}`);

    openOrders.forEach((order) => {
      console.log(`Order ${order.id}:`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Market: ${order.market_id}`);
      console.log(`  Side: ${order.side}`);
      console.log(`  Price: ${order.price}`);
      console.log(`  Filled: ${order.filled_size}/${order.size}`);
      console.log(`  Remaining: ${order.remaining_size}`);
    });

    return openOrders;
  } catch (error) {
    console.error('Error monitoring orders:', error);
    return [];
  }
}

export async function cancelOpenOrdersExample(
  userId: string,
  moduleType: string,
  privateKey: string
) {
  try {
    const openOrders = await getOpenOrders(userId, moduleType);

    for (const order of openOrders) {
      if (['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) {
        console.log(`Cancelling order ${order.id}...`);
        const success = await cancelOrder(order.id, privateKey);

        if (success) {
          console.log(`✓ Order ${order.id} cancelled successfully`);
        } else {
          console.log(`✗ Failed to cancel order ${order.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cancelling orders:', error);
  }
}

export async function getTradingStatistics(userId: string, moduleType: string) {
  try {
    const summary = await getOrderSummary(userId, moduleType);

    console.log('Trading Statistics:');
    console.log(`  Total Orders: ${summary.totalOrders}`);
    console.log(`  Open: ${summary.openOrders}`);
    console.log(`  Filled: ${summary.filledOrders}`);
    console.log(`  Cancelled: ${summary.cancelledOrders}`);
    console.log(`  Failed: ${summary.failedOrders}`);
    console.log(`  Total Volume: $${summary.totalVolume.toFixed(2)}`);
    console.log(`  Total Fees: $${summary.totalFees.toFixed(2)}`);

    return summary;
  } catch (error) {
    console.error('Error getting statistics:', error);
    return null;
  }
}
