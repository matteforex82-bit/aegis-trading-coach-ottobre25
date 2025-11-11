import { db } from '../lib/db'

async function updateApiKey() {
  try {
    const oldKey = '0R17ODs8FXp0b5PWpw6g8f4sctavYLI6khnYAN0KH_c'

    console.log('🔄 Aggiornamento API key account...\n')

    // Find account
    const account = await db.tradingAccount.findFirst({
      where: { login: '1511992067' }
    })

    if (!account) {
      console.log('❌ Account non trovato!')
      return
    }

    console.log(`✓ Account trovato: ${account.login}`)
    console.log(`  Current API Key: ${account.mt5ApiKey?.substring(0, 40)}...`)

    // Update to old key
    await db.tradingAccount.update({
      where: { id: account.id },
      data: {
        mt5ApiKey: oldKey
      }
    })

    console.log(`\n✅ API Key aggiornata!`)
    console.log(`  New API Key: ${oldKey.substring(0, 40)}...`)
    console.log('\n💡 Questa key corrisponde a quella configurata nell\'EA')

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

updateApiKey()
