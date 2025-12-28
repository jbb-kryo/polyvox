# Polygon Network Connection Guide

This guide explains the comprehensive Polygon network connection implementation using ethers.js.

## Overview

The implementation provides a robust Web3 connection layer with:
- Dual connection modes (RPC + MetaMask)
- Automatic network switching
- Multiple RPC fallback endpoints
- Connection health monitoring
- Gas price estimation
- Transaction confirmation tracking

## Architecture

### Core Components

1. **Web3ProviderService** (`src/services/web3Provider.ts`)
   - Singleton service managing all Web3 connections
   - Handles RPC and injected wallet connections
   - Automatic failover between 7 RPC endpoints
   - Network verification and auto-switching

2. **useWeb3Connection Hook** (`src/hooks/useWeb3Connection.ts`)
   - React hook for easy integration
   - State management for connection status
   - Error handling and reconnection logic

3. **Web3ConnectionStatus Component** (`src/components/Web3ConnectionStatus.tsx`)
   - Visual connection status indicator
   - Network switching interface
   - Gas price display
   - Connection details view

4. **Web3ConnectionDemo Component** (`src/components/Web3ConnectionDemo.tsx`)
   - Comprehensive testing interface
   - Health check monitoring
   - Gas estimation display
   - RPC endpoint management

## Features

### 1. Polygon Mainnet Connection

**Chain ID:** 137 (0x89)
**Network:** Polygon Mainnet

The service automatically connects to Polygon and verifies the correct network.

```typescript
import { web3Provider } from './services/web3Provider';

// Connect via RPC
await web3Provider.connectWithRPC();

// Connect via MetaMask
await web3Provider.connectWithInjectedWallet();
```

### 2. RPC Fallback Endpoints

Seven production-grade RPC endpoints with automatic failover:

1. `https://polygon-rpc.com`
2. `https://rpc-mainnet.matic.network`
3. `https://polygon-mainnet.public.blastapi.io`
4. `https://rpc-mainnet.maticvigil.com`
5. `https://polygon-bor.publicnode.com`
6. `https://polygon.llamarpc.com`
7. `https://1rpc.io/matic`

**Features:**
- Automatic rotation on failure
- Failed endpoint tracking
- Connection timeout (10 seconds)
- Health verification before use

### 3. Network Auto-Switching

Automatically detects wrong network and prompts user to switch:

```typescript
// Detect wrong network
if (web3Provider.isWrongNetwork()) {
  // Automatically prompts user via MetaMask
  await web3Provider.switchToPolygon();
}
```

If Polygon is not in the user's wallet, it automatically adds the network with correct configuration.

### 4. Connection Status Indicator

Real-time visual feedback with multiple states:

- **Connected** (Green) - Successfully connected to Polygon
- **Connecting** (Blue) - Establishing connection
- **Disconnected** (Gray) - No active connection
- **Wrong Network** (Orange) - Connected to wrong chain
- **Error** (Red) - Connection error occurred

### 5. Gas Price Estimation

Real-time gas price fetching with USD cost estimation:

```typescript
const estimate = await web3Provider.getGasEstimate();

console.log('Gas Price:', estimate.gasPrice);
console.log('Max Fee:', estimate.maxFeePerGas);
console.log('Priority Fee:', estimate.maxPriorityFeePerGas);
console.log('Est. Cost:', estimate.estimatedCostUSD);
```

**Features:**
- Current gas price in Gwei
- EIP-1559 fee data (maxFeePerGas, maxPriorityFeePerGas)
- USD cost estimation
- Automatic fallback values

### 6. Transaction Confirmation Waiting

Wait for transaction confirmations with timeout:

```typescript
const receipt = await web3Provider.waitForTransaction(
  txHash,
  1,        // confirmations
  120000    // timeout (ms)
);

console.log('Status:', receipt.status);
console.log('Confirmations:', receipt.confirmations);
console.log('Gas Used:', receipt.gasUsed);
```

**Features:**
- Configurable confirmation count
- Timeout protection
- Detailed receipt information
- Real-time confirmation tracking

## Usage Examples

### Basic Integration

```typescript
import { useWeb3Connection } from './hooks/useWeb3Connection';

function MyComponent() {
  const {
    isConnected,
    status,
    connectWallet,
    connectRPC,
    switchNetwork
  } = useWeb3Connection();

  return (
    <div>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>Connected to Polygon</div>
      )}
    </div>
  );
}
```

### With Status Indicator

```typescript
import { Web3ConnectionStatus } from './components/Web3ConnectionStatus';

function App() {
  return (
    <div>
      <Web3ConnectionStatus
        showDetails
        showGasPrice
      />
    </div>
  );
}
```

### Health Monitoring

```typescript
const { healthCheck } = useWeb3Connection();

const checkHealth = async () => {
  const health = await healthCheck();

  if (health.isHealthy) {
    console.log('Latency:', health.latency, 'ms');
    console.log('Block:', health.blockNumber);
  } else {
    console.error('Unhealthy:', health.error);
  }
};
```

### Transaction Submission

```typescript
import { web3Provider } from './services/web3Provider';
import { ethers } from 'ethers';

async function sendTransaction() {
  // Ensure we're connected
  await web3Provider.ensureConnection();

  const signer = web3Provider.getSigner();
  if (!signer) throw new Error('No signer available');

  // Get gas estimate
  const gasEstimate = await web3Provider.getGasEstimate();

  // Send transaction
  const tx = await signer.sendTransaction({
    to: '0x...',
    value: ethers.parseEther('0.1'),
    maxFeePerGas: gasEstimate.maxFeePerGas,
    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
  });

  // Wait for confirmation
  const receipt = await web3Provider.waitForTransaction(tx.hash, 2);

  return receipt;
}
```

## Connection Flow

### RPC Connection Flow

1. User initiates RPC connection
2. Service tries first available RPC endpoint
3. Verifies network is Polygon (137)
4. Fetches block number to confirm connectivity
5. On success, marks endpoint as healthy
6. On failure, tries next endpoint
7. Repeats until connection or all endpoints fail

### Wallet Connection Flow

1. User initiates wallet connection
2. Checks if MetaMask is installed
3. Requests accounts from wallet
4. Verifies network is Polygon
5. If wrong network, prompts to switch
6. If network not added, adds Polygon config
7. Sets up event listeners for changes
8. Returns connected state with signer

## Event Listeners

The service automatically listens for wallet events:

- **chainChanged** - Reloads page when network changes
- **accountsChanged** - Reconnects or disconnects
- **disconnect** - Cleans up connection state

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  await web3Provider.connectWithRPC();
} catch (error) {
  if (error.message.includes('All RPC endpoints failed')) {
    // No available RPC endpoints
  } else if (error.message.includes('timeout')) {
    // Connection timeout
  } else {
    // Other error
  }
}
```

## Best Practices

1. **Always Check Connection**
   ```typescript
   await web3Provider.ensureConnection();
   ```

2. **Verify Network**
   ```typescript
   if (!await web3Provider.verifyNetwork()) {
     await web3Provider.switchToPolygon();
   }
   ```

3. **Use Health Checks**
   ```typescript
   const health = await web3Provider.healthCheck();
   if (!health.isHealthy) {
     await web3Provider.reconnect();
   }
   ```

4. **Handle Wallet Disconnection**
   ```typescript
   if (connection?.type === 'injected' && !isConnected) {
     // Prompt user to reconnect
   }
   ```

5. **Monitor Gas Prices**
   ```typescript
   // Update gas estimates periodically
   useEffect(() => {
     if (isConnected) {
       const interval = setInterval(fetchGasEstimate, 15000);
       return () => clearInterval(interval);
     }
   }, [isConnected]);
   ```

## Configuration

### Adding Custom RPC Endpoints

Edit `src/services/web3Provider.ts`:

```typescript
const RPC_ENDPOINTS = [
  'https://polygon-rpc.com',
  'https://your-custom-rpc.com',
  // ... more endpoints
];
```

### Adjusting Timeouts

```typescript
// RPC connection timeout
const timeout = 10000; // 10 seconds

// Transaction confirmation timeout
await waitForTransaction(txHash, 1, 120000); // 2 minutes
```

### Reconnection Settings

```typescript
private maxReconnectAttempts = 3;
private reconnectDelay = 2000; // 2 seconds
```

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to any RPC endpoint
**Solution:** Check internet connection and firewall settings

**Problem:** MetaMask not detected
**Solution:** Install MetaMask browser extension

**Problem:** Wrong network error persists
**Solution:** Manually switch network in MetaMask

### Performance Issues

**Problem:** Slow connection establishment
**Solution:** Reset failed endpoints with `resetRpcFailures()`

**Problem:** High latency
**Solution:** Check health and try different RPC endpoint

### Transaction Issues

**Problem:** Transaction timeout
**Solution:** Increase confirmation timeout or check network status

**Problem:** Gas estimation fails
**Solution:** Service provides fallback values automatically

## API Reference

### Web3ProviderService Methods

- `connectWithRPC()` - Connect via RPC endpoint
- `connectWithInjectedWallet()` - Connect via MetaMask
- `switchToPolygon()` - Switch to Polygon network
- `disconnect()` - Disconnect current connection
- `reconnect()` - Attempt reconnection
- `getProvider()` - Get ethers Provider instance
- `getSigner()` - Get ethers Signer instance
- `isConnected()` - Check connection status
- `isWrongNetwork()` - Check if on wrong network
- `getGasEstimate()` - Get current gas prices
- `waitForTransaction()` - Wait for tx confirmation
- `verifyNetwork()` - Verify correct network
- `healthCheck()` - Check connection health
- `ensureConnection()` - Ensure valid connection
- `getBalance()` - Get address MATIC balance
- `getCurrentBlock()` - Get current block number
- `formatMatic()` - Format Wei to MATIC
- `parseMatic()` - Parse MATIC to Wei

### Hook Return Values

The `useWeb3Connection()` hook returns:

```typescript
{
  connection: Web3Connection | null,
  provider: ethers.Provider | undefined,
  signer: ethers.Signer | undefined,
  connectionType: 'rpc' | 'injected' | null,
  status: ConnectionStatus,
  chainId: number | undefined,
  isConnected: boolean,
  isWrongNetwork: boolean,
  isConnecting: boolean,
  error: string | null,
  // Methods
  connectRPC: () => Promise<void>,
  connectWallet: () => Promise<void>,
  switchNetwork: () => Promise<boolean>,
  disconnect: () => void,
  reconnect: () => Promise<void>,
  getGasEstimate: () => Promise<GasEstimate>,
  waitForTransaction: (hash, confirms?, timeout?) => Promise<Receipt>,
  verifyNetwork: () => Promise<boolean>,
  getBalance: (address) => Promise<bigint>,
  healthCheck: () => Promise<HealthResult>,
  ensureConnection: () => Promise<void>,
  // Utilities
  formatMatic: (amount: bigint) => string,
  parseMatic: (amount: string) => bigint,
  getRpcEndpoint: () => string,
  getAvailableRpcEndpoints: () => string[],
  resetRpcFailures: () => void
}
```

## Testing

Use the `Web3ConnectionDemo` component to test all features:

```typescript
import { Web3ConnectionDemo } from './components/Web3ConnectionDemo';

function TestPage() {
  return <Web3ConnectionDemo />;
}
```

The demo provides:
- Connection buttons for both modes
- Real-time connection status
- Health check monitoring
- Gas price updates
- RPC endpoint management
- Error display

## Security Considerations

1. **Private Keys**: Never expose private keys in the frontend
2. **RPC URLs**: Use trusted RPC providers only
3. **Network Verification**: Always verify network before transactions
4. **Transaction Signing**: Only sign trusted transactions
5. **Balance Checks**: Validate balances before operations

## Performance Optimization

1. **Connection Caching**: Provider instances are reused
2. **Lazy Loading**: Only connects when needed
3. **Failed Endpoint Tracking**: Skips known-bad endpoints
4. **Static Network**: Uses static network for faster connection
5. **Batch Requests**: Disabled for better reliability

## Conclusion

This implementation provides enterprise-grade Polygon network connectivity with comprehensive error handling, automatic failover, and developer-friendly APIs. All acceptance criteria have been met:

- ✅ Polygon mainnet connection
- ✅ RPC fallback endpoints (7 endpoints)
- ✅ Network auto-switching
- ✅ Connection status indicator
- ✅ Gas price estimation
- ✅ Transaction confirmation waiting

For questions or issues, refer to the ethers.js documentation or the Polygon documentation.
