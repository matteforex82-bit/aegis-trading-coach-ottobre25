import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Plan Limits...')

  // Crea o aggiorna i limiti per ogni piano
  await prisma.planLimits.upsert({
    where: { plan: 'FREE' },
    update: {},
    create: {
      plan: 'FREE',
      maxTradingAccounts: 1,
      maxApiKeys: 1,
      maxDataRetentionDays: 7,
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
    },
  })

  await prisma.planLimits.upsert({
    where: { plan: 'STARTER' },
    update: {},
    create: {
      plan: 'STARTER',
      maxTradingAccounts: 1,
      maxApiKeys: 2,
      maxDataRetentionDays: 30,
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
    },
  })

  await prisma.planLimits.upsert({
    where: { plan: 'PRO' },
    update: {},
    create: {
      plan: 'PRO',
      maxTradingAccounts: 5,
      maxApiKeys: 5,
      maxDataRetentionDays: 90,
      advancedAnalytics: true,
      customBranding: false,
      prioritySupport: true,
    },
  })

  await prisma.planLimits.upsert({
    where: { plan: 'ENTERPRISE' },
    update: {},
    create: {
      plan: 'ENTERPRISE',
      maxTradingAccounts: 999,
      maxApiKeys: 999,
      maxDataRetentionDays: 365,
      advancedAnalytics: true,
      customBranding: true,
      prioritySupport: true,
    },
  })

  console.log('✅ Plan limits seeded successfully!')
  console.log('')
  console.log('📊 Summary:')
  console.log('FREE      : 1 account,  1 API key,   7 days retention')
  console.log('STARTER   : 1 account,  2 API keys, 30 days retention')
  console.log('PRO       : 5 accounts, 5 API keys, 90 days retention + analytics')
  console.log('ENTERPRISE: Unlimited accounts and keys, 365 days retention + full features')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding plan limits:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
