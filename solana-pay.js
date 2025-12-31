// Purple Squirrel Media - Solana Pay Integration
// Solana payments with 1% platform fee

const PSM_PAY = {
    // Configuration - UPDATE THESE VALUES
    MERCHANT_WALLET: 'YOUR_SOLANA_WALLET_ADDRESS',
    FEE_WALLET: 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu',
    FEE_PERCENT: 0.01, // 1% platform fee

    // Network configuration
    NETWORK: 'mainnet-beta', // 'mainnet-beta' | 'devnet' | 'testnet'

    // Network-specific settings
    NETWORKS: {
        'mainnet-beta': {
            USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            RPC_ENDPOINTS: [
                'https://api.mainnet-beta.solana.com',
                'https://solana-mainnet.g.alchemy.com/v2/your-key',
                'https://rpc.helius.xyz/?api-key=your-key'
            ],
            EXPLORER: 'https://solscan.io'
        },
        'devnet': {
            USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
            RPC_ENDPOINTS: [
                'https://api.devnet.solana.com'
            ],
            EXPLORER: 'https://solscan.io?cluster=devnet'
        },
        'testnet': {
            USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            RPC_ENDPOINTS: [
                'https://api.testnet.solana.com'
            ],
            EXPLORER: 'https://solscan.io?cluster=testnet'
        }
    },

    // API Configuration
    CONFIG: {
        API_URL: 'https://your-api.example.com',
        MINTER_URL: 'https://your-minter.example.com',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000, // ms
        SUBSCRIPTION_DURATION_DAYS: 30
    },

    // Subscription tiers with duration
    TIERS: {
        basic: {
            name: 'Basic',
            priceSOL: 0.05,
            priceUSDC: 9.99,
            durationDays: 30,
            features: ['HD Streaming', 'Basic Library', 'Mobile Access']
        },
        pro: {
            name: 'Pro',
            priceSOL: 0.1,
            priceUSDC: 19.99,
            durationDays: 30,
            features: ['4K Streaming', 'Full Library', 'Download', 'No Ads']
        },
        creator: {
            name: 'Creator',
            priceSOL: 0.25,
            priceUSDC: 49.99,
            durationDays: 30,
            features: ['Unlimited Upload', 'Monetization', 'Analytics', 'Priority Support']
        }
    },

    // State
    connection: null,
    provider: null,
    currentRpcIndex: 0,

    // Getters for network-specific values
    get USDC_MINT() {
        return this.NETWORKS[this.NETWORK].USDC_MINT;
    },

    get RPC_ENDPOINTS() {
        return this.NETWORKS[this.NETWORK].RPC_ENDPOINTS;
    },

    get EXPLORER_URL() {
        return this.NETWORKS[this.NETWORK].EXPLORER;
    },

    // Switch network (mainnet/devnet/testnet)
    async setNetwork(network) {
        if (!this.NETWORKS[network]) {
            throw new Error(`Invalid network: ${network}. Use 'mainnet-beta', 'devnet', or 'testnet'`);
        }
        this.NETWORK = network;
        this.currentRpcIndex = 0;
        await this.initConnection();
        console.log(`Switched to ${network}`);
    },

    // Initialize
    async init() {
        this.connection = null;
        this.provider = null;

        // Check for wallets
        if (window.solana?.isPhantom) {
            this.provider = window.solana;
        } else if (window.solflare?.isSolflare) {
            this.provider = window.solflare;
        } else if (window.backpack) {
            this.provider = window.backpack;
        }

        await this.initConnection();
        return this;
    },

    // Initialize connection with fallback
    async initConnection() {
        const { Connection } = window.solanaWeb3;

        for (let i = 0; i < this.RPC_ENDPOINTS.length; i++) {
            try {
                const endpoint = this.RPC_ENDPOINTS[i];
                const conn = new Connection(endpoint, 'confirmed');
                await conn.getLatestBlockhash();
                this.connection = conn;
                this.currentRpcIndex = i;
                console.log(`Connected to ${this.NETWORK} RPC:`, endpoint);
                return;
            } catch (error) {
                console.warn(`RPC ${i} failed, trying next...`);
            }
        }
        throw new Error('All RPC endpoints failed');
    },

    // Switch to next RPC
    async switchRpc() {
        this.currentRpcIndex = (this.currentRpcIndex + 1) % this.RPC_ENDPOINTS.length;
        await this.initConnection();
    },

    // Retry wrapper for network operations
    async withRetry(operation, maxRetries = this.CONFIG.MAX_RETRIES) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt < maxRetries) {
                    // Try switching RPC on network errors
                    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
                        await this.switchRpc();
                    }
                    await this.sleep(this.CONFIG.RETRY_DELAY * attempt);
                }
            }
        }
        throw lastError;
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Get available wallets
    getAvailableWallets() {
        const wallets = [];
        if (window.solana?.isPhantom) wallets.push({ name: 'Phantom', provider: window.solana, icon: 'https://phantom.app/img/logo.png' });
        if (window.solflare?.isSolflare) wallets.push({ name: 'Solflare', provider: window.solflare, icon: 'https://solflare.com/favicon.ico' });
        if (window.backpack) wallets.push({ name: 'Backpack', provider: window.backpack, icon: 'https://backpack.app/favicon.ico' });
        return wallets;
    },

    // Connect wallet
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

    // Disconnect wallet
    async disconnectWallet() {
        if (this.provider) {
            try {
                await this.provider.disconnect();
            } catch {}
            this.provider = null;
        }
        return { success: true };
    },

    // Check balance
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

                    return { sufficient: available >= required, available, required, currency: 'USDC' };
                } catch {
                    return { sufficient: false, available: 0, required: tierData.priceUSDC, currency: 'USDC' };
                }
            } else {
                const balance = await this.connection.getBalance(publicKey);
                const available = balance / 1_000_000_000;
                const required = tierData.priceSOL + 0.01;

                return { sufficient: available >= required, available, required, currency: 'SOL' };
            }
        } catch (error) {
            return { sufficient: false, error: error.message };
        }
    },

    // Create Solana Pay URL
    createPaymentURL(tier, payInUSDC = false) {
        const tierData = this.TIERS[tier];
        if (!tierData) throw new Error('Invalid tier');

        const amount = payInUSDC ? tierData.priceUSDC : tierData.priceSOL;
        const token = payInUSDC ? this.USDC_MINT : null;

        let url = `solana:${this.MERCHANT_WALLET}?amount=${amount}`;
        if (token) url += `&spl-token=${token}`;
        url += `&label=Purple%20Squirrel%20Media`;
        url += `&message=${encodeURIComponent(`${tierData.name} Subscription`)}`;
        url += `&memo=${encodeURIComponent(`sub_${tier}_${Date.now()}`)}`;

        return url;
    },

    // Generate QR code data URL
    async generateQRCode(tier, payInUSDC = false, size = 256) {
        const url = this.createPaymentURL(tier, payInUSDC);

        // Use qrcode library if available, otherwise return URL for external generation
        if (typeof QRCode !== 'undefined') {
            try {
                const dataUrl = await QRCode.toDataURL(url, {
                    width: size,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                return { success: true, dataUrl, paymentUrl: url };
            } catch (error) {
                return { success: false, error: error.message, paymentUrl: url };
            }
        }

        // Fallback: return URL for use with external QR service
        return {
            success: true,
            dataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`,
            paymentUrl: url,
            external: true
        };
    },

    // Process payment with retries
    async payWithWallet(tier, payInUSDC = false) {
        const tierData = this.TIERS[tier];
        if (!tierData) {
            return { success: false, error: `Invalid tier: ${tier}` };
        }

        if (!this.provider) {
            return { success: false, error: 'No wallet connected. Please connect a wallet first.' };
        }

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

            const result = await this.withRetry(async () => {
                if (payInUSDC) {
                    return await this.transferSPLToken(publicKey, amount, reference, tier);
                } else {
                    return await this.transferSOL(publicKey, amount, reference, tier);
                }
            });

            return result;
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'Transaction cancelled by user' };
            }
            return { success: false, error: error.message };
        }
    },

    // Transfer SOL
    async transferSOL(fromPubkey, amount, reference, tier) {
        const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3;

        const merchantPubkey = new PublicKey(this.MERCHANT_WALLET);
        const feePubkey = new PublicKey(this.FEE_WALLET);

        const totalLamports = Math.round(amount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(totalLamports * this.FEE_PERCENT);
        const merchantLamports = totalLamports - feeLamports;

        const transaction = new Transaction()
            .add(SystemProgram.transfer({ fromPubkey, toPubkey: merchantPubkey, lamports: merchantLamports }))
            .add(SystemProgram.transfer({ fromPubkey, toPubkey: feePubkey, lamports: feeLamports }));

        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signed = await this.provider.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        const paymentResult = await this.recordPayment(signature, tier, amount, 'SOL');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'SOL',
            fee: feeLamports / LAMPORTS_PER_SOL,
            explorer: `${this.EXPLORER_URL}/tx/${signature}`,
            subscription: paymentResult.subscription
        };
    },

    // Transfer USDC
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

        const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPubkey);
        const merchantTokenAccount = await getAssociatedTokenAddress(usdcMint, merchantPubkey);
        const feeTokenAccount = await getAssociatedTokenAddress(usdcMint, feePubkey);

        const totalAmount = Math.round(amount * 1_000_000);
        const feeAmount = Math.round(totalAmount * this.FEE_PERCENT);
        const merchantAmount = totalAmount - feeAmount;

        const transaction = new Transaction();

        // Create token accounts if needed
        const feeAccountInfo = await this.connection.getAccountInfo(feeTokenAccount);
        if (!feeAccountInfo) {
            transaction.add(createAssociatedTokenAccountInstruction(
                fromPubkey, feeTokenAccount, feePubkey, usdcMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
            ));
        }

        const merchantAccountInfo = await this.connection.getAccountInfo(merchantTokenAccount);
        if (!merchantAccountInfo) {
            transaction.add(createAssociatedTokenAccountInstruction(
                fromPubkey, merchantTokenAccount, merchantPubkey, usdcMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
            ));
        }

        transaction.add(createTransferInstruction(fromTokenAccount, merchantTokenAccount, fromPubkey, merchantAmount, [], TOKEN_PROGRAM_ID));
        transaction.add(createTransferInstruction(fromTokenAccount, feeTokenAccount, fromPubkey, feeAmount, [], TOKEN_PROGRAM_ID));

        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signed = await this.provider.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        const paymentResult = await this.recordPayment(signature, tier, amount, 'USDC');

        return {
            success: true,
            signature,
            tier,
            amount,
            currency: 'USDC',
            fee: feeAmount / 1_000_000,
            explorer: `${this.EXPLORER_URL}/tx/${signature}`,
            subscription: paymentResult.subscription
        };
    },

    // Record payment with subscription tracking
    async recordPayment(signature, tier, amount, currency) {
        const wallet = this.provider.publicKey.toString();
        const tierData = this.TIERS[tier];
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (tierData.durationDays * 24 * 60 * 60 * 1000));

        const subscription = {
            tier,
            wallet,
            signature,
            amount,
            currency,
            startedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            durationDays: tierData.durationDays
        };

        // Store locally
        this.saveSubscription(subscription);

        // Record to backend if configured
        if (this.CONFIG.API_URL && !this.CONFIG.API_URL.includes('example.com')) {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (typeof PSM_AUTH !== 'undefined' && PSM_AUTH.getAuthHeaders) {
                    Object.assign(headers, PSM_AUTH.getAuthHeaders());
                }

                await fetch(`${this.CONFIG.API_URL}/api/v1/payments/record`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ ...subscription })
                });
            } catch (error) {
                console.warn('Failed to record payment to backend:', error);
            }
        }

        // Mint NFT if available
        if (typeof PSM_NFT !== 'undefined') {
            const nftResult = await PSM_NFT.mintMembershipNFT(tier, signature);
            if (nftResult.success) {
                subscription.nftMint = nftResult.nftMint;
                this.saveSubscription(subscription);
            }
        }

        return { subscription };
    },

    // Save subscription to localStorage
    saveSubscription(subscription) {
        const history = this.getSubscriptionHistory();
        history.unshift(subscription);
        localStorage.setItem('psm_subscriptions', JSON.stringify(history.slice(0, 50))); // Keep last 50
        localStorage.setItem('psm_current_subscription', JSON.stringify(subscription));
    },

    // Get subscription history
    getSubscriptionHistory() {
        try {
            return JSON.parse(localStorage.getItem('psm_subscriptions') || '[]');
        } catch {
            return [];
        }
    },

    // Get current subscription
    getCurrentSubscription() {
        try {
            const sub = JSON.parse(localStorage.getItem('psm_current_subscription'));
            if (sub && new Date(sub.expiresAt) > new Date()) {
                return { active: true, ...sub };
            }
            return { active: false, expired: sub };
        } catch {
            return { active: false };
        }
    },

    // Check if subscription is active
    isSubscriptionActive() {
        const sub = this.getCurrentSubscription();
        return sub.active;
    },

    // Generate reference
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

    // Get SOL price
    async getSOLPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch {
            return null;
        }
    },

    // Format prices
    async formatPrices(tier) {
        const tierData = this.TIERS[tier];
        if (!tierData) return null;

        const solPrice = await this.getSOLPrice();

        return {
            sol: `${tierData.priceSOL} SOL`,
            solUSD: solPrice ? `~$${(tierData.priceSOL * solPrice).toFixed(2)}` : null,
            usdc: `$${tierData.priceUSDC} USDC`,
            duration: `${tierData.durationDays} days`
        };
    },

    // Airdrop SOL (devnet only)
    async requestAirdrop(amount = 1) {
        if (this.NETWORK !== 'devnet') {
            return { success: false, error: 'Airdrop only available on devnet' };
        }

        if (!this.provider?.publicKey) {
            return { success: false, error: 'Wallet not connected' };
        }

        try {
            const signature = await this.connection.requestAirdrop(
                this.provider.publicKey,
                amount * 1_000_000_000
            );
            await this.connection.confirmTransaction(signature);
            return { success: true, signature, amount };
        } catch (error) {
            return { success: false, error: error.message };
        }
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

        // Check local subscription first
        const localSub = PSM_PAY.getCurrentSubscription();
        if (localSub.active && localSub.wallet === walletAddress) {
            return { hasMembership: true, tier: localSub.tier, source: 'local' };
        }

        try {
            const checks = [];

            if (this.API_URL && !this.API_URL.includes('example.com')) {
                checks.push(
                    fetch(`${this.API_URL}/api/v1/nft/check?wallet=${walletAddress}`)
                        .then(r => r.json()).catch(() => null)
                );
            }

            if (this.MINTER_URL && !this.MINTER_URL.includes('example.com')) {
                checks.push(
                    fetch(`${this.MINTER_URL}/check-membership?wallet=${walletAddress}`)
                        .then(r => r.json()).catch(() => null)
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
        const wallet = PSM_PAY.provider?.publicKey?.toString();

        if (!wallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        if (!this.MINTER_URL || this.MINTER_URL.includes('example.com')) {
            console.warn('NFT minting not configured');
            return { success: false, error: 'NFT minting not configured' };
        }

        try {
            const verifyRes = await fetch(`${this.MINTER_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: paymentSignature, tier })
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.verified) {
                return { success: false, error: verifyData.error || 'Payment verification failed' };
            }

            const mintRes = await fetch(`${this.MINTER_URL}/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientWallet: wallet, tier, paymentSignature })
            });
            const mintData = await mintRes.json();

            if (!mintData.success) {
                return { success: false, error: mintData.error || 'Minting failed' };
            }

            return {
                success: true,
                nftMint: mintData.nftMint,
                tier: mintData.tier,
                explorer: mintData.explorer || `${PSM_PAY.EXPLORER_URL}/token/${mintData.nftMint}`,
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
