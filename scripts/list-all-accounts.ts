import { db } from '../lib/db'

async function listAccounts() {
  try {
    const accounts = await db.tradingAccount.findMany({
      select: {
        id: true,
        login: true,
        broker: true,
        server: true,
        mt5ApiKey: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          }
        }
      }
    })

    console.log(`\n📊 Trading Accounts: ${accounts.length}\n`)

    if (accounts.length === 0) {
      console.log('❌ No accounts found in database!')
    } else {
      accounts.forEach((acc, i) => {
        console.log(`${i + 1}. Login: ${acc.login}`)
        console.log(`   Broker: ${acc.broker}`)
        console.log(`   Server: ${acc.server}`)
        console.log(`   Status: ${acc.status}`)
        console.log(`   User: ${acc.user.name} (${acc.user.email})`)
        console.log(`   MT5 API Key: ${acc.mt5ApiKey?.substring(0, 30)}...`)
        console.log(`   Created: ${acc.createdAt}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

listAccounts()
