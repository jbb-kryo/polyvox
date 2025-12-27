import { ethers } from 'ethers';
import { updateTransactionVolume } from './platformMetrics';
import { web3Provider } from './web3Provider';

export interface OrderParams {
  maker: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: number;
  expiration: number;
  nonce: number;
  feeRateBps: number;
  signatureType: number;
}

export interface SignedOrder extends OrderParams {
  signature: string;
}

export interface OrderResponse {
  orderId: string;
  status: 'open' | 'filled' | 'partially_filled' | 'cancelled';
  filledAmount?: string;
  remainingAmount?: string;
}

const POLYMARKET_EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_EXCHANGE_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

const CLOB_API_BASE = 'https://clob.polymarket.com';

const domain = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: 137,
  verifyingContract: CTF_EXCHANGE_ADDRESS
};

const types = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'signatureType', type: 'uint8' }
  ]
};

export async function checkUSDCBalance(
  walletAddress: string,
  privateKey?: string
): Promise<{ balance: number; sufficient: boolean; required: number }> {
  try {
    const provider = web3Provider.getProvider();
    if (!provider) {
      throw new Error('No provider available. Please connect to Polygon network.');
    }

    let signer;
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      signer = web3Provider.getSigner();
      if (!signer) {
        throw new Error('No signer available. Please connect wallet.');
      }
    }

    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];

    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
    const [balanceRaw, decimals] = await Promise.all([
      usdcContract.balanceOf(walletAddress),
      usdcContract.decimals()
    ]);

    const balance = parseFloat(ethers.formatUnits(balanceRaw, decimals));

    return {
      balance,
      sufficient: balance > 0,
      required: 0
    };
  } catch (error) {
    console.error('Error checking USDC balance:', error);
    throw new Error('Failed to check wallet balance');
  }
}

export async function signOrder(
  orderParams: OrderParams,
  privateKey: string
): Promise<SignedOrder> {
  try {
    const wallet = new ethers.Wallet(privateKey);

    const signature = await wallet.signTypedData(domain, types, orderParams);

    return {
      ...orderParams,
      signature
    };
  } catch (error) {
    console.error('Error signing order:', error);
    throw new Error('Failed to sign order');
  }
}

export async function submitOrder(
  signedOrder: SignedOrder,
  useCorsProxy: boolean = false
): Promise<OrderResponse> {
  try {
    const baseUrl = useCorsProxy
      ? `https://corsproxy.io/?${encodeURIComponent(`${CLOB_API_BASE}/order`)}`
      : `${CLOB_API_BASE}/order`;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signedOrder)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Order submission failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const orderResponse = {
      orderId: data.orderID || data.orderId,
      status: data.status || 'open',
      filledAmount: data.filledAmount,
      remainingAmount: data.remainingAmount
    };

    if (orderResponse.status === 'filled' || orderResponse.status === 'partially_filled') {
      try {
        const transactionValue = parseFloat(ethers.formatUnits(signedOrder.takerAmount, 6));
        await updateTransactionVolume(transactionValue);
      } catch (metricsError) {
        console.error('Error updating transaction metrics:', metricsError);
      }
    }

    return orderResponse;
  } catch (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
}

export async function getOrderStatus(
  orderId: string,
  useCorsProxy: boolean = false,
  previousStatus?: string,
  orderValue?: number
): Promise<OrderResponse> {
  try {
    const baseUrl = useCorsProxy
      ? `https://corsproxy.io/?${encodeURIComponent(`${CLOB_API_BASE}/order/${orderId}`)}`
      : `${CLOB_API_BASE}/order/${orderId}`;

    const response = await fetch(baseUrl);

    if (!response.ok) {
      throw new Error(`Failed to get order status: ${response.status}`);
    }

    const data = await response.json();

    const orderResponse = {
      orderId: data.orderID || data.orderId,
      status: data.status,
      filledAmount: data.filledAmount,
      remainingAmount: data.remainingAmount
    };

    if (previousStatus && previousStatus !== 'filled' &&
        (orderResponse.status === 'filled' || orderResponse.status === 'partially_filled') &&
        orderValue) {
      try {
        await updateTransactionVolume(orderValue);
      } catch (metricsError) {
        console.error('Error updating transaction metrics:', metricsError);
      }
    }

    return orderResponse;
  } catch (error) {
    console.error('Error getting order status:', error);
    throw error;
  }
}

export async function cancelOrder(
  orderId: string,
  privateKey: string,
  useCorsProxy: boolean = false
): Promise<boolean> {
  try {
    const baseUrl = useCorsProxy
      ? `https://corsproxy.io/?${encodeURIComponent(`${CLOB_API_BASE}/order/${orderId}`)}`
      : `${CLOB_API_BASE}/order/${orderId}`;

    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Date.now();
    const message = `Cancel order ${orderId} at ${timestamp}`;
    const signature = await wallet.signMessage(message);

    const response = await fetch(baseUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signature}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error canceling order:', error);
    return false;
  }
}

export function createOrderParams(
  walletAddress: string,
  tokenId: string,
  amount: number,
  price: number,
  side: 'buy' | 'sell'
): OrderParams {
  const decimals = 6;
  const makerAmount = ethers.parseUnits(amount.toString(), decimals).toString();
  const takerAmount = ethers.parseUnits((amount * price).toString(), decimals).toString();

  const expirationTime = Math.floor(Date.now() / 1000) + 86400;
  const nonce = Date.now();

  return {
    maker: walletAddress,
    taker: ethers.ZeroAddress,
    tokenId,
    makerAmount: side === 'buy' ? takerAmount : makerAmount,
    takerAmount: side === 'buy' ? makerAmount : takerAmount,
    side: side === 'buy' ? 0 : 1,
    expiration: expirationTime,
    nonce,
    feeRateBps: 0,
    signatureType: 0
  };
}

export async function estimateGasCost(): Promise<number> {
  try {
    const gasEstimate = await web3Provider.getGasEstimate();
    return gasEstimate.estimatedCostUSD;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return 0.01;
  }
}

export function calculateOrderCosts(
  positionSize: number,
  spread: number
): { fees: number; slippage: number; estimatedProfit: number } {
  const polymarketFee = 0;
  const slippageEstimate = positionSize * 0.001;

  const grossProfit = positionSize * (spread / 100);
  const estimatedProfit = grossProfit - polymarketFee - slippageEstimate;

  return {
    fees: polymarketFee,
    slippage: slippageEstimate,
    estimatedProfit
  };
}

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall: number;
  message: string;
}

export async function validateBalanceForTrade(
  walletAddress: string,
  orderAmount: number,
  gasCostEstimate: number = 0.01,
  bufferPercent: number = 2
): Promise<BalanceValidationResult> {
  try {
    const { balance } = await checkUSDCBalance(walletAddress);

    const buffer = (orderAmount * bufferPercent) / 100;
    const requiredAmount = orderAmount + gasCostEstimate + buffer;
    const shortfall = Math.max(0, requiredAmount - balance);
    const isValid = balance >= requiredAmount;

    let message = '';
    if (!isValid) {
      if (balance === 0) {
        message = 'No USDC balance. Please deposit USDC to your wallet.';
      } else if (shortfall < 1) {
        message = `Insufficient balance. Need ${shortfall.toFixed(2)} more USDC (including gas and buffer).`;
      } else {
        message = `Insufficient balance. Need ${shortfall.toFixed(2)} more USDC. Current: ${balance.toFixed(2)} USDC`;
      }
    } else {
      message = 'Balance sufficient for trade';
    }

    return {
      isValid,
      currentBalance: balance,
      requiredAmount,
      shortfall,
      message
    };
  } catch (error) {
    console.error('Balance validation error:', error);
    throw new Error('Failed to validate balance. Please try again.');
  }
}

export async function validateAndSubmitOrder(
  signedOrder: SignedOrder,
  walletAddress: string,
  orderValue: number,
  useCorsProxy: boolean = false
): Promise<OrderResponse> {
  const gasCost = await estimateGasCost();
  const validation = await validateBalanceForTrade(walletAddress, orderValue, gasCost);

  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  return submitOrder(signedOrder, useCorsProxy);
}

export function getDepositInstructions(chainId: number = 137): {
  title: string;
  steps: string[];
  usdcAddress: string;
  chainName: string;
  bridgeUrl: string;
} {
  return {
    title: 'How to Deposit USDC',
    steps: [
      'Ensure you are connected to Polygon network',
      'Bridge USDC from Ethereum to Polygon using a bridge service',
      'Or buy USDC directly on Polygon via an exchange',
      'Send USDC to your wallet address',
      'Wait for confirmations (usually 1-2 minutes)',
      'Your balance will update automatically'
    ],
    usdcAddress: USDC_ADDRESS,
    chainName: 'Polygon (MATIC)',
    bridgeUrl: 'https://wallet.polygon.technology/polygon/bridge/deposit'
  };
}

export function calculateMinimumBalance(
  averageTradeSize: number,
  numberOfTrades: number = 3
): number {
  const gasCostPerTrade = 0.02;
  const buffer = 5;

  return (averageTradeSize * numberOfTrades) + (gasCostPerTrade * numberOfTrades) + buffer;
}
