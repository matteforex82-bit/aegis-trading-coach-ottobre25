import { db } from '@/lib/db';

async function deleteAccount() {
  const accountLogin = '4000072938';

  console.log(`🗑️  Deleting account: ${accountLogin}...`);

  const deletedAccount = await db.tradingAccount.delete({
    where: {
      login: accountLogin,
    },
  });

  console.log('✅ Account deleted:', deletedAccount);
  console.log('Now you can retry auto-registration with the EA');

  process.exit(0);
}

deleteAccount().catch((error) => {
  console.error('❌ Error deleting account:', error);
  process.exit(1);
});
