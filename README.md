# Jellyfin Solana Pay Paywall

Solana Pay integration for Jellyfin media server subscriptions with NFT membership and 1% platform fee.

## Features

- **Solana Pay Integration** - Accept SOL and USDC payments
- **1% Platform Fee** - Automatic fee collection on all transactions
- **NFT Membership** - Mint membership NFTs on payment
- **Multi-Wallet Support** - Phantom, Solflare, Backpack
- **Network Support** - Mainnet, Devnet, Testnet
- **Balance Checks** - Verify funds before transaction
- **RPC Fallback** - Multiple endpoints with automatic retry
- **QR Code Generation** - Solana Pay compatible QR codes
- **Subscription Tracking** - Local storage with expiry tracking
- **TypeScript Support** - Full type definitions included

## Quick Start

### 1. Include Dependencies

```html
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js"></script>
<script src="solana-pay.js"></script>
```

### 2. Configure

```javascript
PSM_PAY.MERCHANT_WALLET = 'YOUR_SOLANA_WALLET_ADDRESS';
PSM_PAY.setNetwork('devnet'); // For testing
// PSM_PAY.setNetwork('mainnet-beta'); // For production
```

### 3. Connect & Pay

```javascript
// Connect wallet
await PSM_PAY.connectWallet();

// Process payment
const result = await PSM_PAY.payWithWallet('pro', false); // SOL
// or
const result = await PSM_PAY.payWithWallet('pro', true);  // USDC

if (result.success) {
    console.log('Paid!', result.explorer);
}
```

## Demo

Open `example.html` in a browser to see a full working demo. Switch to devnet for testing with free SOL.

## API Reference

### Network

```javascript
// Switch networks
await PSM_PAY.setNetwork('devnet');     // Testing
await PSM_PAY.setNetwork('mainnet-beta'); // Production

// Request test SOL (devnet only)
await PSM_PAY.requestAirdrop(1); // 1 SOL
```

### Wallet

```javascript
// Get available wallets
const wallets = PSM_PAY.getAvailableWallets();
// [{ name: 'Phantom', provider: ..., icon: '...' }, ...]

// Connect (auto-detect)
await PSM_PAY.connectWallet();

// Connect specific wallet
await PSM_PAY.connectWallet('Phantom');

// Disconnect
await PSM_PAY.disconnectWallet();
```

### Balance

```javascript
// Check SOL balance for tier
const balance = await PSM_PAY.checkBalance(false, 'pro');
// { sufficient: true, available: 1.5, required: 0.11, currency: 'SOL' }

// Check USDC balance
const balance = await PSM_PAY.checkBalance(true, 'pro');
```

### Payments

```javascript
// Pay with SOL
const result = await PSM_PAY.payWithWallet('basic', false);

// Pay with USDC
const result = await PSM_PAY.payWithWallet('pro', true);

// Result:
// {
//   success: true,
//   signature: '5abc...',
//   tier: 'pro',
//   amount: 0.1,
//   currency: 'SOL',
//   fee: 0.001,
//   explorer: 'https://solscan.io/tx/...',
//   subscription: { ... }
// }
```

### QR Codes

```javascript
// Generate QR code
const qr = await PSM_PAY.generateQRCode('pro', false, 256);
// { success: true, dataUrl: 'data:image/png...', paymentUrl: 'solana:...' }

// Use in HTML
document.getElementById('qr').src = qr.dataUrl;
```

### Subscriptions

```javascript
// Check current subscription
const sub = PSM_PAY.getCurrentSubscription();
// { active: true, tier: 'pro', expiresAt: '2024-02-15T...', ... }

// Check if active
if (PSM_PAY.isSubscriptionActive()) {
    // Grant access
}

// Get history
const history = PSM_PAY.getSubscriptionHistory();
```

### Verification

```javascript
// Verify transaction on-chain
const result = await PSM_PAY.verifyPayment('signature...');
// { success: true, confirmed: true, slot: 123456, blockTime: ... }
```

## Subscription Tiers

| Tier | SOL | USDC | Duration | Features |
|------|-----|------|----------|----------|
| Basic | 0.05 | $9.99 | 30 days | HD, Basic Library, Mobile |
| Pro | 0.10 | $19.99 | 30 days | 4K, Full Library, Download, No Ads |
| Creator | 0.25 | $49.99 | 30 days | Upload, Monetization, Analytics |

## Fee Structure

Each transaction automatically splits:
- **99%** → Merchant wallet
- **1%** → Platform fee wallet

Fee wallet: `DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu`

## Files

| File | Description |
|------|-------------|
| `solana-pay.js` | Main paywall module |
| `solana-nft.js` | NFT verification & gating |
| `types.d.ts` | TypeScript definitions |
| `example.html` | Interactive demo page |
| `test.js` | Test suite |

## Testing

```bash
# Run unit tests
node test.js

# Test in browser
# Open example.html and switch to devnet
# Use "Airdrop 1 SOL" button for test funds
```

## TypeScript

```typescript
import { PSM_PAY, PSM_NFT, PSM } from './types';

const result: PSM.PaymentResult = await PSM_PAY.payWithWallet('pro', false);
```

## Configuration Options

```javascript
PSM_PAY.CONFIG = {
    API_URL: 'https://your-api.com',      // Backend API
    MINTER_URL: 'https://your-minter.com', // NFT minter service
    MAX_RETRIES: 3,                        // Transaction retry attempts
    RETRY_DELAY: 1000,                     // Delay between retries (ms)
    SUBSCRIPTION_DURATION_DAYS: 30         // Default subscription length
};

// Custom RPC endpoints
PSM_PAY.NETWORKS['mainnet-beta'].RPC_ENDPOINTS = [
    'https://your-rpc-1.com',
    'https://your-rpc-2.com'
];
```

## License

MIT
