import { db } from '../lib/db'

async function resetTradingData() {
  try {
    console.log('🧹 Pulizia database in corso...\n')

    // Delete in correct order to respect foreign key constraints
    console.log('🗑️  Eliminando trade orders...')
    const deletedOrders = await db.tradeOrder.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedOrders.count} trade orders`)

    console.log('🗑️  Eliminando trades...')
    const deletedTrades = await db.trade.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedTrades.count} trades`)

    console.log('🗑️  Eliminando journal entries...')
    const deletedJournal = await db.journalEntry.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedJournal.count} journal entries`)

    console.log('🗑️  Eliminando trading accounts...')
    const deletedAccounts = await db.tradingAccount.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedAccounts.count} trading accounts`)

    console.log('🗑️  Eliminando challenge setups...')
    const deletedChallenges = await db.challengeSetup.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedChallenges.count} challenge setups`)

    console.log('🗑️  Eliminando discipline reports...')
    const deletedDiscipline = await db.disciplineReport.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedDiscipline.count} discipline reports`)

    console.log('🗑️  Eliminando API keys...')
    const deletedApiKeys = await db.apiKey.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedApiKeys.count} API keys`)

    console.log('🗑️  Eliminando alerts...')
    const deletedAlerts = await db.alert.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedAlerts.count} alerts`)

    console.log('🗑️  Eliminando trading setups...')
    const deletedSetups = await db.tradingSetup.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedSetups.count} trading setups`)

    console.log('🗑️  Eliminando YAML analysis...')
    const deletedYaml = await db.yAMLAnalysis.deleteMany({})
    console.log(`   ✅ Eliminati ${deletedYaml.count} YAML analysis`)

    console.log('\n✅ Database pulito con successo!')
    console.log('\n📊 Dati mantenuti:')

    const users = await db.user.count()
    console.log(`   👤 Utenti: ${users}`)

    console.log('\n💡 Ora puoi ricollegare il tuo account MT5 da zero!')

  } catch (error) {
    console.error('❌ Errore durante la pulizia del database:', error)
  } finally {
    await db.$disconnect()
  }
}

resetTradingData()
