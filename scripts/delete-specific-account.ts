import { db } from '../lib/db'

async function deleteSpecificAccount() {
  try {
    console.log('🗑️  Eliminando account specifico...\n')

    // Delete account with login 1511992067
    const deleted = await db.tradingAccount.deleteMany({
      where: {
        login: '1511992067'
      }
    })

    console.log(`✅ Eliminati ${deleted.count} accounts con login 1511992067`)

    // Verify
    const remaining = await db.tradingAccount.findMany({
      select: {
        login: true,
        broker: true,
      }
    })

    if (remaining.length === 0) {
      console.log('\n✅ Database completamente pulito!')
    } else {
      console.log(`\n⚠️  Ancora ${remaining.length} accounts nel database:`)
      remaining.forEach(acc => {
        console.log(`   - ${acc.login} (${acc.broker})`)
      })
    }

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

deleteSpecificAccount()
