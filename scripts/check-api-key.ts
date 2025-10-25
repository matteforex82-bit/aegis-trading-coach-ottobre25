import { db } from '../lib/db';

const apiKey = 'sk_aegis_cf9f96a097555a51f29bfa88e8dc53df2cea34471e';

async function checkApiKey() {
  console.log('🔍 Checking API key in database...\n');

  // Check if key exists
  const keyRecord = await db.apiKey.findFirst({
    where: {
      key: apiKey,
    },
  });

  if (!keyRecord) {
    console.log('❌ API key NOT found in database!');
    console.log('   Key:', apiKey.substring(0, 20) + '...');
    console.log('\n💡 Solution: Regenerate key from dashboard');
    return;
  }

  console.log('✅ API key found in database!');
  console.log('   ID:', keyRecord.id);
  console.log('   User ID:', keyRecord.userId);
  console.log('   Name:', keyRecord.name);
  console.log('   Active:', keyRecord.isActive);
  console.log('   Created:', keyRecord.createdAt);
  console.log('   Last Used:', keyRecord.lastUsedAt || 'Never');

  // Get user email
  const user = await db.user.findUnique({
    where: { id: keyRecord.userId },
    select: { email: true },
  });
  if (user) {
    console.log('   User Email:', user.email);
  }

  // Check if there's a trading account with this user
  const account = await db.tradingAccount.findFirst({
    where: {
      userId: keyRecord.userId,
      login: '4000072938',
      deletedAt: null,
    },
  });

  if (account) {
    console.log('\n✅ Trading account found!');
    console.log('   Account ID:', account.id);
    console.log('   Login:', account.login);
    console.log('   Broker:', account.broker);
  } else {
    console.log('\n❌ Trading account NOT found for this user!');
    console.log('   Looking for login: 4000072938');
  }
}

checkApiKey()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
