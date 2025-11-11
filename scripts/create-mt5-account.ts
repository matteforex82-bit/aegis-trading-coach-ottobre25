import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_ACCELERATE_URL
    }
  }
})

async function createMT5Account() {
  try {
    console.log('🚀 Creazione account MT5...\n')

    // Get admin user
    const adminUser = await db.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!adminUser) {
      console.error('❌ Nessun utente trovato!')
      return
    }

    console.log(`✓ Admin trovato: ${adminUser.email}`)

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('base64url')

    // Create account
    const account = await db.tradingAccount.create({
      data: {
        userId: adminUser.id,
        login: '1511992067',
        broker: 'FTMO Global Markets Ltd',
        server: 'FTMO-Demo',
        accountType: 'LIVE',
        status: 'ACTIVE',
        currency: 'USD',
        startBalance: 100000,
        currentBalance: 100000,
        profit: 0,
        drawdown: 0,
        lastSyncAt: new Date(),
        mt5ApiKey: apiKey,
      }
    })

    console.log('\n✅ Account creato con successo!')
    console.log('\n📋 Dettagli:')
    console.log(`   Login: ${account.login}`)
    console.log(`   Broker: ${account.broker}`)
    console.log(`   Server: ${account.server}`)
    console.log(`\n🔑 API KEY:`)
    console.log(`   ${apiKey}`)
    console.log('\n📝 Copia questa API key e incollala nell\'EA in MT5!')

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

createMT5Account()
