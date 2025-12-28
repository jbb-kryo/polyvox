import { ethers } from 'ethers';
import { web3Provider } from './web3Provider';

export type WalletProviderType = 'metamask' | 'walletconnect' | 'privatekey' | null;

export interface WalletAccount {
  address: string;
  provider: ethers.Provider;
  signer: ethers.Signer;
  type: WalletProviderType;
}

export interface WalletConnectionState {
  isConnected: boolean;
  account: WalletAccount | null;
  providerType: WalletProviderType;
  chainId: number | null;
  error: string | null;
}

class WalletProvidersService {
  private state: WalletConnectionState = {
    isConnected: false,
    account: null,
    providerType: null,
    chainId: null,
    error: null
  };

  private listeners = new Set<(state: WalletConnectionState) => void>();
  private walletConnectProvider: any = null;

  async connectMetaMask(): Promise<WalletAccount> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      await web3Provider.connectWithInjectedWallet();

      const provider = web3Provider.getProvider();
      const signer = web3Provider.getSigner();

      if (!provider || !signer) {
        throw new Error('Failed to initialize MetaMask provider');
      }

      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      const account: WalletAccount = {
        address,
        provider,
        signer,
        type: 'metamask'
      };

      this.state = {
        isConnected: true,
        account,
        providerType: 'metamask',
        chainId: Number(network.chainId),
        error: null
      };

      this.setupMetaMaskListeners();
      this.notifyListeners();

      return account;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect MetaMask';
      this.state = {
        isConnected: false,
        account: null,
        providerType: null,
        chainId: null,
        error: errorMsg
      };
      this.notifyListeners();
      throw new Error(errorMsg);
    }
  }

  async connectWalletConnect(projectId?: string): Promise<WalletAccount> {
    try {
      const EthereumProvider = (await import('@walletconnect/ethereum-provider')).default;

      const defaultProjectId = 'e542ff314e26ff34de2d4fba98db70bb';
      const wcProjectId = projectId || defaultProjectId;

      this.walletConnectProvider = await EthereumProvider.init({
        projectId: wcProjectId,
        chains: [137],
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '9999'
          }
        },
        metadata: {
          name: 'PolyVOX',
          description: 'Automated trading platform for Polymarket',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.svg`]
        }
      });

      await this.walletConnectProvider.enable();

      const provider = new ethers.BrowserProvider(this.walletConnectProvider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      const account: WalletAccount = {
        address,
        provider,
        signer,
        type: 'walletconnect'
      };

      this.state = {
        isConnected: true,
        account,
        providerType: 'walletconnect',
        chainId: Number(network.chainId),
        error: null
      };

      this.setupWalletConnectListeners();
      this.notifyListeners();

      return account;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect WalletConnect';
      this.state = {
        isConnected: false,
        account: null,
        providerType: null,
        chainId: null,
        error: errorMsg
      };
      this.notifyListeners();
      throw new Error(errorMsg);
    }
  }

  async connectWithPrivateKey(privateKey: string): Promise<WalletAccount> {
    try {
      if (!privateKey || !privateKey.startsWith('0x')) {
        throw new Error('Invalid private key format');
      }

      await web3Provider.connectWithRPC();
      const provider = web3Provider.getProvider();

      if (!provider) {
        throw new Error('Failed to initialize RPC provider');
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const address = await wallet.getAddress();
      const network = await provider.getNetwork();

      const account: WalletAccount = {
        address,
        provider,
        signer: wallet,
        type: 'privatekey'
      };

      this.state = {
        isConnected: true,
        account,
        providerType: 'privatekey',
        chainId: Number(network.chainId),
        error: null
      };

      this.notifyListeners();

      return account;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect with private key';
      this.state = {
        isConnected: false,
        account: null,
        providerType: null,
        chainId: null,
        error: errorMsg
      };
      this.notifyListeners();
      throw new Error(errorMsg);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.state.providerType === 'walletconnect' && this.walletConnectProvider) {
        await this.walletConnectProvider.disconnect();
        this.walletConnectProvider = null;
      }

      if (this.state.providerType === 'metamask') {
        web3Provider.disconnect();
      }

      this.state = {
        isConnected: false,
        account: null,
        providerType: null,
        chainId: null,
        error: null
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      this.state = {
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to disconnect'
      };
      this.notifyListeners();
    }
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!this.state.isConnected || !this.state.account) {
        throw new Error('No wallet connected');
      }

      if (this.state.providerType === 'metamask') {
        return await web3Provider.switchToPolygon();
      }

      if (this.state.providerType === 'walletconnect' && this.walletConnectProvider) {
        await this.walletConnectProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error switching network:', error);
      this.state = {
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to switch network'
      };
      this.notifyListeners();
      return false;
    }
  }

  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    if (!this.state.isConnected || !this.state.account) {
      throw new Error('No wallet connected');
    }

    try {
      const tx = await this.state.account.signer.sendTransaction(transaction);
      return tx.hash;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign transaction');
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.state.isConnected || !this.state.account) {
      throw new Error('No wallet connected');
    }

    try {
      return await this.state.account.signer.signMessage(message);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign message');
    }
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    if (!this.state.isConnected || !this.state.account) {
      throw new Error('No wallet connected');
    }

    try {
      const signer = this.state.account.signer;
      return await signer.signTypedData(domain, types, value);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign typed data');
    }
  }

  private setupMetaMaskListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        await this.disconnect();
      } else {
        try {
          const provider = web3Provider.getProvider();
          const signer = web3Provider.getSigner();

          if (provider && signer) {
            const address = await signer.getAddress();
            const network = await provider.getNetwork();

            this.state = {
              ...this.state,
              account: {
                address,
                provider,
                signer,
                type: 'metamask'
              },
              chainId: Number(network.chainId)
            };
            this.notifyListeners();
          }
        } catch (error) {
          console.error('Error handling account change:', error);
          await this.disconnect();
        }
      }
    });

    window.ethereum.on('chainChanged', async (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      this.state = {
        ...this.state,
        chainId
      };
      this.notifyListeners();

      if (chainId !== 137) {
        this.state = {
          ...this.state,
          error: 'Please switch to Polygon network'
        };
        this.notifyListeners();
      }
    });

    window.ethereum.on('disconnect', async () => {
      await this.disconnect();
    });
  }

  private setupWalletConnectListeners(): void {
    if (!this.walletConnectProvider) return;

    this.walletConnectProvider.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        await this.disconnect();
      } else {
        try {
          const provider = new ethers.BrowserProvider(this.walletConnectProvider);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();

          this.state = {
            ...this.state,
            account: {
              address,
              provider,
              signer,
              type: 'walletconnect'
            },
            chainId: Number(network.chainId)
          };
          this.notifyListeners();
        } catch (error) {
          console.error('Error handling account change:', error);
          await this.disconnect();
        }
      }
    });

    this.walletConnectProvider.on('chainChanged', (chainId: number) => {
      this.state = {
        ...this.state,
        chainId
      };
      this.notifyListeners();

      if (chainId !== 137) {
        this.state = {
          ...this.state,
          error: 'Please switch to Polygon network'
        };
        this.notifyListeners();
      }
    });

    this.walletConnectProvider.on('disconnect', async () => {
      await this.disconnect();
    });
  }

  getState(): WalletConnectionState {
    return { ...this.state };
  }

  getAccount(): WalletAccount | null {
    return this.state.account;
  }

  getAddress(): string | null {
    return this.state.account?.address || null;
  }

  getSigner(): ethers.Signer | null {
    return this.state.account?.signer || null;
  }

  getProvider(): ethers.Provider | null {
    return this.state.account?.provider || null;
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getProviderType(): WalletProviderType {
    return this.state.providerType;
  }

  getChainId(): number | null {
    return this.state.chainId;
  }

  isCorrectNetwork(): boolean {
    return this.state.chainId === 137;
  }

  subscribe(callback: (state: WalletConnectionState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.state));
  }

  async getBalance(address?: string): Promise<bigint> {
    const targetAddress = address || this.state.account?.address;
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    const provider = this.state.account?.provider || web3Provider.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    return await provider.getBalance(targetAddress);
  }

  async getUSDCBalance(address?: string): Promise<string> {
    const targetAddress = address || this.state.account?.address;
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    const provider = this.state.account?.provider || web3Provider.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    try {
      const usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
      const usdcAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
      const [balanceRaw, decimals] = await Promise.all([
        usdcContract.balanceOf(targetAddress),
        usdcContract.decimals()
      ]);

      return ethers.formatUnits(balanceRaw, decimals);
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      throw new Error('Failed to fetch USDC balance');
    }
  }

  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  cleanup(): void {
    this.listeners.clear();
    if (this.walletConnectProvider) {
      this.walletConnectProvider.disconnect();
      this.walletConnectProvider = null;
    }
  }
}

export const walletProviders = new WalletProvidersService();
