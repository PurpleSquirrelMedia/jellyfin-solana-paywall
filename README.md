# Jellyfin Solana Pay Paywall

Solana Pay integration for Jellyfin media server subscriptions with NFT membership and 1% platform fee.

## Features

- **Solana Pay Integration** - Accept SOL and USDC payments
- **1% Platform Fee** - Automatic fee collection on all transactions
- **NFT Membership** - Mint membership NFTs on payment
- **Multi-Wallet Support** - Phantom, Solflare, Backpack
- **Balance Checks** - Verify funds before transaction
- **RPC Fallback** - Multiple endpoints for reliability
- **Auto Token Accounts** - Creates USDC accounts if missing

## Installation

```html
<!-- Load Solana dependencies -->
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js"></script>

<!-- Load paywall -->
<script src="solana-pay.js"></script>
```

## Configuration

```javascript
// Update these values in solana-pay.js
PSM_PAY.MERCHANT_WALLET = 'YOUR_SOLANA_WALLET_ADDRESS';
PSM_PAY.CONFIG.API_URL = 'https://your-api.com';
PSM_PAY.CONFIG.MINTER_URL = 'https://your-nft-minter.com';
PSM_PAY.CONFIG.RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://your-rpc-provider.com'
];
```

## Usage

```javascript
// Connect wallet
const result = await PSM_PAY.connectWallet(); // Auto-detect
// or
const result = await PSM_PAY.connectWallet('Phantom');

// Check balance
const balance = await PSM_PAY.checkBalance(false, 'pro'); // SOL
const balance = await PSM_PAY.checkBalance(true, 'pro');  // USDC

// Process payment
const payment = await PSM_PAY.payWithWallet('pro', false); // Pay in SOL
const payment = await PSM_PAY.payWithWallet('pro', true);  // Pay in USDC

if (payment.success) {
    console.log('Transaction:', payment.explorer);
}
```

## Subscription Tiers

| Tier | SOL | USDC | Features |
|------|-----|------|----------|
| Basic | 0.05 | $9.99 | HD Streaming, Basic Library, Mobile |
| Pro | 0.10 | $19.99 | 4K, Full Library, Download, No Ads |
| Creator | 0.25 | $49.99 | Unlimited Upload, Monetization, Analytics |

## Fee Structure

Each transaction splits payment:
- **99%** → Merchant wallet
- **1%** → Platform fee wallet

## API

### PSM_PAY

| Method | Description |
|--------|-------------|
| `init()` | Initialize connection and detect wallets |
| `connectWallet(name?)` | Connect to wallet |
| `getAvailableWallets()` | List detected wallets |
| `checkBalance(usdc, tier)` | Check if balance sufficient |
| `payWithWallet(tier, usdc)` | Process payment |
| `verifyPayment(sig)` | Verify transaction on-chain |
| `getSOLPrice()` | Get current SOL/USD price |
| `createPaymentURL(tier, usdc)` | Generate Solana Pay QR URL |

### PSM_NFT

| Method | Description |
|--------|-------------|
| `checkMembership(wallet)` | Check if wallet has NFT |
| `mintMembershipNFT(tier, sig)` | Mint membership NFT |
| `getNFTImage(tier)` | Get tier NFT image URL |

## Testing

```bash
node test.js
```

## License

MIT
