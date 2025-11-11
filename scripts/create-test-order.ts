import { db } from '../lib/db'

async function createTestOrder() {
  try {
    console.log('📝 Creazione ordine di test...\n')

    // 1. Get account
    const account = await db.tradingAccount.findFirst({
      where: { login: '1511992067' },
    })

    if (!account) {
      console.log('❌ Account non trovato!')
      return
    }

    console.log(`✓ Account trovato: ${account.login} (${account.broker})`)

    // 2. Create test order
    const testOrder = await db.tradeOrder.create({
      data: {
        accountId: account.id,
        symbol: 'XAGUSD',
        direction: 'BUY',
        orderType: 'BUY_LIMIT',
        type: 'BUY', // Legacy field - matches direction
        lotSize: 0.10, // 0.10 lots
        entryPrice: 31.000, // Example entry price
        stopLoss: 30.500, // 50 points SL
        takeProfit1: 31.500, // 50 points TP
        takeProfit2: null,
        takeProfit3: null,
        status: 'PENDING', // Starts as PENDING
        comment: 'Test Order - AEGIS',
        magicNumber: 999001,
        riskPercent: 1.0,
        riskAmount: 1000.0, // Required field
        createdAt: new Date(),
      }
    })

    console.log('\n✅ Ordine di test creato!')
    console.log(`   ID: ${testOrder.id}`)
    console.log(`   Symbol: ${testOrder.symbol}`)
    console.log(`   Direction: ${testOrder.direction}`)
    console.log(`   Order Type: ${testOrder.orderType}`)
    console.log(`   Lot Size: ${testOrder.lotSize}`)
    console.log(`   Entry: ${testOrder.entryPrice}`)
    console.log(`   SL: ${testOrder.stopLoss}`)
    console.log(`   TP: ${testOrder.takeProfit1}`)
    console.log(`   Status: ${testOrder.status}`)

    console.log('\n📋 Next Steps:')
    console.log('   1. Vai su Dashboard → Trade Orders')
    console.log('   2. Trova questo ordine nella lista')
    console.log('   3. Click "Esegui MT5"')
    console.log('   4. L\'ordine passerà a status APPROVED')
    console.log('   5. L\'EA lo rileverà e lo eseguirà su MT5')
    console.log('')
    console.log(`   Order ID da cercare: ${testOrder.id}`)

  } catch (error) {
    console.error('❌ Errore:', error)
  } finally {
    await db.$disconnect()
  }
}

createTestOrder()
