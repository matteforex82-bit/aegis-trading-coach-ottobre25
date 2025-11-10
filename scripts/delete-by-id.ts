import { db } from '../lib/db'

async function deleteById() {
  try {
    console.log('🗑️  Eliminando account per ID...\n')

    // First, check if it exists
    const existing = await db.tradingAccount.findUnique({
      where: { id: 'cmhkq1h2o000dd0fkwcqpxkcq' }
    })

    if (existing) {
      console.log('✓ Account trovato:')
      console.log(`  Login: ${existing.login}`)
      console.log(`  Broker: ${existing.broker}`)
      console.log(`  ID: ${existing.id}`)

      // Delete it
      await db.tradingAccount.delete({
        where: { id: 'cmhkq1h2o000dd0fkwcqpxkcq' }
      })
      console.log('\n✅ Account eliminato!')
    } else {
      console.log('✓ Account non trovato - già eliminato o ID errato')
    }

    // List all remaining accounts
    const all = await db.tradingAccount.findMany({
      select: {
        id: true,
        login: true,
        broker: true,
      }
    })

    console.log(`\n📊 Accounts totali nel database: ${all.length}`)
    if (all.length > 0) {
      all.forEach(acc => {
        console.log(`  - ${acc.login} (${acc.broker}) - ID: ${acc.id}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

deleteById()
