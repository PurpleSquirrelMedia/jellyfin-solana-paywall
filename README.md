# Jellyfin Solana Pay Paywall

Solana Pay integration for Jellyfin media server subscriptions with NFT membership.

## Features

- **Solana Pay Integration** - Accept SOL and USDC payments
- **NFT Membership** - Mint membership NFTs on payment
- **1% Platform Fee** - Automatic fee collection on transactions
- **Subscription Tiers** - Basic, Pro, and Creator plans

## Files

- `solana-pay.js` - Payment processing with Solana Pay
- `solana-nft.js` - NFT verification and gated content

## Configuration

Update `MERCHANT_WALLET` in `solana-pay.js` with your Solana wallet address.

```javascript
MERCHANT_WALLET: 'YOUR_SOLANA_WALLET_ADDRESS',
```

## Fee Structure

Each transaction includes a 1% platform fee sent to the fee wallet.

## Dependencies

Load these via CDN:
- `@solana/web3.js`
- `@solana/spl-token`

## License

MIT
