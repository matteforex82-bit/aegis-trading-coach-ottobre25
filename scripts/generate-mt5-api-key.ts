/**
 * Generate MT5 API Key
 *
 * Script to generate a secure API key for MT5 Expert Advisor authentication
 * Usage: npx tsx scripts/generate-mt5-api-key.ts <accountLogin>
 */

import { db as prisma } from '../lib/db';
import crypto from 'crypto';

function generateApiKey(): string {
  // Generate 32 bytes of random data and convert to base64
  // Format: aegis_mt5_[random32bytes]
  const randomBytes = crypto.randomBytes(32);
  const base64 = randomBytes.toString('base64url'); // URL-safe base64
  return `aegis_mt5_${base64}`;
}

async function main() {
  const accountLogin = process.argv[2];

  if (!accountLogin) {
    console.error('❌ Error: Missing account login');
    console.error('Usage: npx tsx scripts/generate-mt5-api-key.ts <accountLogin>');
    process.exit(1);
  }

  console.log('=======================================================');
  console.log('🔑 MT5 API KEY GENERATOR');
  console.log('=======================================================');
  console.log(`Account Login: ${accountLogin}`);
  console.log('');

  // Find the account
  const account = await prisma.tradingAccount.findUnique({
    where: { login: accountLogin },
    include: { user: true },
  });

  if (!account) {
    console.error(`❌ Error: Account with login "${accountLogin}" not found`);
    process.exit(1);
  }

  console.log(`✅ Account found:`);
  console.log(`   ID: ${account.id}`);
  console.log(`   Broker: ${account.broker}`);
  console.log(`   User: ${account.user.email}`);
  console.log('');

  // Check if API key already exists
  if (account.mt5ApiKey) {
    console.log('⚠️  WARNING: This account already has an API key');
    console.log(`   Current key: ${account.mt5ApiKey.substring(0, 20)}...`);
    console.log('');
    console.log('Do you want to regenerate? (This will invalidate the old key)');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Generate new API key
  const newApiKey = generateApiKey();

  console.log('🔐 Generating new API key...');
  console.log('');

  // Update account with new API key
  const updatedAccount = await prisma.tradingAccount.update({
    where: { id: account.id },
    data: { mt5ApiKey: newApiKey },
  });

  console.log('✅ API Key generated successfully!');
  console.log('');
  console.log('=======================================================');
  console.log('🔑 YOUR MT5 API KEY');
  console.log('=======================================================');
  console.log('');
  console.log(newApiKey);
  console.log('');
  console.log('=======================================================');
  console.log('📋 NEXT STEPS');
  console.log('=======================================================');
  console.log('');
  console.log('1. Copy the API key above');
  console.log('2. Open MT5 and attach AegisExecutionController.mq5 to a chart');
  console.log('3. In EA properties, set:');
  console.log(`   - API_KEY: ${newApiKey}`);
  console.log(`   - API_URL: https://aegis-trading-coach.vercel.app`);
  console.log('4. Enable auto-trading in MT5');
  console.log('5. Make sure WebRequest is allowed for the API URL');
  console.log('');
  console.log('⚠️  SECURITY WARNING:');
  console.log('   - Keep this API key secret!');
  console.log('   - Do not share it or commit it to version control');
  console.log('   - If compromised, regenerate immediately using this script');
  console.log('');
  console.log('=======================================================');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
