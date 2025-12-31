// Purple Squirrel Media - Solana Pay Integration
// Zero-fee payments using Solana blockchain

const PSM_PAY = {
    // Your Solana wallet address for receiving payments
    MERCHANT_WALLET: 'YOUR_SOLANA_WALLET_ADDRESS', // Replace with your wallet

    // Platform fee wallet (1% of each transaction)
    FEE_WALLET: 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu',
    FEE_PERCENT: 0.01, // 1% platform fee

    // Subscription tiers in SOL (prices will fluctuate with SOL price)
    TIERS: {
        basic: {
            name: 'Basic',
            priceSOL: 0.05,  // ~$10 at $200/SOL
            priceUSDC: 9.99,
            features: ['HD Streaming', 'Basic Library', 'Mobile Access']
        },
        pro: {
            name: 'Pro',
            priceSOL: 0.1,   // ~$20 at $200/SOL
            priceUSDC: 19.99,
            features: ['4K Streaming', 'Full Library', 'Download', 'No Ads']
        },
        creator: {
            name: 'Creator',
            priceSOL: 0.25,  // ~$50 at $200/SOL
            priceUSDC: 49.99,
            features: ['Unlimited Upload', 'Monetization', 'Analytics', 'Priority Support']
        }
    },

    // USDC on Solana (for stable pricing)
    USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',

    // Initialize
    async init() {
        this.connection = null;
        this.provider = null;

        if (window.solana && window.solana.isPhantom) {
            this.provider = window.solana;
        }

        return this;
    },

    // Create payment request URL (for QR codes)
    createPaymentURL(tier, payInUSDC = false) {
        const tierData = this.TIERS[tier];
        if (!tierData) throw new Error('Invalid tier');

        const amount = payInUSDC ? tierData.priceUSDC : tierData.priceSOL;
        const token = payInUSDC ? this.USDC_MINT : null;

        // Solana Pay URL format
        let url = `solana:${this.MERCHANT_WALLET}?amount=${amount}`;
        if (token) {
            url += `&spl-token=${token}`;
        }
        url += `&label=Purple%20Squirrel%20Media`;
        url += `&message=${encodeURIComponent(`${tierData.name} Subscription`)}`;
        url += `&memo=${encodeURIComponent(`sub_${tier}_${Date.now()}`)}`;

        return url;
    },

    // Process payment directly from browser
    async payWithWallet(tier, payInUSDC = false) {
        if (!this.provider) {
            return { success: false, error: 'Please install Phantom wallet' };
        }

        try {
            // Connect wallet if not connected
            await this.provider.connect();
            const publicKey = this.provider.publicKey;

            const tierData = this.TIERS[tier];
            const amount = payInUSDC ? tierData.priceUSDC : tierData.priceSOL;

            // Create transaction reference for tracking
            const reference = this.generateReference();

            if (payInUSDC) {
                // SPL Token transfer (USDC)
                return await this.transferSPLToken(publicKey, amount, reference, tier);
            } else {
                // Native SOL transfer
                return await this.transferSOL(publicKey, amount, reference, tier);
            }
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'Transaction cancelled by user' };
            }
            return { success: false, error: error.message };
        }
    },

    // Transfer SOL (with 1% platform fee)
    async transferSOL(fromPubkey, amount, reference, tier) {
        // Using @solana/web3.js loaded from CDN
        const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3;

        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const merchantPubkey = new PublicKey(this.MERCHANT_WALLET);
        const feePubkey = new PublicKey(this.FEE_WALLET);

        // Calculate fee and merchant amounts
        const totalLamports = Math.round(amount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(totalLamports * this.FEE_PERCENT);
        const merchantLamports = totalLamports - feeLamports;

        const transaction = new Transaction()
            // Main payment to merchant (99%)
            .add(
                SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: merchantPubkey,
                    lamports: merchantLamports
                })
            )
            // Platform fee (1%)
            .add(
                SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: feePubkey,
                    lamports: feeLamports
                })
            );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Sign and send
        const signed = await this.provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());

        // Confirm transaction
        await connection.confirmTransaction(signature);

        // Notify backend
        await this.recordPayment(signature, tier, amount, 'SOL');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'SOL'
        };
    },

    // Transfer USDC (SPL Token) with 1% platform fee
    async transferSPLToken(fromPubkey, amount, reference, tier) {
        const { Connection, PublicKey, Transaction } = window.solanaWeb3;
        const { createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = window.splToken;

        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const merchantPubkey = new PublicKey(this.MERCHANT_WALLET);
        const feePubkey = new PublicKey(this.FEE_WALLET);
        const usdcMint = new PublicKey(this.USDC_MINT);

        // Get token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPubkey);
        const merchantTokenAccount = await getAssociatedTokenAddress(usdcMint, merchantPubkey);
        const feeTokenAccount = await getAssociatedTokenAddress(usdcMint, feePubkey);

        // USDC has 6 decimals - calculate fee and merchant amounts
        const totalAmount = Math.round(amount * 1_000_000);
        const feeAmount = Math.round(totalAmount * this.FEE_PERCENT);
        const merchantAmount = totalAmount - feeAmount;

        const transaction = new Transaction()
            // Main payment to merchant (99%)
            .add(
                createTransferInstruction(
                    fromTokenAccount,
                    merchantTokenAccount,
                    fromPubkey,
                    merchantAmount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            )
            // Platform fee (1%)
            .add(
                createTransferInstruction(
                    fromTokenAccount,
                    feeTokenAccount,
                    fromPubkey,
                    feeAmount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signed = await this.provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        await this.recordPayment(signature, tier, amount, 'USDC');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'USDC'
        };
    },

    // Record payment and mint NFT
    async recordPayment(signature, tier, amount, currency) {
        try {
            const wallet = this.provider.publicKey.toString();

            // 1. Record payment in backend
            const response = await fetch('https://sound-prospective-handheld-turtle.trycloudflare.com/api/v1/payments/record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...PSM_AUTH.getAuthHeaders()
                },
                body: JSON.stringify({
                    signature,
                    tier,
                    amount,
                    currency,
                    wallet
                })
            });

            if (!response.ok) {
                console.error('Failed to record payment');
            }

            // 2. Trigger NFT minting
            console.log('Payment recorded, minting membership NFT...');
            const nftResult = await PSM_NFT.mintMembershipNFT(tier, signature);

            if (nftResult.success) {
                console.log('NFT minted:', nftResult.nftMint);
                // Store NFT info
                localStorage.setItem('psmNFT', JSON.stringify({
                    mint: nftResult.nftMint,
                    tier: nftResult.tier,
                    mintedAt: new Date().toISOString()
                }));
            }

        } catch (error) {
            console.error('Payment recording error:', error);
        }
    },

    // Generate unique reference
    generateReference() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Verify payment on-chain
    async verifyPayment(signature) {
        const { Connection } = window.solanaWeb3;
        const connection = new Connection('https://api.mainnet-beta.solana.com');

        try {
            const result = await connection.getTransaction(signature, {
                commitment: 'confirmed'
            });

            return {
                success: result !== null,
                confirmed: result?.meta?.err === null,
                slot: result?.slot,
                blockTime: result?.blockTime
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get current SOL price in USD (for display)
    async getSOLPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch (error) {
            return null; // Fallback: don't show USD conversion
        }
    },

    // Format price for display
    async formatPrices(tier) {
        const tierData = this.TIERS[tier];
        const solPrice = await this.getSOLPrice();

        return {
            sol: `${tierData.priceSOL} SOL`,
            solUSD: solPrice ? `~$${(tierData.priceSOL * solPrice).toFixed(2)}` : null,
            usdc: `$${tierData.priceUSDC} USDC`
        };
    }
};

// NFT Membership System
const PSM_NFT = {
    // NFT Minter service URL (runs alongside main API)
    MINTER_URL: 'http://163.192.105.31:3001',
    API_URL: 'https://sound-prospective-handheld-turtle.trycloudflare.com',

    // Check if wallet holds membership NFT
    async checkMembership(walletAddress) {
        try {
            // Check both backend and on-chain
            const [apiCheck, chainCheck] = await Promise.all([
                fetch(`${this.API_URL}/api/v1/nft/check?wallet=${walletAddress}`).then(r => r.json()),
                fetch(`${this.MINTER_URL}/check-membership?wallet=${walletAddress}`).then(r => r.json()).catch(() => null)
            ]);

            return {
                hasMembership: apiCheck.hasMembership || chainCheck?.hasMembership,
                tier: apiCheck.tier || chainCheck?.tier,
                nftMint: chainCheck?.nftMint
            };
        } catch (error) {
            return { hasMembership: false, error: error.message };
        }
    },

    // Verify payment and mint NFT
    async mintMembershipNFT(tier, paymentSignature) {
        const wallet = window.solana?.publicKey?.toString();
        if (!wallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        try {
            // 1. Verify payment on-chain
            console.log('Verifying payment on-chain...');
            const verifyRes = await fetch(`${this.MINTER_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: paymentSignature,
                    tier
                })
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.verified) {
                return { success: false, error: verifyData.error || 'Payment verification failed' };
            }

            console.log('Payment verified, minting NFT...');

            // 2. Mint the NFT
            const mintRes = await fetch(`${this.MINTER_URL}/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientWallet: wallet,
                    tier,
                    paymentSignature
                })
            });
            const mintData = await mintRes.json();

            if (!mintData.success) {
                return { success: false, error: mintData.error || 'Minting failed' };
            }

            // 3. Update backend user record
            await fetch(`${this.API_URL}/api/v1/nft/mint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...PSM_AUTH.getAuthHeaders()
                },
                body: JSON.stringify({
                    tier,
                    wallet,
                    nftMint: mintData.nftMint
                })
            });

            return {
                success: true,
                nftMint: mintData.nftMint,
                tier: mintData.tier,
                explorer: mintData.explorer,
                metadata: mintData.metadata
            };

        } catch (error) {
            console.error('NFT minting error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get NFT image for display
    getNFTImage(tier) {
        const images = {
            basic: 'https://purplesquirrel.media/nft/basic.png',
            pro: 'https://purplesquirrel.media/nft/pro.png',
            creator: 'https://purplesquirrel.media/nft/creator.png'
        };
        return images[tier] || images.basic;
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => PSM_PAY.init());

// Export
window.PSM_PAY = PSM_PAY;
window.PSM_NFT = PSM_NFT;
