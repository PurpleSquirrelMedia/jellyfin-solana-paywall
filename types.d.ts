// Type definitions for Jellyfin Solana Pay Paywall

declare namespace PSM {
    type Network = 'mainnet-beta' | 'devnet' | 'testnet';
    type TierName = 'basic' | 'pro' | 'creator';
    type Currency = 'SOL' | 'USDC';

    interface Tier {
        name: string;
        priceSOL: number;
        priceUSDC: number;
        durationDays: number;
        features: string[];
    }

    interface NetworkConfig {
        USDC_MINT: string;
        RPC_ENDPOINTS: string[];
        EXPLORER: string;
    }

    interface Config {
        API_URL: string;
        MINTER_URL: string;
        MAX_RETRIES: number;
        RETRY_DELAY: number;
        SUBSCRIPTION_DURATION_DAYS: number;
    }

    interface WalletInfo {
        name: string;
        provider: any;
        icon?: string;
    }

    interface ConnectResult {
        success: boolean;
        error?: string;
        wallet?: string;
        publicKey?: string;
    }

    interface BalanceResult {
        sufficient: boolean;
        available?: number;
        required?: number;
        currency?: Currency;
        error?: string;
    }

    interface PaymentResult {
        success: boolean;
        error?: string;
        signature?: string;
        tier?: TierName;
        amount?: number;
        currency?: Currency;
        fee?: number;
        explorer?: string;
        subscription?: Subscription;
    }

    interface Subscription {
        tier: TierName;
        wallet: string;
        signature: string;
        amount: number;
        currency: Currency;
        startedAt: string;
        expiresAt: string;
        durationDays: number;
        nftMint?: string;
    }

    interface SubscriptionStatus {
        active: boolean;
        tier?: TierName;
        wallet?: string;
        signature?: string;
        amount?: number;
        currency?: Currency;
        startedAt?: string;
        expiresAt?: string;
        durationDays?: number;
        nftMint?: string;
        expired?: Subscription;
    }

    interface QRCodeResult {
        success: boolean;
        dataUrl?: string;
        paymentUrl: string;
        external?: boolean;
        error?: string;
    }

    interface VerifyResult {
        success: boolean;
        confirmed?: boolean;
        slot?: number;
        blockTime?: number;
        fee?: number;
        error?: string;
    }

    interface PriceFormat {
        sol: string;
        solUSD: string | null;
        usdc: string;
        duration: string;
    }

    interface AirdropResult {
        success: boolean;
        signature?: string;
        amount?: number;
        error?: string;
    }

    interface MembershipResult {
        hasMembership: boolean;
        tier?: TierName;
        nftMint?: string;
        source?: string;
        error?: string;
    }

    interface NFTMintResult {
        success: boolean;
        nftMint?: string;
        tier?: TierName;
        explorer?: string;
        metadata?: any;
        error?: string;
    }
}

interface PSM_PAY_Interface {
    // Configuration
    MERCHANT_WALLET: string;
    FEE_WALLET: string;
    FEE_PERCENT: number;
    NETWORK: PSM.Network;
    NETWORKS: Record<PSM.Network, PSM.NetworkConfig>;
    CONFIG: PSM.Config;
    TIERS: Record<PSM.TierName, PSM.Tier>;

    // Computed properties
    readonly USDC_MINT: string;
    readonly RPC_ENDPOINTS: string[];
    readonly EXPLORER_URL: string;

    // State
    connection: any | null;
    provider: any | null;
    currentRpcIndex: number;

    // Methods
    init(): Promise<PSM_PAY_Interface>;
    setNetwork(network: PSM.Network): Promise<void>;
    initConnection(): Promise<void>;
    switchRpc(): Promise<void>;
    withRetry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T>;
    sleep(ms: number): Promise<void>;

    // Wallet
    getAvailableWallets(): PSM.WalletInfo[];
    connectWallet(walletName?: string | null): Promise<PSM.ConnectResult>;
    disconnectWallet(): Promise<{ success: boolean }>;

    // Balance
    checkBalance(payInUSDC?: boolean, tier?: PSM.TierName): Promise<PSM.BalanceResult>;

    // Payments
    createPaymentURL(tier: PSM.TierName, payInUSDC?: boolean): string;
    generateQRCode(tier: PSM.TierName, payInUSDC?: boolean, size?: number): Promise<PSM.QRCodeResult>;
    payWithWallet(tier: PSM.TierName, payInUSDC?: boolean): Promise<PSM.PaymentResult>;
    transferSOL(fromPubkey: any, amount: number, reference: string, tier: PSM.TierName): Promise<PSM.PaymentResult>;
    transferSPLToken(fromPubkey: any, amount: number, reference: string, tier: PSM.TierName): Promise<PSM.PaymentResult>;

    // Subscriptions
    recordPayment(signature: string, tier: PSM.TierName, amount: number, currency: PSM.Currency): Promise<{ subscription: PSM.Subscription }>;
    saveSubscription(subscription: PSM.Subscription): void;
    getSubscriptionHistory(): PSM.Subscription[];
    getCurrentSubscription(): PSM.SubscriptionStatus;
    isSubscriptionActive(): boolean;

    // Utilities
    generateReference(): string;
    verifyPayment(signature: string): Promise<PSM.VerifyResult>;
    getSOLPrice(): Promise<number | null>;
    formatPrices(tier: PSM.TierName): Promise<PSM.PriceFormat | null>;
    requestAirdrop(amount?: number): Promise<PSM.AirdropResult>;
}

interface PSM_NFT_Interface {
    readonly MINTER_URL: string;
    readonly API_URL: string;

    checkMembership(walletAddress: string): Promise<PSM.MembershipResult>;
    mintMembershipNFT(tier: PSM.TierName, paymentSignature: string): Promise<PSM.NFTMintResult>;
    getNFTImage(tier: PSM.TierName): string;
}

declare const PSM_PAY: PSM_PAY_Interface;
declare const PSM_NFT: PSM_NFT_Interface;

declare global {
    interface Window {
        PSM_PAY: PSM_PAY_Interface;
        PSM_NFT: PSM_NFT_Interface;
        solanaWeb3: any;
        splToken: any;
        solana: any;
        solflare: any;
        backpack: any;
        QRCode: any;
    }
}

export { PSM_PAY, PSM_NFT, PSM };
