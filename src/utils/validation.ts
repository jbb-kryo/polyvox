export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validators = {
  required: (value: any): string | null => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return 'This field is required';
    }
    return null;
  },

  min: (value: number, min: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (value < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  max: (value: number, max: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (value > max) {
      return `Must be at most ${max}`;
    }
    return null;
  },

  minLength: (value: string, minLength: number): string | null => {
    if (typeof value !== 'string') {
      return 'Must be a valid string';
    }
    if (value.length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    return null;
  },

  maxLength: (value: string, maxLength: number): string | null => {
    if (typeof value !== 'string') {
      return 'Must be a valid string';
    }
    if (value.length > maxLength) {
      return `Must be at most ${maxLength} characters`;
    }
    return null;
  },

  pattern: (value: string, pattern: RegExp): string | null => {
    if (typeof value !== 'string') {
      return 'Must be a valid string';
    }
    if (!pattern.test(value)) {
      return 'Invalid format';
    }
    return null;
  },

  email: (value: string): string | null => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return 'Must be a valid email address';
    }
    return null;
  },

  url: (value: string): string | null => {
    try {
      new URL(value);
      return null;
    } catch {
      return 'Must be a valid URL';
    }
  },

  ethereumAddress: (value: string): string | null => {
    const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressPattern.test(value)) {
      return 'Must be a valid Ethereum address';
    }
    return null;
  },

  percentage: (value: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (value < 0 || value > 100) {
      return 'Must be between 0 and 100';
    }
    return null;
  },

  positiveNumber: (value: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (value <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  nonNegativeNumber: (value: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (value < 0) {
      return 'Must be a non-negative number';
    }
    return null;
  },

  integer: (value: number): string | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Must be a valid number';
    }
    if (!Number.isInteger(value)) {
      return 'Must be an integer';
    }
    return null;
  },

  alphanumeric: (value: string): string | null => {
    const alphanumericPattern = /^[a-zA-Z0-9]+$/;
    if (!alphanumericPattern.test(value)) {
      return 'Must contain only letters and numbers';
    }
    return null;
  },

  noSpecialChars: (value: string): string | null => {
    const noSpecialCharsPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!noSpecialCharsPattern.test(value)) {
      return 'Must not contain special characters';
    }
    return null;
  },
};

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required) {
    const error = validators.required(value);
    if (error) return error;
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (rules.min !== undefined) {
    const error = validators.min(value, rules.min);
    if (error) return error;
  }

  if (rules.max !== undefined) {
    const error = validators.max(value, rules.max);
    if (error) return error;
  }

  if (rules.minLength !== undefined) {
    const error = validators.minLength(value, rules.minLength);
    if (error) return error;
  }

  if (rules.maxLength !== undefined) {
    const error = validators.maxLength(value, rules.maxLength);
    if (error) return error;
  }

  if (rules.pattern) {
    const error = validators.pattern(value, rules.pattern);
    if (error) return error;
  }

  if (rules.custom) {
    const error = rules.custom(value);
    if (error) return error;
  }

  return null;
}

export function validateForm(data: Record<string, any>, schema: ValidationSchema): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export const commonSchemas = {
  walletAddress: {
    walletAddress: {
      required: true,
      custom: validators.ethereumAddress,
    },
  },

  tradeAmount: {
    amount: {
      required: true,
      min: 0.01,
      max: 1000000,
      custom: validators.positiveNumber,
    },
  },

  riskPercentage: {
    percentage: {
      required: true,
      min: 0,
      max: 100,
      custom: validators.percentage,
    },
  },

  positionSize: {
    size: {
      required: true,
      min: 1,
      max: 100000,
      custom: validators.positiveNumber,
    },
  },

  slippageTolerance: {
    slippage: {
      required: true,
      min: 0.1,
      max: 50,
      custom: validators.percentage,
    },
  },

  stopLoss: {
    stopLoss: {
      required: true,
      min: 0,
      max: 100,
      custom: validators.percentage,
    },
  },

  takeProfit: {
    takeProfit: {
      required: true,
      min: 0,
      max: 1000,
      custom: validators.percentage,
    },
  },

  minEdge: {
    minEdge: {
      required: true,
      min: 0.01,
      max: 50,
      custom: validators.percentage,
    },
  },

  maxPositions: {
    maxPositions: {
      required: true,
      min: 1,
      max: 100,
      custom: validators.integer,
    },
  },

  marketId: {
    marketId: {
      required: true,
      minLength: 1,
      maxLength: 100,
      custom: validators.noSpecialChars,
    },
  },

  tokenId: {
    tokenId: {
      required: true,
      minLength: 1,
      maxLength: 100,
    },
  },

  whaleAddress: {
    address: {
      required: true,
      custom: validators.ethereumAddress,
    },
    minPortfolioValue: {
      required: true,
      min: 1000,
      max: 100000000,
      custom: validators.positiveNumber,
    },
  },

  notificationSettings: {
    email: {
      required: false,
      custom: validators.email,
    },
    webhookUrl: {
      required: false,
      custom: validators.url,
    },
  },
};

export function sanitizeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return num;
}

export function sanitizeInteger(value: any, defaultValue: number = 0): number {
  const num = sanitizeNumber(value, defaultValue);
  return Math.floor(num);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sanitizePercentage(value: any, defaultValue: number = 0): number {
  const num = sanitizeNumber(value, defaultValue);
  return clampNumber(num, 0, 100);
}
