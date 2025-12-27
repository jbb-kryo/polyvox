import { OrderBook } from '../types';
import { RealTimeArbitrageOpportunity } from './arbitrageScanner';
import { supabase } from '../lib/supabase';

export interface AtomicOrderResult {
  success: boolean;
  orderId1?: string;
  orderId2?: string;
  txHash1?: string;
  txHash2?: string;
  executionTime: number;
  actualPrices: {
    market1: number;
    market2: number;
  };
  errors?: string[];
}

export interface OrderExecutionPlan {
  market1: {
    marketId: string;
    tokenId: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    expectedSlippage: number;
  };
  market2: {
    marketId: string;
    tokenId: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    expectedSlippage: number;
  };
  totalCost: number;
  expectedProfit: number;
  maxExecutionTime: number;
}

async function validateOrderExecution(
  opportunity: RealTimeArbitrageOpportunity,
  positionSize: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (opportunity.calculation.netProfit <= 0) {
    errors.push('Net profit is not positive');
  }

  if (opportunity.calculation.executionProbability < 0.7) {
    errors.push(`Execution probability too low: ${(opportunity.calculation.executionProbability * 100).toFixed(0)}%`);
  }

  if (opportunity.liquidity.market1.totalAskLiquidity < positionSize) {
    errors.push('Insufficient liquidity in market 1');
  }

  if (opportunity.liquidity.market2.totalAskLiquidity < positionSize) {
    errors.push('Insufficient liquidity in market 2');
  }

  if (opportunity.risks.length > 3) {
    errors.push(`Too many risks: ${opportunity.risks.length}`);
  }

  const timeSinceDiscovery = Date.now() - opportunity.timestamp;
  if (timeSinceDiscovery > 30000) {
    errors.push('Opportunity is stale (>30 seconds old)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function createExecutionPlan(
  opportunity: RealTimeArbitrageOpportunity,
  positionSize: number
): OrderExecutionPlan {
  const amount1 = positionSize / opportunity.marketPair.market1.price;
  const amount2 = positionSize / opportunity.marketPair.market2.price;

  return {
    market1: {
      marketId: opportunity.marketPair.market1.id,
      tokenId: opportunity.marketPair.market1.tokenId || 'yes',
      side: 'buy',
      amount: amount1,
      price: opportunity.marketPair.market1.price,
      expectedSlippage: 0.5
    },
    market2: {
      marketId: opportunity.marketPair.market2.id,
      tokenId: opportunity.marketPair.market2.tokenId || 'yes',
      side: 'buy',
      amount: amount2,
      price: opportunity.marketPair.market2.price,
      expectedSlippage: 0.5
    },
    totalCost: positionSize,
    expectedProfit: opportunity.calculation.netProfit,
    maxExecutionTime: 5000
  };
}

async function simulateOrderExecution(
  plan: OrderExecutionPlan
): Promise<AtomicOrderResult> {
  const startTime = Date.now();

  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  const success = Math.random() > 0.1;

  const priceVariation1 = (Math.random() - 0.5) * 0.01;
  const priceVariation2 = (Math.random() - 0.5) * 0.01;

  const actualPrice1 = plan.market1.price * (1 + priceVariation1);
  const actualPrice2 = plan.market2.price * (1 + priceVariation2);

  const executionTime = Date.now() - startTime;

  if (success) {
    return {
      success: true,
      orderId1: `sim-order-${plan.market1.marketId}-${Date.now()}-1`,
      orderId2: `sim-order-${plan.market2.marketId}-${Date.now()}-2`,
      executionTime,
      actualPrices: {
        market1: actualPrice1,
        market2: actualPrice2
      }
    };
  } else {
    return {
      success: false,
      executionTime,
      actualPrices: {
        market1: actualPrice1,
        market2: actualPrice2
      },
      errors: ['Simulation: Order execution failed']
    };
  }
}

async function realOrderExecution(
  plan: OrderExecutionPlan,
  walletAddress: string,
  walletPrivateKey: string
): Promise<AtomicOrderResult> {
  const startTime = Date.now();

  try {
    console.log('Executing real atomic orders...', {
      market1: plan.market1.marketId,
      market2: plan.market2.marketId,
      amount1: plan.market1.amount,
      amount2: plan.market2.amount
    });

    const errors: string[] = [];
    errors.push('Real order execution requires full Polymarket SDK integration');
    errors.push('API keys and wallet setup needed');

    return {
      success: false,
      executionTime: Date.now() - startTime,
      actualPrices: {
        market1: plan.market1.price,
        market2: plan.market2.price
      },
      errors
    };
  } catch (error) {
    console.error('Real order execution error:', error);

    return {
      success: false,
      executionTime: Date.now() - startTime,
      actualPrices: {
        market1: plan.market1.price,
        market2: plan.market2.price
      },
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

export async function executeAtomicArbitrageOrders(
  opportunity: RealTimeArbitrageOpportunity,
  positionSize: number,
  isRealMode: boolean,
  walletAddress?: string,
  walletPrivateKey?: string
): Promise<AtomicOrderResult> {
  try {
    const validation = await validateOrderExecution(opportunity, positionSize);

    if (!validation.valid) {
      return {
        success: false,
        executionTime: 0,
        actualPrices: {
          market1: opportunity.marketPair.market1.price,
          market2: opportunity.marketPair.market2.price
        },
        errors: validation.errors
      };
    }

    const plan = createExecutionPlan(opportunity, positionSize);

    console.log('Execution plan created:', {
      market1: plan.market1.marketId,
      market2: plan.market2.marketId,
      totalCost: plan.totalCost,
      expectedProfit: plan.expectedProfit
    });

    let result: AtomicOrderResult;

    if (isRealMode && walletAddress && walletPrivateKey) {
      result = await realOrderExecution(plan, walletAddress, walletPrivateKey);
    } else {
      result = await simulateOrderExecution(plan);
    }

    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.from('arbitrage_executions').insert({
        user_id: authData.user.id,
        opportunity_id: opportunity.id,
        market1_id: opportunity.marketPair.market1.id,
        market2_id: opportunity.marketPair.market2.id,
        entry_price_1: opportunity.marketPair.market1.price,
        entry_price_2: opportunity.marketPair.market2.price,
        actual_price_1: result.actualPrices.market1,
        actual_price_2: result.actualPrices.market2,
        position_size: positionSize,
        expected_profit: opportunity.calculation.netProfit,
        expected_profit_percent: opportunity.calculation.profitPercent,
        execution_time_ms: result.executionTime,
        success: result.success,
        is_real: isRealMode,
        order_id_1: result.orderId1,
        order_id_2: result.orderId2,
        tx_hash_1: result.txHash1,
        tx_hash_2: result.txHash2,
        errors: result.errors,
        execution_plan: plan,
        opportunity_data: {
          confidence: opportunity.confidence,
          executionProbability: opportunity.calculation.executionProbability,
          risks: opportunity.risks,
          liquidity: {
            market1: opportunity.liquidity.market1.totalAskLiquidity,
            market2: opportunity.liquidity.market2.totalAskLiquidity
          }
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Atomic order execution error:', error);

    return {
      success: false,
      executionTime: 0,
      actualPrices: {
        market1: opportunity.marketPair.market1.price,
        market2: opportunity.marketPair.market2.price
      },
      errors: [error instanceof Error ? error.message : 'Unknown execution error']
    };
  }
}

export async function monitorPositionHealth(
  positionId: string,
  marketId1: string,
  marketId2: string,
  entryPrices: { market1: number; market2: number },
  positionSize: number
): Promise<{
  healthy: boolean;
  currentPrices: { market1: number; market2: number };
  currentProfit: number;
  warnings: string[];
}> {
  try {
    const { data: positionData, error } = await supabase
      .from('arbitrage_positions')
      .select('*')
      .eq('id', positionId)
      .maybeSingle();

    if (error || !positionData) {
      return {
        healthy: false,
        currentPrices: entryPrices,
        currentProfit: 0,
        warnings: ['Unable to fetch position data']
      };
    }

    const warnings: string[] = [];

    const currentProfit = positionData.current_pnl || 0;
    const profitPercent = (currentProfit / positionSize) * 100;

    if (profitPercent < -5) {
      warnings.push('Position losing money');
    }

    if (profitPercent < -10) {
      warnings.push('CRITICAL: Position down >10%');
    }

    const positionAge = Date.now() - new Date(positionData.created_at).getTime();
    if (positionAge > 24 * 60 * 60 * 1000) {
      warnings.push('Position open >24 hours');
    }

    const healthy = warnings.filter(w => w.includes('CRITICAL')).length === 0;

    return {
      healthy,
      currentPrices: {
        market1: positionData.current_price_1 || entryPrices.market1,
        market2: positionData.current_price_2 || entryPrices.market2
      },
      currentProfit,
      warnings
    };
  } catch (error) {
    console.error('Error monitoring position health:', error);

    return {
      healthy: false,
      currentPrices: entryPrices,
      currentProfit: 0,
      warnings: ['Error checking position health']
    };
  }
}

export async function closeArbitragePosition(
  positionId: string,
  marketId1: string,
  marketId2: string,
  positionSize: number,
  isRealMode: boolean,
  walletAddress?: string,
  walletPrivateKey?: string
): Promise<{
  success: boolean;
  exitPrices: { market1: number; market2: number };
  realizedProfit: number;
  txHashes?: string[];
  errors?: string[];
}> {
  try {
    const startTime = Date.now();

    if (isRealMode && walletAddress && walletPrivateKey) {
      return {
        success: false,
        exitPrices: { market1: 0, market2: 0 },
        realizedProfit: 0,
        errors: ['Real position closing requires full Polymarket SDK integration']
      };
    }

    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const { data: position, error } = await supabase
      .from('arbitrage_positions')
      .select('*')
      .eq('id', positionId)
      .maybeSingle();

    if (error || !position) {
      return {
        success: false,
        exitPrices: { market1: 0, market2: 0 },
        realizedProfit: 0,
        errors: ['Position not found']
      };
    }

    const exitPrices = {
      market1: position.current_price_1 || position.entry_price_1,
      market2: position.current_price_2 || position.entry_price_2
    };

    const realizedProfit = position.current_pnl || 0;

    await supabase
      .from('arbitrage_positions')
      .update({
        status: 'closed',
        exit_price_1: exitPrices.market1,
        exit_price_2: exitPrices.market2,
        realized_profit: realizedProfit,
        closed_at: new Date().toISOString()
      })
      .eq('id', positionId);

    await supabase.from('arbitrage_trades').insert({
      user_id: position.user_id,
      position_id: positionId,
      market1_id: marketId1,
      market2_id: marketId2,
      entry_price_1: position.entry_price_1,
      entry_price_2: position.entry_price_2,
      exit_price_1: exitPrices.market1,
      exit_price_2: exitPrices.market2,
      position_size: positionSize,
      profit: realizedProfit,
      profit_percent: (realizedProfit / positionSize) * 100,
      duration_ms: Date.now() - new Date(position.created_at).getTime(),
      is_real: isRealMode
    });

    return {
      success: true,
      exitPrices,
      realizedProfit
    };
  } catch (error) {
    console.error('Error closing position:', error);

    return {
      success: false,
      exitPrices: { market1: 0, market2: 0 },
      realizedProfit: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}
