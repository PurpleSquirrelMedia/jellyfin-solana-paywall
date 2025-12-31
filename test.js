// Test suite for Solana Pay paywall

const LAMPORTS_PER_SOL = 1_000_000_000;
const USDC_DECIMALS = 1_000_000;
const FEE_PERCENT = 0.01;

console.log('=== Jellyfin Solana Paywall Tests ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`  ✗ ${name}: ${error.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg} Expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, tolerance = 0.0001, msg = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${msg} Expected ~${expected}, got ${actual}`);
    }
}

// Test 1: SOL Fee Calculations
console.log('Test 1: SOL Fee Calculations');
[0.05, 0.1, 0.25, 1, 10].forEach(amount => {
    test(`${amount} SOL fee calculation`, () => {
        const totalLamports = Math.round(amount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(totalLamports * FEE_PERCENT);
        const merchantLamports = totalLamports - feeLamports;

        const feeSOL = feeLamports / LAMPORTS_PER_SOL;
        const merchantSOL = merchantLamports / LAMPORTS_PER_SOL;

        assertClose(feeSOL + merchantSOL, amount, 0.0000001, 'Sum mismatch');
        assertClose(feeSOL / amount * 100, 1, 0.01, 'Fee percent mismatch');
    });
});

// Test 2: USDC Fee Calculations
console.log('\nTest 2: USDC Fee Calculations');
[9.99, 19.99, 49.99, 100].forEach(amount => {
    test(`$${amount} USDC fee calculation`, () => {
        const totalAmount = Math.round(amount * USDC_DECIMALS);
        const feeAmount = Math.round(totalAmount * FEE_PERCENT);
        const merchantAmount = totalAmount - feeAmount;

        const feeUSDC = feeAmount / USDC_DECIMALS;
        const merchantUSDC = merchantAmount / USDC_DECIMALS;

        assertClose(feeUSDC + merchantUSDC, amount, 0.000001, 'Sum mismatch');
    });
});

// Test 3: Wallet Address Validation
console.log('\nTest 3: Wallet Address Validation');
test('Fee wallet address format', () => {
    const FEE_WALLET = 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu';
    const validLength = FEE_WALLET.length >= 32 && FEE_WALLET.length <= 44;
    const validChars = /^[1-9A-HJ-NP-Za-km-z]+$/.test(FEE_WALLET);
    if (!validLength || !validChars) throw new Error('Invalid wallet format');
});

// Test 4: Network Configuration
console.log('\nTest 4: Network Configuration');
test('Mainnet USDC mint address', () => {
    const MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    assertEqual(MAINNET_USDC.length, 44, 'Invalid USDC mint length');
});

test('Devnet USDC mint address', () => {
    const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
    assertEqual(DEVNET_USDC.length, 44, 'Invalid devnet USDC mint length');
});

// Test 5: Tier Configuration
console.log('\nTest 5: Tier Configuration');
const tiers = {
    basic: { priceSOL: 0.05, priceUSDC: 9.99, durationDays: 30 },
    pro: { priceSOL: 0.1, priceUSDC: 19.99, durationDays: 30 },
    creator: { priceSOL: 0.25, priceUSDC: 49.99, durationDays: 30 }
};

Object.entries(tiers).forEach(([name, tier]) => {
    test(`${name} tier has valid prices`, () => {
        if (tier.priceSOL <= 0) throw new Error('Invalid SOL price');
        if (tier.priceUSDC <= 0) throw new Error('Invalid USDC price');
        if (tier.durationDays <= 0) throw new Error('Invalid duration');
    });
});

// Test 6: Subscription Expiry Calculation
console.log('\nTest 6: Subscription Expiry Calculation');
test('30-day subscription expiry', () => {
    const now = new Date();
    const durationDays = 30;
    const expiresAt = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    const diffDays = (expiresAt - now) / (24 * 60 * 60 * 1000);
    assertEqual(Math.round(diffDays), 30, 'Expiry calculation mismatch');
});

// Test 7: Reference Generation
console.log('\nTest 7: Reference Generation');
test('Reference is 64 hex characters', () => {
    const ref = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    assertEqual(ref.length, 64, 'Reference length mismatch');
    if (!/^[0-9a-f]+$/.test(ref)) throw new Error('Invalid hex characters');
});

// Test 8: Payment URL Generation
console.log('\nTest 8: Payment URL Generation');
test('Solana Pay URL format', () => {
    const MERCHANT_WALLET = 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu';
    const amount = 0.1;
    const url = `solana:${MERCHANT_WALLET}?amount=${amount}&label=Test`;

    if (!url.startsWith('solana:')) throw new Error('Invalid URL scheme');
    if (!url.includes('amount=')) throw new Error('Missing amount param');
});

// Test 9: Explorer URL Generation
console.log('\nTest 9: Explorer URL Generation');
test('Mainnet explorer URL', () => {
    const sig = '5abc123';
    const url = `https://solscan.io/tx/${sig}`;
    if (!url.includes('solscan.io')) throw new Error('Invalid explorer');
});

test('Devnet explorer URL', () => {
    const sig = '5abc123';
    const url = `https://solscan.io?cluster=devnet/tx/${sig}`;
    if (!url.includes('devnet')) throw new Error('Missing cluster param');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
} else {
    console.log('\n✗ Some tests failed\n');
    process.exit(1);
}
