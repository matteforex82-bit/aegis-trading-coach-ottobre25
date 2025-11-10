import { db } from '../lib/db'

async function checkAccounts() {
  try {
    console.log('🔍 Verificando trading accounts nel database...\n')

    const accounts = await db.tradingAccount.findMany({
      select: {
        id: true,
        login: true,
        broker: true,
        server: true,
        accountType: true,
        createdAt: true,
      }
    })

    if (accounts.length === 0) {
      console.log('✅ Nessun trading account trovato - database pulito!')
    } else {
      console.log(`⚠️  Trovati ${accounts.length} trading accounts:\n`)

      accounts.forEach((acc, index) => {
        console.log(`${index + 1}. Login: ${acc.login}`)
        console.log(`   Broker: ${acc.broker}`)
        console.log(`   Server: ${acc.server}`)
        console.log(`   Type: ${acc.accountType}`)
        console.log(`   Created: ${acc.createdAt}`)
        console.log(`   ID: ${acc.id}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

checkAccounts()
