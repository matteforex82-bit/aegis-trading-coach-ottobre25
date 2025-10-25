import { db } from '../lib/db';

const apiKey = 'sk_aegis_593bac06f1998d5da3db2f09aa8b308ade5129b43ab89f1b49c2c2b3b90ee3e7';
const accountLogin = '4000072938';

async function insertApiKey() {
  console.log('🔧 Manually inserting API key...\n');

  // Find the admin user
  const user = await db.user.findFirst({
    where: {
      email: 'admin@dashboard.com',
    },
  });

  if (!user) {
    console.log('❌ Admin user not found!');
    return;
  }

  console.log('✅ Found user:', user.email);
  console.log('   User ID:', user.id);

  // Check if key already exists
  const existing = await db.apiKey.findFirst({
    where: { key: apiKey },
  });

  if (existing) {
    console.log('\n⚠️  Key already exists!');
    console.log('   Updating to active...');
    await db.apiKey.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    console.log('✅ Key activated!');
    return;
  }

  // Create new API key
  const newKey = await db.apiKey.create({
    data: {
      userId: user.id,
      name: `MT5-${accountLogin}`,
      key: apiKey,
      isActive: true,
    },
  });

  console.log('\n✅ API Key inserted successfully!');
  console.log('   ID:', newKey.id);
  console.log('   Name:', newKey.name);
  console.log('   Active:', newKey.isActive);
  console.log('   Created:', newKey.createdAt);

  // Verify account exists
  const account = await db.tradingAccount.findFirst({
    where: {
      userId: user.id,
      login: accountLogin,
    },
  });

  if (account) {
    console.log('\n✅ Trading account verified:');
    console.log('   Account ID:', account.id);
    console.log('   Login:', account.login);
    console.log('   Broker:', account.broker);
  } else {
    console.log('\n⚠️  Trading account not found for this user!');
    console.log('   Please create account for login:', accountLogin);
  }
}

insertApiKey()
  .then(() => {
    console.log('\n🎉 Done! EA should now connect successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
