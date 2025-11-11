import { db } from '../lib/db'

async function checkSystemStatus() {
  try {
    console.log('🔍 AEGIS System Status Check\n')
    console.log('============================================================\n')

    // 1. Check accounts
    const accounts = await db.tradingAccount.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    console.log(`📊 Trading Accounts: ${accounts.length}`)
    accounts.forEach((acc, i) => {
      console.log(`\n   ${i + 1}. ${acc.login} - ${acc.broker}`)
      console.log(`      User: ${acc.user.name} (${acc.user.email})`)
      console.log(`      Status: ${acc.status}`)
      console.log(`      API Key: ${acc.mt5ApiKey?.substring(0, 40)}...`)
    })

    if (accounts.length === 0) {
      console.log('   ❌ No accounts found!')
      return
    }

    // 2. Check orders for first account
    const firstAccount = accounts[0]
    const orders = await db.tradeOrder.findMany({
      where: { accountId: firstAccount.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log(`\n\n📋 Trade Orders (last 10): ${orders.length}`)
    if (orders.length === 0) {
      console.log('   No orders yet - create one with: npm run create-test-order')
    } else {
      orders.forEach((order, i) => {
        console.log(`\n   ${i + 1}. ${order.symbol} ${order.direction} ${order.orderType}`)
        console.log(`      Lot Size: ${order.lotSize}`)
        console.log(`      Entry: ${order.entryPrice} | SL: ${order.stopLoss} | TP: ${order.takeProfit1}`)
        console.log(`      Status: ${order.status}`)
        console.log(`      MT5 Ticket: ${order.mt5Ticket || 'Not executed yet'}`)
        console.log(`      Created: ${order.createdAt}`)
      })
    }

    // 3. Count by status
    const statusCounts = await db.tradeOrder.groupBy({
      by: ['status'],
      where: { accountId: firstAccount.id },
      _count: true,
    })

    console.log('\n\n📈 Orders by Status:')
    statusCounts.forEach(s => {
      console.log(`   ${s.status}: ${s._count}`)
    })

    // 4. Check API Keys table
    const apiKeys = await db.apiKey.findMany({
      where: { userId: firstAccount.userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
      }
    })

    console.log(`\n\n🔑 API Keys (ApiKey table): ${apiKeys.length}`)
    if (apiKeys.length === 0) {
      console.log('   ⚠️  No API keys in ApiKey table!')
      console.log('   This is OK if using mt5ApiKey from TradingAccount')
    } else {
      apiKeys.forEach((key, i) => {
        console.log(`   ${i + 1}. ${key.name} - Active: ${key.isActive}`)
        console.log(`      Last used: ${key.lastUsedAt || 'Never'}`)
      })
    }

    console.log('\n\n✅ System Status Check Complete!')
    console.log('============================================================\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkSystemStatus()
