import { ethers } from 'ethers';

export const POLYGON_CHAIN_ID = 137;
export const POLYGON_CHAIN_ID_HEX = '0x89';

export const POLYGON_NETWORK_CONFIG = {
  chainId: POLYGON_CHAIN_ID_HEX,
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com']
};

const RPC_ENDPOINTS = [
  'https://polygon-rpc.com',
  'https://rpc-mainnet.matic.network',
  'https://polygon-mainnet.public.blastapi.io',
  'https://rpc-mainnet.maticvigil.com',
  'https://polygon-bor.publicnode.com',
  'https://polygon.llamarpc.com',
  'https://1rpc.io/matic'
];

let currentRpcIndex = 0;
const failedRpcEndpoints = new Set<number>();

export type ConnectionType = 'rpc' | 'injected';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'wrong_network';

interface Web3Connection {
  provider: ethers.Provider;
  signer?: ethers.Signer;
  type: ConnectionType;
  chainId: number;
  status: ConnectionStatus;
  error?: string;
}

interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  confirmations: number;
  status: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
}

interface GasEstimate {
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCostUSD: number;
}

class Web3ProviderService {
  private connection: Web3Connection | null = null;
  private listeners = new Set<(connection: Web3Connection | null) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;

  async connectWithRPC(): Promise<Web3Connection> {
    this.updateStatus('connecting');

    const maxAttempts = RPC_ENDPOINTS.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (failedRpcEndpoints.has(currentRpcIndex)) {
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        attempts++;
        continue;
      }

      try {
        const provider = await this.createRpcProvider();
        const network = await provider.getNetwork();

        if (Number(network.chainId) !== POLYGON_CHAIN_ID) {
          throw new Error(`RPC endpoint returned wrong network: ${network.chainId}`);
        }

        await provider.getBlockNumber();

        failedRpcEndpoints.delete(currentRpcIndex);

        this.connection = {
          provider,
          type: 'rpc',
          chainId: Number(network.chainId),
          status: 'connected'
        };

        this.reconnectAttempts = 0;
        this.notifyListeners();
        return this.connection;

      } catch (error) {
        console.error(`RPC connection failed for ${RPC_ENDPOINTS[currentRpcIndex]}:`, error);
        failedRpcEndpoints.add(currentRpcIndex);

        attempts++;
        if (attempts < maxAttempts) {
          currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
          console.log(`Trying next RPC endpoint: ${RPC_ENDPOINTS[currentRpcIndex]}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    const errorMsg = 'All RPC endpoints failed. Please check your internet connection.';
    this.connection = {
      provider: new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]),
      type: 'rpc',
      chainId: 0,
      status: 'error',
      error: errorMsg
    };

    this.notifyListeners();
    throw new Error(errorMsg);
  }

  async connectWithInjectedWallet(): Promise<Web3Connection> {
    if (!window.ethereum) {
      const error = 'No Web3 wallet detected. Please install MetaMask.';
      this.connection = {
        provider: new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]),
        type: 'rpc',
        chainId: 0,
        status: 'error',
        error
      };
      this.notifyListeners();
      throw new Error(error);
    }

    this.updateStatus('connecting');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== POLYGON_CHAIN_ID) {
        this.connection = {
          provider,
          type: 'injected',
          chainId,
          status: 'wrong_network',
          error: 'Wrong network. Please switch to Polygon.'
        };
        this.notifyListeners();

        const switched = await this.switchToPolygon();
        if (!switched) {
          throw new Error('Failed to switch to Polygon network');
        }

        return this.connectWithInjectedWallet();
      }

      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      this.connection = {
        provider,
        signer,
        type: 'injected',
        chainId,
        status: 'connected'
      };

      this.setupInjectedWalletListeners();
      this.notifyListeners();
      return this.connection;

    } catch (error) {
      console.error('Injected wallet connection failed:', error);

      this.connection = {
        provider: new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]),
        type: 'rpc',
        chainId: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed'
      };

      this.notifyListeners();
      throw error;
    }
  }

  async switchToPolygon(): Promise<boolean> {
    if (!window.ethereum) {
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID_HEX }]
      });

      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_NETWORK_CONFIG]
          });

          return true;
        } catch (addError) {
          console.error('Failed to add Polygon network:', addError);
          return false;
        }
      }

      console.error('Failed to switch network:', switchError);
      return false;
    }
  }

  private async createRpcProvider(): Promise<ethers.JsonRpcProvider> {
    const rpcUrl = RPC_ENDPOINTS[currentRpcIndex];
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: ethers.Network.from(POLYGON_CHAIN_ID),
      batchMaxCount: 1
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RPC connection timeout')), 10000)
    );

    await Promise.race([
      provider.getBlockNumber(),
      timeout
    ]);

    return provider;
  }

  private setupInjectedWalletListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('chainChanged', (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);

      if (this.connection) {
        if (chainId !== POLYGON_CHAIN_ID) {
          this.connection.status = 'wrong_network';
          this.connection.chainId = chainId;
          this.connection.error = 'Wrong network. Please switch to Polygon.';
        } else {
          this.connection.status = 'connected';
          this.connection.chainId = chainId;
          this.connection.error = undefined;
        }

        this.notifyListeners();
      }

      window.location.reload();
    });

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        window.location.reload();
      }
    });

    window.ethereum.on('disconnect', () => {
      this.disconnect();
    });
  }

  getConnection(): Web3Connection | null {
    return this.connection;
  }

  getProvider(): ethers.Provider | null {
    return this.connection?.provider || null;
  }

  getSigner(): ethers.Signer | null {
    return this.connection?.signer || null;
  }

  isConnected(): boolean {
    return this.connection?.status === 'connected';
  }

  isWrongNetwork(): boolean {
    return this.connection?.status === 'wrong_network';
  }

  getConnectionType(): ConnectionType | null {
    return this.connection?.type || null;
  }

  async getGasEstimate(): Promise<GasEstimate> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    try {
      const feeData = await provider.getFeeData();
      const gasLimit = BigInt(150000);

      const gasPrice = feeData.gasPrice || BigInt(0);
      const maxFeePerGas = feeData.maxFeePerGas || gasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(0);

      const estimatedGasCost = maxFeePerGas * gasLimit;
      const maticPrice = 0.8;
      const gasCostInMatic = parseFloat(ethers.formatEther(estimatedGasCost));
      const estimatedCostUSD = gasCostInMatic * maticPrice;

      return {
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCostUSD
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);

      return {
        gasPrice: BigInt(30000000000),
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(30000000000),
        estimatedCostUSD: 0.01
      };
    }
  }

  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 120000
  ): Promise<TransactionReceipt> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);

        if (receipt) {
          const currentBlock = await provider.getBlockNumber();
          const confirmsCount = currentBlock - receipt.blockNumber + 1;

          if (confirmsCount >= confirmations) {
            return {
              hash: receipt.hash,
              blockNumber: receipt.blockNumber,
              confirmations: confirmsCount,
              status: receipt.status || 0,
              gasUsed: receipt.gasUsed,
              effectiveGasPrice: receipt.gasPrice
            };
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error checking transaction:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Transaction confirmation timeout');
  }

  async verifyNetwork(): Promise<boolean> {
    const provider = this.getProvider();
    if (!provider) {
      return false;
    }

    try {
      const network = await provider.getNetwork();
      return Number(network.chainId) === POLYGON_CHAIN_ID;
    } catch (error) {
      console.error('Network verification failed:', error);
      return false;
    }
  }

  async reconnect(): Promise<void> {
    if (!this.connection || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      if (this.connection.type === 'injected') {
        await this.connectWithInjectedWallet();
      } else {
        await this.connectWithRPC();
      }
    } catch (error) {
      console.error('Reconnection failed:', error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.reconnect();
      }
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection = {
        ...this.connection,
        status: 'disconnected',
        signer: undefined
      };
      this.notifyListeners();
    }
  }

  subscribe(callback: (connection: Web3Connection | null) => void): () => void {
    this.listeners.add(callback);

    if (this.connection) {
      callback(this.connection);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  private updateStatus(status: ConnectionStatus): void {
    if (this.connection) {
      this.connection.status = status;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.connection));
  }

  async getCurrentBlock(): Promise<number> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    return provider.getBlockNumber();
  }

  async getBalance(address: string): Promise<bigint> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    return provider.getBalance(address);
  }

  formatMatic(amount: bigint): string {
    return ethers.formatEther(amount);
  }

  parseMatic(amount: string): bigint {
    return ethers.parseEther(amount);
  }

  cleanup(): void {
    this.listeners.clear();
    this.connection = null;
  }

  async healthCheck(): Promise<{
    isHealthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }> {
    const provider = this.getProvider();
    if (!provider) {
      return { isHealthy: false, error: 'No provider available' };
    }

    try {
      const startTime = Date.now();
      const blockNumber = await provider.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        isHealthy: true,
        latency,
        blockNumber
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      const isValid = await this.verifyNetwork();
      if (!isValid) {
        if (this.connection?.type === 'injected' && window.ethereum) {
          await this.connectWithInjectedWallet();
        } else {
          await this.connectWithRPC();
        }
      }
    }
  }

  getRpcEndpoint(): string {
    return RPC_ENDPOINTS[currentRpcIndex];
  }

  getAvailableRpcEndpoints(): string[] {
    return RPC_ENDPOINTS.filter((_, index) => !failedRpcEndpoints.has(index));
  }

  resetRpcFailures(): void {
    failedRpcEndpoints.clear();
    currentRpcIndex = 0;
  }
}

export const web3Provider = new Web3ProviderService();

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type { Web3Connection, TransactionReceipt, GasEstimate };
