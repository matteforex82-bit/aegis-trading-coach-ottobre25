import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.PRISMA_ACCELERATE_URL
    }
  }
})

async function debugOrderExecution() {
  try {
    console.log('🔍 DEBUG: Order Execution System\n')
    console.log('============================================================')

    // 1. Check trading account
    const account = await db.tradingAccount.findFirst({
      where: { login: '1511992067' },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    if (!account) {
      console.log('❌ Account 1511992067 NOT FOUND!')
      return
    }

    console.log('\n📊 ACCOUNT INFO:')
    console.log(`  Login: ${account.login}`)
    console.log(`  Broker: ${account.broker}`)
    console.log(`  User: ${account.user.name} (${account.user.email})`)
    console.log(`  MT5 API Key: ${account.mt5ApiKey}`)
    console.log(`  Account ID: ${account.id}`)

    // 2. Check if there are API Keys in the ApiKey table
    const apiKeys = await db.apiKey.findMany({
      where: { userId: account.userId },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
      }
    })

    console.log(`\n🔑 API KEYS (ApiKey table): ${apiKeys.length} found`)
    apiKeys.forEach((key, i) => {
      console.log(`  ${i + 1}. ${key.name}`)
      console.log(`     Key: ${key.key.substring(0, 20)}...`)
      console.log(`     Active: ${key.isActive}`)
      console.log(`     Last used: ${key.lastUsedAt || 'Never'}`)
    })

    // 3. Check trade orders
    const orders = await db.tradeOrder.findMany({
      where: { accountId: account.id },
      select: {
        id: true,
        symbol: true,
        direction: true,
        orderType: true,
        lotSize: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit1: true,
        status: true,
        mt5Status: true,
        mt5Ticket: true,
        createdAt: true,
        executedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log(`\n📋 TRADE ORDERS: ${orders.length} found (last 10)`)
    if (orders.length === 0) {
      console.log('  No orders found')
    } else {
      orders.forEach((order, i) => {
        console.log(`\n  ${i + 1}. ${order.symbol} ${order.direction} ${order.orderType}`)
        console.log(`     Lot Size: ${order.lotSize}`)
        console.log(`     Entry: ${order.entryPrice}`)
        console.log(`     SL: ${order.stopLoss} | TP: ${order.takeProfit1}`)
        console.log(`     Status: ${order.status}`)
        console.log(`     MT5 Status: ${order.mt5Status || 'null'}`)
        console.log(`     MT5 Ticket: ${order.mt5Ticket || 'null'}`)
        console.log(`     Created: ${order.createdAt}`)
        console.log(`     Executed: ${order.executedAt || 'null'}`)
      })
    }

    // 4. Get APPROVED orders
    const approvedOrders = orders.filter(o => o.status === 'APPROVED')
    console.log(`\n⚡ APPROVED ORDERS (ready for MT5): ${approvedOrders.length}`)
    if (approvedOrders.length > 0) {
      console.log('  These should be picked up by EA:')
      approvedOrders.forEach(o => {
        console.log(`    - ${o.symbol} ${o.direction} ${o.lotSize} lots`)
      })
    }

    // 5. Check which endpoint EA should use
    console.log('\n🔧 ENDPOINT CONFIGURATION:')
    console.log('  EA should poll: /api/trade-orders/pending/1511992067')
    console.log('  With header: X-API-Key: <API_KEY>')
    console.log('')
    console.log('⚠️  PROBLEM DETECTED:')
    console.log('  The endpoint /api/trade-orders/pending/[login] expects ApiKey table')
    console.log('  But account.mt5ApiKey is stored separately!')
    console.log('')
    console.log('💡 SOLUTION:')
    if (apiKeys.length === 0) {
      console.log('  1. Create ApiKey record matching mt5ApiKey')
      console.log('  2. OR modify endpoint to use account.mt5ApiKey')
    } else {
      console.log('  Use this API Key in EA settings:')
      console.log(`     ${apiKeys[0].key}`)
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

debugOrderExecution()
