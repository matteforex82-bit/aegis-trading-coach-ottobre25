import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function checkOrdersStatus() {
  try {
    const orders = await db.tradeOrder.findMany({
      where: {
        account: {
          login: '1511992067'
        }
      },
      select: {
        id: true,
        symbol: true,
        status: true,
        mt5Status: true,
        lotSize: true,
        direction: true,
        orderType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📋 Found ${orders.length} orders:\n`)

    orders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.symbol} ${order.direction} ${order.orderType}`)
      console.log(`   ID: ${order.id}`)
      console.log(`   Status: ${order.status}`)
      console.log(`   MT5 Status: ${order.mt5Status || 'null'}`)
      console.log(`   Lot Size: ${order.lotSize}`)
      console.log(`   Created: ${order.createdAt}`)
      console.log()
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkOrdersStatus()
