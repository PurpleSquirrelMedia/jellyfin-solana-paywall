// Test suite for Solana Pay paywall fee calculations

const LAMPORTS_PER_SOL = 1_000_000_000;
const USDC_DECIMALS = 1_000_000;
const FEE_PERCENT = 0.01; // 1%

console.log('=== Jellyfin Solana Paywall Tests ===\n');

// Test 1: SOL fee calculation
function testSOLFeeCalculation() {
    console.log('Test 1: SOL Fee Calculation');

    const testCases = [
        { amount: 0.05, tier: 'Basic' },
        { amount: 0.1, tier: 'Pro' },
        { amount: 0.25, tier: 'Creator' },
        { amount: 1.0, tier: 'Custom 1 SOL' },
    ];

    let passed = true;

    for (const test of testCases) {
        const totalLamports = Math.round(test.amount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(totalLamports * FEE_PERCENT);
        const merchantLamports = totalLamports - feeLamports;

        const feeSOL = feeLamports / LAMPORTS_PER_SOL;
        const merchantSOL = merchantLamports / LAMPORTS_PER_SOL;
        const expectedFee = test.amount * 0.01;

        const feeCorrect = Math.abs(feeSOL - expectedFee) < 0.0000001;
        const sumCorrect = Math.abs((feeSOL + merchantSOL) - test.amount) < 0.0000001;

        if (feeCorrect && sumCorrect) {
            console.log(`  ✓ ${test.tier}: ${test.amount} SOL → Merchant: ${merchantSOL} SOL, Fee: ${feeSOL} SOL`);
        } else {
            console.log(`  ✗ ${test.tier}: FAILED - fee calculation incorrect`);
            passed = false;
        }
    }

    return passed;
}

// Test 2: USDC fee calculation
function testUSDCFeeCalculation() {
    console.log('\nTest 2: USDC Fee Calculation');

    const testCases = [
        { amount: 9.99, tier: 'Basic' },
        { amount: 19.99, tier: 'Pro' },
        { amount: 49.99, tier: 'Creator' },
        { amount: 100.00, tier: 'Custom $100' },
    ];

    let passed = true;

    for (const test of testCases) {
        const totalAmount = Math.round(test.amount * USDC_DECIMALS);
        const feeAmount = Math.round(totalAmount * FEE_PERCENT);
        const merchantAmount = totalAmount - feeAmount;

        const feeUSDC = feeAmount / USDC_DECIMALS;
        const merchantUSDC = merchantAmount / USDC_DECIMALS;

        const sumCorrect = Math.abs((feeUSDC + merchantUSDC) - test.amount) < 0.000001;

        if (sumCorrect) {
            console.log(`  ✓ ${test.tier}: $${test.amount} → Merchant: $${merchantUSDC.toFixed(6)}, Fee: $${feeUSDC.toFixed(6)}`);
        } else {
            console.log(`  ✗ ${test.tier}: FAILED - fee calculation incorrect`);
            passed = false;
        }
    }

    return passed;
}

// Test 3: Verify fee percentages
function testFeePercentages() {
    console.log('\nTest 3: Fee Percentage Verification');

    const amounts = [0.05, 0.1, 0.25, 1, 10, 100];
    let passed = true;

    for (const amount of amounts) {
        const total = Math.round(amount * LAMPORTS_PER_SOL);
        const fee = Math.round(total * FEE_PERCENT);
        const actualPercent = (fee / total) * 100;

        // Allow for tiny rounding differences
        if (Math.abs(actualPercent - 1.0) < 0.01) {
            console.log(`  ✓ ${amount} SOL: Fee is ${actualPercent.toFixed(4)}%`);
        } else {
            console.log(`  ✗ ${amount} SOL: Fee is ${actualPercent.toFixed(4)}% (expected ~1%)`);
            passed = false;
        }
    }

    return passed;
}

// Test 4: Wallet address validation
function testWalletAddress() {
    console.log('\nTest 4: Fee Wallet Address');

    const FEE_WALLET = 'DjaRzzZi94Mq9zJvi23QbB5yRbCSRFENTDDeWicPVxcu';

    // Solana addresses are base58 encoded, 32-44 characters
    const validLength = FEE_WALLET.length >= 32 && FEE_WALLET.length <= 44;
    const validChars = /^[1-9A-HJ-NP-Za-km-z]+$/.test(FEE_WALLET);

    if (validLength && validChars) {
        console.log(`  ✓ Fee wallet address is valid format: ${FEE_WALLET}`);
        return true;
    } else {
        console.log(`  ✗ Fee wallet address invalid`);
        return false;
    }
}

// Run all tests
const results = [
    testSOLFeeCalculation(),
    testUSDCFeeCalculation(),
    testFeePercentages(),
    testWalletAddress(),
];

console.log('\n=== Test Summary ===');
const allPassed = results.every(r => r);
if (allPassed) {
    console.log('✓ All tests passed!\n');
    process.exit(0);
} else {
    console.log('✗ Some tests failed\n');
    process.exit(1);
}
