import { riskLimitsService, PreTradeCheckResult } from './riskLimits';
import toast from 'react-hot-toast';

export interface TradeRequest {
  userId: string;
  marketId: string;
  side: 'YES' | 'NO';
  positionSize: number;
  entryPrice: number;
  moduleType: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeExecutionResult {
  success: boolean;
  orderId?: string;
  positionId?: string;
  error?: string;
  riskCheckFailed?: boolean;
  violations?: any[];
}

export async function executeTradeWithRiskChecks(
  tradeRequest: TradeRequest,
  executeFn: () => Promise<any>
): Promise<TradeExecutionResult> {
  try {
    const preCheck = await riskLimitsService.performPreTradeChecks(
      tradeRequest.userId,
      tradeRequest.marketId,
      tradeRequest.positionSize * tradeRequest.entryPrice,
      tradeRequest.moduleType
    );

    if (!preCheck.allowed) {
      const primaryViolation = preCheck.violations[0];

      let errorMessage = 'Trade blocked by risk limits';

      if (primaryViolation) {
        switch (primaryViolation.type) {
          case 'trading_halted':
            errorMessage = 'Trading is currently halted';
            break;
          case 'position_size_exceeded':
            errorMessage = `Position size exceeds limit of $${primaryViolation.limit}`;
            break;
          case 'total_exposure_exceeded':
            errorMessage = `Total exposure would exceed limit of $${primaryViolation.limit}`;
            break;
          case 'market_position_limit_exceeded':
            errorMessage = `Maximum positions per market (${primaryViolation.limit}) reached`;
            break;
          default:
            errorMessage = primaryViolation.message;
        }
      }

      toast.error(errorMessage, {
        duration: 5000,
        icon: '🛑'
      });

      console.warn('Trade blocked by risk limits:', {
        violations: preCheck.violations,
        tradeRequest
      });

      return {
        success: false,
        error: errorMessage,
        riskCheckFailed: true,
        violations: preCheck.violations
      };
    }

    if (preCheck.warnings.length > 0) {
      preCheck.warnings.forEach(warning => {
        toast(warning.message, {
          icon: '⚠️',
          duration: 4000
        });
      });
    }

    const result = await executeFn();

    if (result.success) {
      toast.success('Trade executed successfully', {
        icon: '✅'
      });
    }

    return result;
  } catch (error) {
    console.error('Error in executeTradeWithRiskChecks:', error);

    toast.error('Trade execution failed', {
      icon: '❌'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      riskCheckFailed: false
    };
  }
}

export async function checkBeforeTrade(
  userId: string,
  marketId: string,
  positionSize: number,
  moduleType: string
): Promise<PreTradeCheckResult> {
  return await riskLimitsService.performPreTradeChecks(
    userId,
    marketId,
    positionSize,
    moduleType
  );
}

export async function notifyTradeResult(
  userId: string,
  pnl: number,
  fees: number = 0
): Promise<void> {
  await riskLimitsService.updateDailyTracking(userId, pnl, fees);

  const dailyTracking = await riskLimitsService.getDailyTracking(userId);

  if (dailyTracking?.limitBreached) {
    toast.error(`Daily loss limit exceeded! Trading halted.`, {
      duration: 10000,
      icon: '🚨'
    });
  }
}

export function formatViolationMessage(violation: any): string {
  const limit = violation.limit ? `$${violation.limit.toFixed(2)}` : 'N/A';
  const current = violation.current ? `$${violation.current.toFixed(2)}` : 'N/A';
  const attempted = violation.attempted ? `$${violation.attempted.toFixed(2)}` : 'N/A';

  switch (violation.type) {
    case 'trading_halted':
      return 'Trading is currently halted due to risk limits';
    case 'position_size_exceeded':
      return `Position size (${attempted}) exceeds limit (${limit})`;
    case 'total_exposure_exceeded':
      return `Total exposure would be ${attempted}, exceeding limit of ${limit}. Current: ${current}`;
    case 'market_position_limit_exceeded':
      return `Already have ${current} position(s) in this market (limit: ${limit})`;
    case 'daily_loss_exceeded':
      return `Daily loss (${current}) exceeds limit (${limit})`;
    default:
      return violation.message || 'Risk limit exceeded';
  }
}
