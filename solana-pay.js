// Purple Squirrel Media - Solana Pay Integration
// Solana payments with 1% platform fee

const PSM_PAY = {
    // Configuration - UPDATE THESE VALUES
    MERCHANT_WALLET: 'YOUR_SOLANA_WALLET_ADDRESS', // Replace with your wallet
    FEE_WALLET: 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu',
    FEE_PERCENT: 0.01, // 1% platform fee

    // API Configuration - UPDATE FOR PRODUCTION
    CONFIG: {
        API_URL: 'https://your-api.example.com',
        MINTER_URL: 'https://your-minter.example.com',
        // RPC endpoints with fallbacks
        RPC_ENDPOINTS: [
            'https://api.mainnet-beta.solana.com',
            'https://solana-mainnet.g.alchemy.com/v2/your-key',
            'https://rpc.helius.xyz/?api-key=your-key'
        ]
    },

    // Subscription tiers
    TIERS: {
        basic: {
            name: 'Basic',
            priceSOL: 0.05,
            priceUSDC: 9.99,
            features: ['HD Streaming', 'Basic Library', 'Mobile Access']
        },
        pro: {
            name: 'Pro',
            priceSOL: 0.1,
            priceUSDC: 19.99,
            features: ['4K Streaming', 'Full Library', 'Download', 'No Ads']
        },
        creator: {
            name: 'Creator',
            priceSOL: 0.25,
            priceUSDC: 49.99,
            features: ['Unlimited Upload', 'Monetization', 'Analytics', 'Priority Support']
        }
    },

    // USDC on Solana mainnet
    USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',

    // State
    connection: null,
    provider: null,
    currentRpcIndex: 0,

    // Initialize with multi-wallet support
    async init() {
        this.connection = null;
        this.provider = null;

        // Check for wallets in order of preference
        if (window.solana?.isPhantom) {
            this.provider = window.solana;
        } else if (window.solflare?.isSolflare) {
            this.provider = window.solflare;
        } else if (window.backpack) {
            this.provider = window.backpack;
        }

        // Initialize connection
        await this.initConnection();

        return this;
    },

    // Initialize connection with fallback
    async initConnection() {
        const { Connection } = window.solanaWeb3;

        for (let i = 0; i < this.CONFIG.RPC_ENDPOINTS.length; i++) {
            try {
                const endpoint = this.CONFIG.RPC_ENDPOINTS[i];
                const conn = new Connection(endpoint, 'confirmed');
                await conn.getLatestBlockhash(); // Test connection
                this.connection = conn;
                this.currentRpcIndex = i;
                console.log('Connected to RPC:', endpoint);
                return;
            } catch (error) {
                console.warn(`RPC ${i} failed, trying next...`);
            }
        }
        throw new Error('All RPC endpoints failed');
    },

    // Switch to next RPC on failure
    async switchRpc() {
        this.currentRpcIndex = (this.currentRpcIndex + 1) % this.CONFIG.RPC_ENDPOINTS.length;
        await this.initConnection();
    },

    // Get available wallets
    getAvailableWallets() {
        const wallets = [];
        if (window.solana?.isPhantom) wallets.push({ name: 'Phantom', provider: window.solana });
        if (window.solflare?.isSolflare) wallets.push({ name: 'Solflare', provider: window.solflare });
        if (window.backpack) wallets.push({ name: 'Backpack', provider: window.backpack });
        return wallets;
    },

    // Connect specific wallet
    async connectWallet(walletName = null) {
        const wallets = this.getAvailableWallets();

        if (wallets.length === 0) {
            return { success: false, error: 'No Solana wallet found. Please install Phantom, Solflare, or Backpack.' };
        }

        const wallet = walletName
            ? wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase())
            : wallets[0];

        if (!wallet) {
            return { success: false, error: `Wallet ${walletName} not found` };
        }

        try {
            await wallet.provider.connect();
            this.provider = wallet.provider;
            return {
                success: true,
                wallet: wallet.name,
                publicKey: wallet.provider.publicKey.toString()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Check user balance before transaction
    async checkBalance(payInUSDC = false, tier) {
        if (!this.provider?.publicKey) {
            return { sufficient: false, error: 'Wallet not connected' };
        }

        const tierData = this.TIERS[tier];
        if (!tierData) {
            return { sufficient: false, error: 'Invalid tier' };
        }

        const { PublicKey } = window.solanaWeb3;
        const publicKey = this.provider.publicKey;

        try {
            if (payInUSDC) {
                const { getAssociatedTokenAddress } = window.splToken;
                const usdcMint = new PublicKey(this.USDC_MINT);
                const tokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);

                try {
                    const balance = await this.connection.getTokenAccountBalance(tokenAccount);
                    const required = tierData.priceUSDC;
                    const available = parseFloat(balance.value.uiAmount);

                    return {
                        sufficient: available >= required,
                        available,
                        required,
                        currency: 'USDC'
                    };
                } catch {
                    return { sufficient: false, available: 0, required: tierData.priceUSDC, currency: 'USDC' };
                }
            } else {
                const balance = await this.connection.getBalance(publicKey);
                const available = balance / 1_000_000_000;
                const required = tierData.priceSOL + 0.01; // Add buffer for tx fees

                return {
                    sufficient: available >= required,
                    available,
                    required,
                    currency: 'SOL'
                };
            }
        } catch (error) {
            return { sufficient: false, error: error.message };
        }
    },

    // Create payment request URL (for QR codes)
    createPaymentURL(tier, payInUSDC = false) {
        const tierData = this.TIERS[tier];
        if (!tierData) throw new Error('Invalid tier');

        const amount = payInUSDC ? tierData.priceUSDC : tierData.priceSOL;
        const token = payInUSDC ? this.USDC_MINT : null;

        let url = `solana:${this.MERCHANT_WALLET}?amount=${amount}`;
        if (token) {
            url += `&spl-token=${token}`;
        }
        url += `&label=Purple%20Squirrel%20Media`;
        url += `&message=${encodeURIComponent(`${tierData.name} Subscription`)}`;
        url += `&memo=${encodeURIComponent(`sub_${tier}_${Date.now()}`)}`;

        return url;
    },

    // Process payment with validation
    async payWithWallet(tier, payInUSDC = false) {
        // Validate tier
        const tierData = this.TIERS[tier];
        if (!tierData) {
            return { success: false, error: `Invalid tier: ${tier}` };
        }

        if (!this.provider) {
            return { success: false, error: 'No wallet connected. Please connect a wallet first.' };
        }

        // Check balance first
        const balanceCheck = await this.checkBalance(payInUSDC, tier);
        if (!balanceCheck.sufficient) {
            return {
                success: false,
                error: `Insufficient ${balanceCheck.currency} balance. You have ${balanceCheck.available?.toFixed(4)} but need ${balanceCheck.required}`
            };
        }

        try {
            await this.provider.connect();
            const publicKey = this.provider.publicKey;
            const amount = payInUSDC ? tierData.priceUSDC : tierData.priceSOL;
            const reference = this.generateReference();

            if (payInUSDC) {
                return await this.transferSPLToken(publicKey, amount, reference, tier);
            } else {
                return await this.transferSOL(publicKey, amount, reference, tier);
            }
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'Transaction cancelled by user' };
            }
            // Try switching RPC on network errors
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                await this.switchRpc();
                return { success: false, error: 'Network error. Please try again.' };
            }
            return { success: false, error: error.message };
        }
    },

    // Transfer SOL with 1% platform fee
    async transferSOL(fromPubkey, amount, reference, tier) {
        const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3;

        const merchantPubkey = new PublicKey(this.MERCHANT_WALLET);
        const feePubkey = new PublicKey(this.FEE_WALLET);

        // Calculate amounts
        const totalLamports = Math.round(amount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(totalLamports * this.FEE_PERCENT);
        const merchantLamports = totalLamports - feeLamports;

        const transaction = new Transaction()
            .add(
                SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: merchantPubkey,
                    lamports: merchantLamports
                })
            )
            .add(
                SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: feePubkey,
                    lamports: feeLamports
                })
            );

        // Get blockhash with retry
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signed = await this.provider.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        // Use proper confirmation with timeout
        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        await this.recordPayment(signature, tier, amount, 'SOL');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'SOL',
            fee: feeLamports / LAMPORTS_PER_SOL,
            explorer: `https://solscan.io/tx/${signature}`
        };
    },

    // Transfer USDC with 1% platform fee
    async transferSPLToken(fromPubkey, amount, reference, tier) {
        const { PublicKey, Transaction } = window.solanaWeb3;
        const {
            createTransferInstruction,
            getAssociatedTokenAddress,
            createAssociatedTokenAccountInstruction,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        } = window.splToken;

        const merchantPubkey = new PublicKey(this.MERCHANT_WALLET);
        const feePubkey = new PublicKey(this.FEE_WALLET);
        const usdcMint = new PublicKey(this.USDC_MINT);

        // Get token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPubkey);
        const merchantTokenAccount = await getAssociatedTokenAddress(usdcMint, merchantPubkey);
        const feeTokenAccount = await getAssociatedTokenAddress(usdcMint, feePubkey);

        // Calculate amounts (USDC has 6 decimals)
        const totalAmount = Math.round(amount * 1_000_000);
        const feeAmount = Math.round(totalAmount * this.FEE_PERCENT);
        const merchantAmount = totalAmount - feeAmount;

        const transaction = new Transaction();

        // Check if fee token account exists, create if not
        try {
            await this.connection.getAccountInfo(feeTokenAccount);
        } catch {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPubkey,
                    feeTokenAccount,
                    feePubkey,
                    usdcMint,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }

        // Check if merchant token account exists, create if not
        try {
            await this.connection.getAccountInfo(merchantTokenAccount);
        } catch {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPubkey,
                    merchantTokenAccount,
                    merchantPubkey,
                    usdcMint,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }

        // Add transfer instructions
        transaction.add(
            createTransferInstruction(
                fromTokenAccount,
                merchantTokenAccount,
                fromPubkey,
                merchantAmount,
                [],
                TOKEN_PROGRAM_ID
            )
        );
        transaction.add(
            createTransferInstruction(
                fromTokenAccount,
                feeTokenAccount,
                fromPubkey,
                feeAmount,
                [],
                TOKEN_PROGRAM_ID
            )
        );

        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signed = await this.provider.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        await this.recordPayment(signature, tier, amount, 'USDC');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'USDC',
            fee: feeAmount / 1_000_000,
            explorer: `https://solscan.io/tx/${signature}`
        };
    },

    // Record payment and mint NFT
    async recordPayment(signature, tier, amount, currency) {
        try {
            const wallet = this.provider.publicKey.toString();

            // Record payment in backend (if configured)
            if (this.CONFIG.API_URL && !this.CONFIG.API_URL.includes('example.com')) {
                const headers = { 'Content-Type': 'application/json' };

                // Add auth headers if available
                if (typeof PSM_AUTH !== 'undefined' && PSM_AUTH.getAuthHeaders) {
                    Object.assign(headers, PSM_AUTH.getAuthHeaders());
                }

                const response = await fetch(`${this.CONFIG.API_URL}/api/v1/payments/record`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ signature, tier, amount, currency, wallet })
                });

                if (!response.ok) {
                    console.warn('Failed to record payment to backend');
                }
            }

            // Trigger NFT minting if available
            if (typeof PSM_NFT !== 'undefined') {
                console.log('Payment recorded, minting membership NFT...');
                const nftResult = await PSM_NFT.mintMembershipNFT(tier, signature);

                if (nftResult.success) {
                    console.log('NFT minted:', nftResult.nftMint);
                    localStorage.setItem('psmNFT', JSON.stringify({
                        mint: nftResult.nftMint,
                        tier: nftResult.tier,
                        mintedAt: new Date().toISOString()
                    }));
                }
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
        try {
            const result = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!result) {
                return { success: false, error: 'Transaction not found' };
            }

            return {
                success: true,
                confirmed: result.meta?.err === null,
                slot: result.slot,
                blockTime: result.blockTime,
                fee: result.meta?.fee
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get current SOL price in USD
    async getSOLPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch {
            return null;
        }
    },

    // Format price for display
    async formatPrices(tier) {
        const tierData = this.TIERS[tier];
        if (!tierData) return null;

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
    get MINTER_URL() { return PSM_PAY.CONFIG.MINTER_URL; },
    get API_URL() { return PSM_PAY.CONFIG.API_URL; },

    async checkMembership(walletAddress) {
        if (!walletAddress) {
            return { hasMembership: false, error: 'No wallet address provided' };
        }

        try {
            const checks = [];

            if (this.API_URL && !this.API_URL.includes('example.com')) {
                checks.push(
                    fetch(`${this.API_URL}/api/v1/nft/check?wallet=${walletAddress}`)
                        .then(r => r.json())
                        .catch(() => null)
                );
            }

            if (this.MINTER_URL && !this.MINTER_URL.includes('example.com')) {
                checks.push(
                    fetch(`${this.MINTER_URL}/check-membership?wallet=${walletAddress}`)
                        .then(r => r.json())
                        .catch(() => null)
                );
            }

            const results = await Promise.all(checks);
            const apiCheck = results[0];
            const chainCheck = results[1];

            return {
                hasMembership: apiCheck?.hasMembership || chainCheck?.hasMembership || false,
                tier: apiCheck?.tier || chainCheck?.tier,
                nftMint: chainCheck?.nftMint
            };
        } catch (error) {
            return { hasMembership: false, error: error.message };
        }
    },

    async mintMembershipNFT(tier, paymentSignature) {
        const wallet = window.solana?.publicKey?.toString() ||
                      window.solflare?.publicKey?.toString() ||
                      window.backpack?.publicKey?.toString();

        if (!wallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        if (!this.MINTER_URL || this.MINTER_URL.includes('example.com')) {
            console.warn('NFT minting not configured');
            return { success: false, error: 'NFT minting not configured' };
        }

        try {
            // Verify payment
            const verifyRes = await fetch(`${this.MINTER_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: paymentSignature, tier })
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.verified) {
                return { success: false, error: verifyData.error || 'Payment verification failed' };
            }

            // Mint NFT
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

            // Update backend if configured
            if (this.API_URL && !this.API_URL.includes('example.com')) {
                const headers = { 'Content-Type': 'application/json' };
                if (typeof PSM_AUTH !== 'undefined' && PSM_AUTH.getAuthHeaders) {
                    Object.assign(headers, PSM_AUTH.getAuthHeaders());
                }

                await fetch(`${this.API_URL}/api/v1/nft/mint`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ tier, wallet, nftMint: mintData.nftMint })
                }).catch(() => {});
            }

            return {
                success: true,
                nftMint: mintData.nftMint,
                tier: mintData.tier,
                explorer: mintData.explorer || `https://solscan.io/token/${mintData.nftMint}`,
                metadata: mintData.metadata
            };
        } catch (error) {
            console.error('NFT minting error:', error);
            return { success: false, error: error.message };
        }
    },

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
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => PSM_PAY.init());
}

// Export
if (typeof window !== 'undefined') {
    window.PSM_PAY = PSM_PAY;
    window.PSM_NFT = PSM_NFT;
}

if (typeof module !== 'undefined') {
    module.exports = { PSM_PAY, PSM_NFT };
}
