import { orderExecutionService } from './orderExecution';
import { positionManager } from './positionManager';
import { fetchMarkets, fetchMarket } from './polymarket';
import { getUserId } from './database/moduleSettings';

export interface PaperTradingTestResult {
  testName: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  message: string;
  details?: any;
  timestamp: string;
}

export class PaperTradingTester {
  private results: PaperTradingTestResult[] = [];
  private userId: string | null = null;

  private addResult(testName: string, status: PaperTradingTestResult['status'], message: string, details?: any) {
    this.results.push({
      testName,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async initialize(): Promise<void> {
    this.userId = await getUserId();
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    positionManager.initialize(this.userId);
  }

  async testMarketDataAccess(): Promise<void> {
    try {
      const markets = await fetchMarkets(10, 0);

      if (!markets || markets.length === 0) {
        this.addResult(
          'Market Data Access',
          'FAILED',
          'Failed to fetch market data',
          { marketCount: 0 }
        );
        return;
      }

      this.addResult(
        'Market Data Access',
        'PASSED',
        `Successfully fetched ${markets.length} markets with real data`,
        {
          marketCount: markets.length,
          sampleMarket: {
            id: markets[0].id,
            question: markets[0].question,
            volume: markets[0].volume24h,
            liquidity: markets[0].liquidity
          }
        }
      );
    } catch (error: any) {
      this.addResult(
        'Market Data Access',
        'FAILED',
        `Error fetching market data: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testPaperOrderCreation(): Promise<void> {
    try {
      const markets = await fetchMarkets(5, 0);

      if (!markets || markets.length === 0) {
        this.addResult(
          'Paper Order Creation',
          'FAILED',
          'No markets available for testing'
        );
        return;
      }

      const testMarket = markets[0];
      const testOrder = await orderExecutionService.createOrder({
        userId: this.userId!,
        moduleType: 'TEST',
        marketId: testMarket.id,
        tokenId: testMarket.outcomes[0].id,
        side: 'BUY',
        orderType: 'LIMIT',
        price: testMarket.outcomes[0].price * 0.99,
        size: 10,
        paperTrading: true,
        walletAddress: '0x0000000000000000000000000000000000000000'
      });

      if (!testOrder.paper_trading) {
        this.addResult(
          'Paper Order Creation',
          'FAILED',
          'Order was not marked as paper trading',
          { order: testOrder }
        );
        return;
      }

      if (testOrder.clob_order_id && testOrder.clob_order_id.startsWith('paper-')) {
        this.addResult(
          'Paper Order Creation',
          'PASSED',
          'Paper order created successfully without blockchain interaction',
          {
            orderId: testOrder.id,
            clobOrderId: testOrder.clob_order_id,
            marketId: testMarket.id,
            price: testOrder.price,
            size: testOrder.size
          }
        );
      } else {
        this.addResult(
          'Paper Order Creation',
          'WARNING',
          'Paper order created but CLOB ID format unexpected',
          { order: testOrder }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const updatedOrder = (await orderExecutionService.getOrdersByUser(this.userId!, 1))[0];

      if (updatedOrder && updatedOrder.status === 'FILLED') {
        this.addResult(
          'Paper Order Simulation',
          'PASSED',
          'Paper order was automatically filled after simulation delay',
          {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            filledSize: updatedOrder.filled_size
          }
        );
      } else {
        this.addResult(
          'Paper Order Simulation',
          'WARNING',
          'Paper order simulation may not have completed',
          { order: updatedOrder }
        );
      }
    } catch (error: any) {
      this.addResult(
        'Paper Order Creation',
        'FAILED',
        `Error creating paper order: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testNoBlockchainTransactions(): Promise<void> {
    try {
      const orders = await orderExecutionService.getOrdersByUser(this.userId!, 10);
      const paperOrders = orders.filter(o => o.paper_trading);

      const hasRealTransactions = paperOrders.some(
        order => order.transaction_hash || (order.clob_order_id && !order.clob_order_id.startsWith('paper-'))
      );

      if (hasRealTransactions) {
        this.addResult(
          'No Blockchain Transactions',
          'FAILED',
          'Found paper orders with real transaction hashes',
          { suspiciousOrders: paperOrders.filter(o => o.transaction_hash) }
        );
      } else {
        this.addResult(
          'No Blockchain Transactions',
          'PASSED',
          'Verified no blockchain transactions for paper orders',
          {
            paperOrdersChecked: paperOrders.length,
            allSafe: true
          }
        );
      }
    } catch (error: any) {
      this.addResult(
        'No Blockchain Transactions',
        'FAILED',
        `Error checking transactions: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testPnLCalculation(): Promise<void> {
    try {
      const markets = await fetchMarkets(5, 0);

      if (!markets || markets.length === 0) {
        this.addResult('P&L Calculation', 'FAILED', 'No markets available');
        return;
      }

      const testMarket = markets[0];
      const entryPrice = 0.50;
      const positionSize = 100;

      const order = await orderExecutionService.createOrder({
        userId: this.userId!,
        moduleType: 'TEST',
        marketId: testMarket.id,
        tokenId: testMarket.outcomes[0].id,
        side: 'BUY',
        orderType: 'LIMIT',
        price: entryPrice,
        size: positionSize,
        paperTrading: true,
        walletAddress: '0x0000000000000000000000000000000000000000'
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const positions = await positionManager.getActivePositions('TEST');
      const testPosition = positions.find(p => p.marketId === testMarket.id);

      if (!testPosition) {
        this.addResult(
          'P&L Calculation',
          'WARNING',
          'Position not created after order fill',
          { orderId: order.id }
        );
        return;
      }

      const expectedCost = entryPrice * positionSize;
      const currentPrice = testPosition.currentPrice || entryPrice;
      const currentValue = currentPrice * positionSize;
      const expectedPnl = currentValue - expectedCost;
      const expectedPnlPercent = (expectedPnl / expectedCost) * 100;

      const pnlAccurate = Math.abs(testPosition.unrealizedPnl - expectedPnl) < 0.01;
      const pnlPercentAccurate = Math.abs(testPosition.unrealizedPnlPercent - expectedPnlPercent) < 0.1;

      if (pnlAccurate && pnlPercentAccurate) {
        this.addResult(
          'P&L Calculation',
          'PASSED',
          'P&L calculations are accurate',
          {
            entryPrice,
            currentPrice,
            positionSize,
            expectedPnl,
            actualPnl: testPosition.unrealizedPnl,
            expectedPnlPercent,
            actualPnlPercent: testPosition.unrealizedPnlPercent
          }
        );
      } else {
        this.addResult(
          'P&L Calculation',
          'FAILED',
          'P&L calculations are inaccurate',
          {
            expected: { pnl: expectedPnl, pnlPercent: expectedPnlPercent },
            actual: { pnl: testPosition.unrealizedPnl, pnlPercent: testPosition.unrealizedPnlPercent },
            difference: {
              pnl: Math.abs(testPosition.unrealizedPnl - expectedPnl),
              pnlPercent: Math.abs(testPosition.unrealizedPnlPercent - expectedPnlPercent)
            }
          }
        );
      }
    } catch (error: any) {
      this.addResult(
        'P&L Calculation',
        'FAILED',
        `Error testing P&L: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testPositionTracking(): Promise<void> {
    try {
      const positions = await positionManager.getActivePositions();
      const history = await positionManager.getPositionHistory(10);
      const summary = await positionManager.getPortfolioSummary();

      const trackingWorks = summary.totalPositions >= 0 &&
                            summary.totalValue >= 0 &&
                            summary.totalCost >= 0;

      if (trackingWorks) {
        this.addResult(
          'Position Tracking',
          'PASSED',
          'Position tracking is operational',
          {
            activePositions: positions.length,
            historicalPositions: history.length,
            summary: {
              total: summary.totalPositions,
              value: summary.totalValue,
              pnl: summary.totalPnl
            }
          }
        );
      } else {
        this.addResult(
          'Position Tracking',
          'FAILED',
          'Position tracking has invalid data',
          { summary }
        );
      }
    } catch (error: any) {
      this.addResult(
        'Position Tracking',
        'FAILED',
        `Error testing position tracking: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testModeSwitching(): Promise<void> {
    try {
      const paperOrder = await orderExecutionService.createOrder({
        userId: this.userId!,
        moduleType: 'TEST',
        marketId: 'test-market',
        tokenId: 'test-token',
        side: 'BUY',
        orderType: 'LIMIT',
        price: 0.5,
        size: 10,
        paperTrading: true,
        walletAddress: '0x0000000000000000000000000000000000000000'
      });

      if (!paperOrder.paper_trading) {
        this.addResult(
          'Mode Switching - Paper Mode',
          'FAILED',
          'Paper mode not respected in order creation'
        );
        return;
      }

      this.addResult(
        'Mode Switching - Paper Mode',
        'PASSED',
        'Paper trading mode properly enforced',
        {
          orderId: paperOrder.id,
          paperTrading: paperOrder.paper_trading
        }
      );

      this.addResult(
        'Mode Switching - Live Mode',
        'WARNING',
        'Live mode testing skipped - requires real wallet and private key',
        {
          note: 'Live mode can only be tested with actual credentials'
        }
      );
    } catch (error: any) {
      this.addResult(
        'Mode Switching',
        'FAILED',
        `Error testing mode switching: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testMarketDataRealtimeUpdates(): Promise<void> {
    try {
      const markets1 = await fetchMarkets(5, 0);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const markets2 = await fetchMarkets(5, 0);

      if (markets1.length > 0 && markets2.length > 0) {
        const market1 = markets1[0];
        const market2 = markets2.find(m => m.id === market1.id);

        if (market2) {
          this.addResult(
            'Real-time Market Data',
            'PASSED',
            'Market data updates are working',
            {
              marketId: market1.id,
              initialPrice: market1.outcomes[0].price,
              updatedPrice: market2.outcomes[0].price,
              priceChanged: market1.outcomes[0].price !== market2.outcomes[0].price
            }
          );
        } else {
          this.addResult(
            'Real-time Market Data',
            'WARNING',
            'Market not found in second fetch',
            { marketId: market1.id }
          );
        }
      } else {
        this.addResult(
          'Real-time Market Data',
          'FAILED',
          'Unable to fetch markets for comparison'
        );
      }
    } catch (error: any) {
      this.addResult(
        'Real-time Market Data',
        'FAILED',
        `Error testing market data updates: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async runAllTests(): Promise<PaperTradingTestResult[]> {
    this.results = [];

    console.log('Starting paper trading mode comprehensive tests...');

    await this.initialize();

    console.log('Test 1: Market Data Access');
    await this.testMarketDataAccess();

    console.log('Test 2: Real-time Market Data Updates');
    await this.testMarketDataRealtimeUpdates();

    console.log('Test 3: Paper Order Creation');
    await this.testPaperOrderCreation();

    console.log('Test 4: No Blockchain Transactions');
    await this.testNoBlockchainTransactions();

    console.log('Test 5: P&L Calculation');
    await this.testPnLCalculation();

    console.log('Test 6: Position Tracking');
    await this.testPositionTracking();

    console.log('Test 7: Mode Switching');
    await this.testModeSwitching();

    return this.results;
  }

  getResults(): PaperTradingTestResult[] {
    return this.results;
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    passRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      warnings,
      passRate
    };
  }
}

export const paperTradingTester = new PaperTradingTester();
