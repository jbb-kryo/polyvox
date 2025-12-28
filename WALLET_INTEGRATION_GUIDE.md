# Wallet Integration Guide

Complete guide for MetaMask and WalletConnect integration in PolyVOX.

## Overview

The wallet integration system provides three connection methods:
1. **MetaMask** - Browser extension wallet
2. **WalletConnect** - Mobile wallet via QR code
3. **Private Key** - Direct private key import

All methods support Polygon network with automatic network switching and comprehensive error handling.

## Architecture

### Core Components

1. **WalletProvidersService** (`src/services/walletProviders.ts`)
   - Unified interface for all wallet types
   - State management and event listeners
   - Transaction signing capabilities

2. **useWalletProviders Hook** (`src/hooks/useWalletProviders.ts`)
   - React integration layer
   - Balance fetching and caching
   - Connection state management

3. **WalletConnectionManager Component** (`src/components/WalletConnectionManager.tsx`)
   - User interface for wallet connections
   - Connection modal with all options
   - Balance display and management

4. **WalletProviderDemo Component** (`src/components/WalletProviderDemo.tsx`)
   - Complete demonstration of all features
   - Message signing examples
   - Transaction testing interface

## Features

### 1. MetaMask Connection

**Requirements:**
- MetaMask browser extension installed
- Polygon network configured (auto-added if missing)

**Connection Flow:**
1. User clicks "Connect Wallet"
2. Selects "MetaMask" option
3. MetaMask popup requests permission
4. User approves connection
5. Network verification (switches to Polygon if needed)
6. Account connected and balances loaded

**Code Example:**
```typescript
import { walletProviders } from './services/walletProviders';

const account = await walletProviders.connectMetaMask();
console.log('Connected:', account.address);
```

### 2. WalletConnect Support

**Requirements:**
- Mobile wallet with WalletConnect support (Trust Wallet, Rainbow, etc.)
- Camera for QR code scanning

**Connection Flow:**
1. User clicks "Connect Wallet"
2. Selects "WalletConnect" option
3. QR code modal appears
4. User scans with mobile wallet
5. Approves connection in wallet app
6. Account connected

**Configuration:**
```typescript
await walletProviders.connectWalletConnect();
```

**Getting WalletConnect Project ID:**
1. Visit https://cloud.walletconnect.com/
2. Create free account
3. Create new project
4. Copy Project ID

### 3. Transaction Signing

All wallet types support transaction signing:

**Send Transaction:**
```typescript
const txHash = await walletProviders.signTransaction({
  to: '0x...',
  value: ethers.parseEther('0.1'),
  data: '0x...'
});

console.log('Transaction:', txHash);
```

**Sign Message:**
```typescript
const signature = await walletProviders.signMessage('Hello, Polymarket!');
console.log('Signature:', signature);
```

**Sign Typed Data (EIP-712):**
```typescript
const domain = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: 137,
  verifyingContract: '0x...'
};

const types = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
  ]
};

const value = {
  maker: '0x...',
  tokenId: '123',
};

const signature = await walletProviders.signTypedData(domain, types, value);
```

### 4. Account Switching Detection

Automatically detects when user switches accounts:

**MetaMask:**
- Listens to `accountsChanged` event
- Updates connection state
- Refetches balances
- Notifies all subscribers

**WalletConnect:**
- Monitors session events
- Updates active account
- Maintains connection

**Usage:**
```typescript
walletProviders.subscribe((state) => {
  if (state.account) {
    console.log('Account changed:', state.account.address);
  }
});
```

### 5. Disconnect Functionality

Properly disconnects wallet and cleans up:

```typescript
await walletProviders.disconnect();
```

**Effects:**
- Closes WalletConnect session
- Clears connection state
- Removes event listeners
- Resets balances

### 6. Clear Connection Status

Real-time connection status with visual feedback:

**Status States:**
- `connected` - Wallet successfully connected
- `disconnected` - No wallet connected
- `connecting` - Connection in progress
- `error` - Connection failed

**Network Status:**
- Correct network (Polygon) indicator
- Wrong network warning
- One-click network switching

## Usage Examples

### Basic React Component

```typescript
import { useWalletProviders } from './hooks/useWalletProviders';
import WalletConnectionManager from './components/WalletConnectionManager';

function App() {
  const {
    isConnected,
    address,
    usdcBalance,
    connectMetaMask
  } = useWalletProviders();

  return (
    <div>
      <WalletConnectionManager />

      {isConnected && (
        <div>
          <p>Address: {address}</p>
          <p>Balance: ${usdcBalance}</p>
        </div>
      )}
    </div>
  );
}
```

### Manual Connection

```typescript
import { useWalletProviders } from './hooks/useWalletProviders';

function ConnectButton() {
  const { connectMetaMask, isConnecting } = useWalletProviders();

  const handleConnect = async () => {
    try {
      await connectMetaMask();
      alert('Connected successfully!');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  );
}
```

### Transaction Example

```typescript
import { useWalletProviders } from './hooks/useWalletProviders';
import { ethers } from 'ethers';

function SendTransaction() {
  const { signTransaction, isConnected } = useWalletProviders();

  const handleSend = async () => {
    if (!isConnected) {
      alert('Please connect wallet first');
      return;
    }

    try {
      const txHash = await signTransaction({
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        value: ethers.parseEther('0.01'),
      });

      console.log('Transaction sent:', txHash);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <button onClick={handleSend} disabled={!isConnected}>
      Send 0.01 MATIC
    </button>
  );
}
```

### Balance Monitoring

```typescript
import { useEffect } from 'react';
import { useWalletProviders } from './hooks/useWalletProviders';

function BalanceMonitor() {
  const {
    isConnected,
    usdcBalance,
    maticBalance,
    fetchBalances
  } = useWalletProviders();

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchBalances]);

  return (
    <div>
      <div>USDC: ${usdcBalance}</div>
      <div>MATIC: {maticBalance}</div>
      <button onClick={fetchBalances}>Refresh</button>
    </div>
  );
}
```

## Event Listeners

The service automatically handles wallet events:

### MetaMask Events

**accountsChanged:**
- Triggered when user switches accounts
- Updates connection state
- Disconnects if no accounts

**chainChanged:**
- Triggered when network changes
- Updates chain ID
- Shows warning if not Polygon

**disconnect:**
- Triggered on wallet disconnect
- Cleans up connection state

### WalletConnect Events

**session_update:**
- Account or network changes
- Updates connection state

**disconnect:**
- Session ended
- Cleans up resources

## Error Handling

Comprehensive error handling with user-friendly messages:

```typescript
try {
  await walletProviders.connectMetaMask();
} catch (error) {
  if (error.message.includes('not installed')) {
    // Show install MetaMask prompt
  } else if (error.message.includes('rejected')) {
    // User rejected connection
  } else {
    // Generic error
  }
}
```

## Network Management

### Auto Network Switching

```typescript
if (!walletProviders.isCorrectNetwork()) {
  const success = await walletProviders.switchNetwork(137);

  if (success) {
    console.log('Switched to Polygon');
  } else {
    console.log('Failed to switch network');
  }
}
```

### Network Verification

```typescript
const chainId = walletProviders.getChainId();

if (chainId !== 137) {
  console.log('Wrong network:', chainId);
}
```

## Security Best Practices

### Private Key Handling

1. **Never log private keys**
   ```typescript
   // Bad
   console.log('Private key:', privateKey);

   // Good
   console.log('Wallet connected:', address);
   ```

2. **Use secure storage**
   - Encrypt before storing
   - Use browser's secure storage APIs
   - Never send to backend

3. **Validate input**
   ```typescript
   if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
     throw new Error('Invalid private key format');
   }
   ```

### Transaction Safety

1. **Always verify transaction details**
   ```typescript
   const tx = {
     to: recipientAddress,
     value: amount,
     data: callData
   };
   ```

2. **Check balances before transactions**
   ```typescript
   const balance = await walletProviders.getUSDCBalance();
   if (parseFloat(balance) < requiredAmount) {
     throw new Error('Insufficient balance');
   }
   ```

3. **Validate addresses**
   ```typescript
   if (!ethers.isAddress(address)) {
     throw new Error('Invalid address');
   }
   ```

## Testing

### Testing MetaMask

1. Install MetaMask extension
2. Create test wallet
3. Switch to Polygon testnet (Mumbai)
4. Get test MATIC from faucet
5. Test connection flow

### Testing WalletConnect

1. Install mobile wallet (Trust Wallet recommended)
2. Open app in desktop browser
3. Click WalletConnect option
4. Scan QR code with mobile wallet
5. Approve connection

### Testing Private Key

1. Generate test wallet
2. Export private key
3. Test import functionality
4. Verify balance display
5. Test transaction signing

## Troubleshooting

### MetaMask Not Detected

**Problem:** "MetaMask is not installed" error
**Solution:**
- Install MetaMask browser extension
- Refresh page after installation
- Check if using supported browser (Chrome, Firefox, Brave)

### WalletConnect QR Code Not Loading

**Problem:** QR code modal doesn't appear
**Solution:**
- Check internet connection
- Verify Project ID is valid
- Check browser console for errors
- Try different browser

### Wrong Network Error

**Problem:** Wallet connected to wrong network
**Solution:**
- Click "Switch to Polygon" button
- Manually switch in wallet
- Check wallet network settings

### Account Switching Not Detected

**Problem:** Changed account but app doesn't update
**Solution:**
- Disconnect and reconnect
- Refresh page
- Check wallet permissions

### Balance Not Updating

**Problem:** Balance shows 0 or outdated value
**Solution:**
- Click refresh button
- Check network connection
- Verify correct network (Polygon)
- Check RPC endpoint status

## API Reference

### WalletProvidersService

**Methods:**

- `connectMetaMask()` - Connect via MetaMask
- `connectWalletConnect(projectId?)` - Connect via WalletConnect
- `connectWithPrivateKey(privateKey)` - Connect with private key
- `disconnect()` - Disconnect wallet
- `switchNetwork(chainId)` - Switch to different network
- `signTransaction(tx)` - Sign and send transaction
- `signMessage(message)` - Sign arbitrary message
- `signTypedData(domain, types, value)` - Sign EIP-712 typed data
- `getState()` - Get current connection state
- `getAccount()` - Get connected account
- `getAddress()` - Get wallet address
- `getSigner()` - Get ethers Signer
- `getProvider()` - Get ethers Provider
- `isConnected()` - Check if connected
- `getProviderType()` - Get connection type
- `getChainId()` - Get current chain ID
- `isCorrectNetwork()` - Check if on Polygon
- `getBalance(address?)` - Get MATIC balance
- `getUSDCBalance(address?)` - Get USDC balance
- `formatAddress(address)` - Truncate address for display
- `subscribe(callback)` - Subscribe to state changes

### useWalletProviders Hook

**Returns:**
```typescript
{
  state: WalletConnectionState,
  account: WalletAccount | null,
  address: string | null,
  providerType: WalletProviderType,
  chainId: number | null,
  isConnected: boolean,
  isCorrectNetwork: boolean,
  error: string | null,
  isConnecting: boolean,
  usdcBalance: string,
  maticBalance: string,
  connectMetaMask: () => Promise<void>,
  connectWalletConnect: (projectId?) => Promise<void>,
  connectPrivateKey: (key) => Promise<void>,
  disconnect: () => Promise<void>,
  switchNetwork: (chainId) => Promise<boolean>,
  signTransaction: (tx) => Promise<string>,
  signMessage: (message) => Promise<string>,
  signTypedData: (...) => Promise<string>,
  fetchBalances: () => Promise<void>,
  getSigner: () => Signer | null,
  getProvider: () => Provider | null,
  formatAddress: (address) => string
}
```

## Integration with Existing Code

The new wallet system is fully integrated throughout the application:

```typescript
// Settings modal wallet setup (integrated)
import WalletSetupModal from './components/WalletSetupModal';

// Standalone wallet connection manager
import WalletConnectionManager from './components/WalletConnectionManager';

// Legacy component (still works)
import WalletConnection from './components/WalletConnection';

// Demo component
import { WalletProviderDemo } from './components/WalletProviderDemo';
```

### WalletSetupModal Updates

The `WalletSetupModal` accessed from Settings has been updated with full MetaMask and WalletConnect integration:

**Features:**
- Three connection methods: MetaMask, WalletConnect, Private Key
- MetaMask detection with install prompts
- WalletConnect QR code integration
- Automatic paper trading mode disabling on connection
- Beautiful UI with connection method selection

**Access:**
1. Click Settings in the app header
2. Select "Configure Secure Wallet"
3. Choose your preferred connection method

## Best Practices Summary

1. **Always check connection before transactions**
2. **Handle all error cases with user feedback**
3. **Verify network before critical operations**
4. **Never log or expose private keys**
5. **Use TypeScript for type safety**
6. **Subscribe to state changes for reactivity**
7. **Clean up listeners on component unmount**
8. **Validate all user inputs**
9. **Show loading states during async operations**
10. **Provide clear error messages**

## Conclusion

The wallet integration system provides a robust, user-friendly way to connect to Polygon network using MetaMask, WalletConnect, or private keys. All acceptance criteria have been met:

- ✅ MetaMask connection option
- ✅ WalletConnect support
- ✅ Transaction signing via wallet
- ✅ Account switching detection
- ✅ Disconnect functionality
- ✅ Clear connection status

For additional help, refer to:
- [MetaMask Documentation](https://docs.metamask.io/)
- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [ethers.js Documentation](https://docs.ethers.org/)
