import {
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeBoolean,
  sanitizeEthereumAddress,
  sanitizeMarketId,
  sanitizeTokenId,
} from '../utils/sanitization';

import { clampNumber } from '../utils/validation';

export interface TradeInputs {
  marketId: string;
  tokenId: string;
  amount: number;
  price: number;
  side: 'buy' | 'sell';
  slippage?: number;
}

export interface RiskLimitsInputs {
  maxPositionSize: number;
  maxPositionsPerMarket: number;
  maxTotalExposure: number;
  maxOpenPositions: number;
  maxDailyLoss: number;
}

export interface ModuleSettingsInputs {
  moduleName: string;
  enabled: boolean;
  minEdge?: number;
  maxPositionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  slippageTolerance?: number;
}

export function sanitizeTradeInput(input: Partial<TradeInputs>): TradeInputs | null {
  const marketId = input.marketId ? sanitizeMarketId(input.marketId) : '';
  const tokenId = input.tokenId ? sanitizeTokenId(input.tokenId) : '';

  if (!marketId || !tokenId) {
    return null;
  }

  const amount = sanitizeNumber(input.amount);
  const price = sanitizeNumber(input.price);

  if (amount === null || price === null || amount <= 0 || price <= 0 || price > 1) {
    return null;
  }

  const side = input.side === 'buy' || input.side === 'sell' ? input.side : 'buy';

  const slippage = input.slippage !== undefined
    ? clampNumber(sanitizeNumber(input.slippage, 1), 0.1, 50)
    : 1;

  return {
    marketId,
    tokenId,
    amount: clampNumber(amount, 0.01, 1000000),
    price: clampNumber(price, 0, 1),
    side,
    slippage,
  };
}

export function sanitizeRiskLimitsInput(input: Partial<RiskLimitsInputs>): RiskLimitsInputs | null {
  const maxPositionSize = sanitizeNumber(input.maxPositionSize);
  const maxPositionsPerMarket = sanitizeInteger(input.maxPositionsPerMarket);
  const maxTotalExposure = sanitizeNumber(input.maxTotalExposure);
  const maxOpenPositions = sanitizeInteger(input.maxOpenPositions);
  const maxDailyLoss = sanitizeNumber(input.maxDailyLoss);

  if (
    maxPositionSize === null ||
    maxPositionsPerMarket === null ||
    maxTotalExposure === null ||
    maxOpenPositions === null ||
    maxDailyLoss === null
  ) {
    return null;
  }

  if (maxPositionSize <= 0 || maxTotalExposure <= 0 || maxDailyLoss <= 0) {
    return null;
  }

  if (maxPositionsPerMarket < 1 || maxOpenPositions < 1) {
    return null;
  }

  return {
    maxPositionSize: clampNumber(maxPositionSize, 1, 1000000),
    maxPositionsPerMarket: clampNumber(maxPositionsPerMarket, 1, 100),
    maxTotalExposure: clampNumber(maxTotalExposure, 1, 10000000),
    maxOpenPositions: clampNumber(maxOpenPositions, 1, 1000),
    maxDailyLoss: clampNumber(maxDailyLoss, 1, 1000000),
  };
}

export function sanitizeModuleSettingsInput(input: Partial<ModuleSettingsInputs>): ModuleSettingsInputs | null {
  const moduleName = input.moduleName ? sanitizeString(input.moduleName, 50) : '';

  if (!moduleName) {
    return null;
  }

  const enabled = sanitizeBoolean(input.enabled);

  const settings: ModuleSettingsInputs = {
    moduleName,
    enabled,
  };

  if (input.minEdge !== undefined) {
    const minEdge = sanitizeNumber(input.minEdge);
    if (minEdge !== null) {
      settings.minEdge = clampNumber(minEdge, 0.01, 50);
    }
  }

  if (input.maxPositionSize !== undefined) {
    const maxPositionSize = sanitizeNumber(input.maxPositionSize);
    if (maxPositionSize !== null) {
      settings.maxPositionSize = clampNumber(maxPositionSize, 1, 1000000);
    }
  }

  if (input.stopLoss !== undefined) {
    const stopLoss = sanitizeNumber(input.stopLoss);
    if (stopLoss !== null) {
      settings.stopLoss = clampNumber(stopLoss, 0, 100);
    }
  }

  if (input.takeProfit !== undefined) {
    const takeProfit = sanitizeNumber(input.takeProfit);
    if (takeProfit !== null) {
      settings.takeProfit = clampNumber(takeProfit, 0, 1000);
    }
  }

  if (input.slippageTolerance !== undefined) {
    const slippageTolerance = sanitizeNumber(input.slippageTolerance);
    if (slippageTolerance !== null) {
      settings.slippageTolerance = clampNumber(slippageTolerance, 0.1, 50);
    }
  }

  return settings;
}

export function sanitizeWalletAddress(address: string): string | null {
  const sanitized = sanitizeEthereumAddress(address);
  return sanitized || null;
}

export function sanitizeMarketIdInput(marketId: string): string | null {
  const sanitized = sanitizeMarketId(marketId);
  return sanitized || null;
}

export function sanitizeTokenIdInput(tokenId: string): string | null {
  const sanitized = sanitizeTokenId(tokenId);
  return sanitized || null;
}

export function sanitizePercentage(value: any): number | null {
  const num = sanitizeNumber(value);
  if (num === null) return null;
  return clampNumber(num, 0, 100);
}

export function sanitizePrice(value: any): number | null {
  const num = sanitizeNumber(value);
  if (num === null) return null;
  return clampNumber(num, 0, 1);
}

export function sanitizeAmount(value: any, max: number = 1000000): number | null {
  const num = sanitizeNumber(value);
  if (num === null || num <= 0) return null;
  return clampNumber(num, 0.01, max);
}

export const inputSanitizer = {
  sanitizeTradeInput,
  sanitizeRiskLimitsInput,
  sanitizeModuleSettingsInput,
  sanitizeWalletAddress,
  sanitizeMarketIdInput,
  sanitizeTokenIdInput,
  sanitizePercentage,
  sanitizePrice,
  sanitizeAmount,
};

export default inputSanitizer;
