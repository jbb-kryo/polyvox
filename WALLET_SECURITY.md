# Wallet Security Implementation

This document describes the secure private key storage system in PolyVOX.

## Overview

PolyVOX uses client-side encryption to protect user private keys. Private keys are never stored in plain text, and decryption only happens on-demand when executing trades.

## Architecture

### Encryption

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256
- **IV**: 12-byte random initialization vector
- **Location**: Browser's Web Crypto API (SubtleCrypto)

### Storage

1. User provides their private key and creates a master password
2. Private key is encrypted using AES-256-GCM
3. Encrypted blob is stored in Supabase `user_profiles.encrypted_private_key`
4. Master password is NEVER stored or transmitted to the server

### Decryption

1. When a trade needs to be executed, user is prompted for master password
2. Master password is used to derive decryption key
3. Private key is decrypted in memory
4. Private key is used for signing the transaction
5. Private key is immediately cleared from memory after use

## Security Features

### Client-Side Encryption

All encryption/decryption happens entirely in the user's browser using the Web Crypto API. The server never sees the unencrypted private key or the master password.

### On-Demand Decryption

Private keys are only decrypted when needed for trading operations. They are not kept in memory longer than necessary.

### No Logging

Private keys are never logged to console, error messages, or analytics. All error handling sanitizes sensitive data.

### Secure Password Requirements

Master passwords must be:
- Minimum 12 characters long
- Contain mixed case letters
- Contain numbers
- Contain special characters (recommended)

### Row-Level Security

The encrypted private key column in the database is protected by Supabase RLS policies. Users can only access their own encrypted keys.

## Usage for Developers

### Setting Up a Wallet

```typescript
import { useAuth } from '../contexts/AuthContext';

function WalletSetup() {
  const { setWalletCredentials } = useAuth();

  const handleSetup = async (privateKey: string, masterPassword: string) => {
    const walletAddress = '0x...'; // Derive from private key
    const { error } = await setWalletCredentials(
      walletAddress,
      privateKey,
      masterPassword
    );

    if (error) {
      // Handle error
    }
  };
}
```

### Requesting Private Key for Trading

```typescript
import { useSecureWallet } from '../hooks/useSecureWallet';
import MasterPasswordPrompt from '../components/MasterPasswordPrompt';

function TradingComponent() {
  const {
    requestPrivateKey,
    clearPrivateKey,
    promptOpen,
    handlePasswordSubmit,
    handlePasswordCancel
  } = useSecureWallet();

  const executeTrade = async () => {
    // Request private key (will prompt user if not cached)
    const privateKey = await requestPrivateKey();

    if (!privateKey) {
      // User cancelled or no wallet configured
      return;
    }

    try {
      // Use private key for signing
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage('...');

      // Execute trade
      // ...
    } finally {
      // Clear private key from memory
      clearPrivateKey();
    }
  };

  return (
    <>
      <button onClick={executeTrade}>Execute Trade</button>

      <MasterPasswordPrompt
        isOpen={promptOpen}
        onClose={handlePasswordCancel}
        onSubmit={handlePasswordSubmit}
      />
    </>
  );
}
```

## Security Best Practices

### DO

- ✅ Use `useSecureWallet` hook for private key access
- ✅ Clear private key from memory after use with `clearPrivateKey()`
- ✅ Validate master password strength
- ✅ Show security warnings to users
- ✅ Use HTTPS in production
- ✅ Implement proper error handling

### DON'T

- ❌ Log private keys to console
- ❌ Store private keys in plain text
- ❌ Keep decrypted keys in state longer than necessary
- ❌ Pass private keys through URL parameters
- ❌ Include private keys in error messages
- ❌ Transmit private keys to external services

## Future Enhancements

### Hardware Wallet Support

- MetaMask integration (planned)
- Ledger support (planned)
- WalletConnect integration (planned)

### Additional Security

- Optional 2FA for wallet operations
- Hardware security key support
- Biometric authentication on mobile
- Multi-signature wallet support

## Compliance

This implementation follows industry best practices for client-side cryptography:

- Uses standard, well-tested algorithms (AES-GCM, PBKDF2)
- Leverages browser's native crypto APIs
- Implements proper key derivation
- Uses secure random number generation
- Follows OWASP cryptographic storage guidelines

## Audit Trail

For compliance and debugging, PolyVOX logs the following (without sensitive data):

- Wallet setup attempts (success/failure, no keys)
- Decryption attempts (success/failure, no passwords)
- Trade executions (transaction hashes only, no keys)

## Support

If users lose their master password, there is **NO WAY** to recover their private key. This is by design - if recovery were possible, it would mean the encryption is weak.

Users should be advised to:
1. Store their master password in a secure password manager
2. Keep a backup of their private key in a secure location
3. Test their master password immediately after setup

## Emergency Procedures

If a user suspects their private key has been compromised:

1. Immediately transfer all funds to a new wallet
2. Delete the compromised wallet from PolyVOX settings
3. Set up a new wallet with a new private key
4. Never reuse the compromised master password

## Testing

When testing wallet functionality:

```typescript
// Use test private keys only
const TEST_PRIVATE_KEY = '0x1234...'; // Throwaway test key
const TEST_PASSWORD = 'TestPassword123!';

// Never use real private keys in tests
// Never commit private keys to version control
```

## Questions?

For questions about the wallet security implementation, please contact the security team or open an issue on GitHub.
