import { db } from '../lib/db'

async function syncApiKeyTable() {
  try {
    console.log('🔄 Sincronizzazione ApiKey table...\n')

    // Get account
    const account = await db.tradingAccount.findFirst({
      where: { login: '1511992067' },
      include: { user: true }
    })

    if (!account) {
      console.log('❌ Account non trovato!')
      return
    }

    console.log(`✓ Account: ${account.login}`)
    console.log(`✓ User: ${account.user.email}`)
    console.log(`✓ mt5ApiKey: ${account.mt5ApiKey?.substring(0, 40)}...\n`)

    // Check if ApiKey already exists
    const existingKey = await db.apiKey.findFirst({
      where: {
        userId: account.userId,
        key: account.mt5ApiKey!
      }
    })

    if (existingKey) {
      console.log('✅ ApiKey già presente nella tabella!')
      console.log(`   Name: ${existingKey.name}`)
      console.log(`   Active: ${existingKey.isActive}`)
      return
    }

    // Create ApiKey record
    const apiKey = await db.apiKey.create({
      data: {
        userId: account.userId,
        key: account.mt5ApiKey!, // Store the SAME key
        name: `MT5 API Key - ${account.login}`,
        isActive: true,
      }
    })

    console.log('✅ ApiKey creata nella tabella!')
    console.log(`   ID: ${apiKey.id}`)
    console.log(`   Name: ${apiKey.name}`)
    console.log(`   Key: ${apiKey.key.substring(0, 40)}...`)
    console.log('\n💡 Ora l\'endpoint /api/trade-orders/pending/[login] funzionerà!')

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

syncApiKeyTable()
