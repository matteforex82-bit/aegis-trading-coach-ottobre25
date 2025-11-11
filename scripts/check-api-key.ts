import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function checkApiKey() {
  try {
    console.log('🔍 Checking API Key in production database...\n')

    const targetKey = '0R17ODs8FXp0b5PWpw6g8f4sctavYLI6khnYAN0KH_c'

    // 1. Check trading account
    const account = await db.tradingAccount.findUnique({
      where: { login: '1511992067' },
      include: { user: true }
    })

    if (!account) {
      console.log('❌ Account NOT FOUND')
      return
    }

    console.log('✅ Account found:')
    console.log(`   Login: ${account.login}`)
    console.log(`   User: ${account.user.email}`)
    console.log(`   mt5ApiKey: ${account.mt5ApiKey}`)
    console.log(`   Match: ${account.mt5ApiKey === targetKey ? '✅ YES' : '❌ NO'}`)
    console.log()

    // 2. Check ApiKey table
    console.log('🔑 Checking ApiKey table...')
    const apiKeys = await db.apiKey.findMany({
      where: { userId: account.userId }
    })

    console.log(`   Found ${apiKeys.length} API keys for user:`)
    apiKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name}`)
      console.log(`      Key: ${key.key}`)
      console.log(`      Active: ${key.isActive}`)
      console.log(`      Match: ${key.key === targetKey ? '✅ YES' : '❌ NO'}`)
      console.log(`      Last used: ${key.lastUsedAt || 'Never'}`)
      console.log()
    })

    // 3. Try exact lookup like the endpoint does
    console.log('🔍 Testing exact lookup (like endpoint does)...')
    const exactMatch = await db.apiKey.findFirst({
      where: {
        key: targetKey,
        isActive: true,
      },
    })

    if (exactMatch) {
      console.log('✅ Exact match found!')
      console.log(`   ID: ${exactMatch.id}`)
      console.log(`   Name: ${exactMatch.name}`)
    } else {
      console.log('❌ No exact match found')
      console.log('   This is why the endpoint returns "Invalid or inactive API Key"')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkApiKey()
