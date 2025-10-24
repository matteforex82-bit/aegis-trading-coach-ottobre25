import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // =============================================================================
  // 1. CREATE DEFAULT ADMIN USER
  // =============================================================================

  const adminEmail = 'admin@aegis.com';
  const adminPassword = 'Admin123!'; // Change this in production!

  // Check if admin already exists
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!adminUser) {
    console.log('Creating default admin user...');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'AEGIS Admin',
        role: 'ADMIN',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        emailVerified: new Date(),
      }
    });

    console.log('✅ Admin user created:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
  } else {
    console.log('✅ Admin user already exists');
  }

  // =============================================================================
  // 2. CREATE PLAN LIMITS
  // =============================================================================

  console.log('Creating plan limits...');

  const planLimits = [
    {
      plan: 'FREE',
      maxTradingAccounts: 1,
      maxApiKeys: 1,
      maxDataRetentionDays: 7,
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
    },
    {
      plan: 'STARTER',
      maxTradingAccounts: 1,
      maxApiKeys: 2,
      maxDataRetentionDays: 30,
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
    },
    {
      plan: 'PRO',
      maxTradingAccounts: 5,
      maxApiKeys: 5,
      maxDataRetentionDays: 90,
      advancedAnalytics: true,
      customBranding: false,
      prioritySupport: true,
    },
    {
      plan: 'ENTERPRISE',
      maxTradingAccounts: 999,
      maxApiKeys: 999,
      maxDataRetentionDays: 365,
      advancedAnalytics: true,
      customBranding: true,
      prioritySupport: true,
    },
  ];

  for (const limit of planLimits) {
    await prisma.planLimits.upsert({
      where: { plan: limit.plan as any },
      update: limit,
      create: limit as any,
    });
  }

  console.log('✅ Plan limits created');

  // =============================================================================
  // 3. CREATE DEMO TRADING ACCOUNT FOR ADMIN (OPTIONAL)
  // =============================================================================

  console.log('Creating demo trading account for admin...');

  const demoAccount = await prisma.tradingAccount.upsert({
    where: { login: 'DEMO_ADMIN_12345' },
    update: {},
    create: {
      userId: adminUser.id,
      login: 'DEMO_ADMIN_12345',
      broker: 'ICMarkets',
      server: 'ICMarkets-Demo',
      accountType: 'DEMO',
      status: 'ACTIVE',
      startBalance: 100000,
      currentBalance: 100000,
      equity: 100000,
      currency: 'USD',
      leverage: 30,
      lockMode: 'MEDIUM',
      automationMode: 'MANUAL',
    }
  });

  console.log('✅ Demo trading account created');

  // =============================================================================
  // 4. CREATE SAMPLE TRADING SETUP (OPTIONAL - FOR TESTING)
  // =============================================================================

  console.log('Creating sample Elliott Wave setup...');

  await prisma.tradingSetup.upsert({
    where: { id: 'SETUP_SAMPLE_001' },
    update: {},
    create: {
      id: 'SETUP_SAMPLE_001',
      category: 'FOREX',
      symbol: 'EURUSD',
      direction: 'BUY',
      timeframe: '1D',
      wavePattern: 'Wave 3 Impulse',
      waveCount: '1-2-3-4-5',
      entryPrice: 1.0920,
      stopLoss: 1.0850,
      takeProfit1: 1.1150,
      takeProfit2: 1.1300,
      invalidation: 1.0800,
      analysisDate: new Date(),
      publishedAt: new Date(),
      notes: 'Sample Elliott Wave setup for testing purposes. Wave 3 forming after Wave 2 retracement to 61.8% Fibonacci.',
      isPremium: true,
      requiredPlan: 'PRO',
      isActive: true,
    }
  });

  console.log('✅ Sample trading setup created');

  // =============================================================================
  // SUMMARY
  // =============================================================================

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   - Admin user: admin@aegis.com / Admin123!');
  console.log('   - Plan limits: 4 plans configured');
  console.log('   - Demo account: DEMO_ADMIN_12345');
  console.log('   - Sample setup: EURUSD Wave 3');
  console.log('\n⚠️  Remember to change admin password in production!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
