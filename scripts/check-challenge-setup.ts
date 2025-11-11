import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function checkChallengeSetup() {
  try {
    const account = await db.tradingAccount.findUnique({
      where: { login: '1511992067' },
      include: {
        challengeSetup: true,
      }
    })

    if (!account) {
      console.log('❌ Account not found')
      return
    }

    console.log('\n📊 Account:', account.login)
    console.log('Has Challenge Setup:', !!account.challengeSetup)

    if (account.challengeSetup) {
      const setup = account.challengeSetup
      console.log('\n📋 Challenge Setup:')
      console.log('  ID:', setup.id)
      console.log('  Type:', setup.type)
      console.log('  Status:', setup.status)
      console.log('  Created:', setup.createdAt)

      // Parse YAML data if exists
      if (setup.yamlData) {
        console.log('\n📄 YAML Data exists')
        try {
          const yamlData = JSON.parse(setup.yamlData as string)
          console.log('  YAML Data:', JSON.stringify(yamlData, null, 2))
        } catch (e) {
          console.log('  Raw YAML:', setup.yamlData)
        }
      }

      // Check setup details
      console.log('\n📌 Setup Details:')
      console.log('  Title:', setup.setupTitle)
      console.log('  Analysis:', setup.analysisText?.substring(0, 100) + '...')
    }

    // Check if there are any YAML analyses
    const yamlAnalyses = await db.yAMLAnalysis.findMany({
      where: {
        challengeSetup: {
          accountId: account.id
        }
      },
      include: {
        assets: true,
        tradeOrders: true,
      }
    })

    console.log('\n🔍 YAML Analyses:', yamlAnalyses.length)
    yamlAnalyses.forEach((analysis, index) => {
      console.log(`\n  ${index + 1}. Analysis ID: ${analysis.id}`)
      console.log(`     Status: ${analysis.status}`)
      console.log(`     Assets: ${analysis.assets.length}`)
      console.log(`     Orders: ${analysis.tradeOrders.length}`)

      analysis.tradeOrders.forEach((order, i) => {
        console.log(`       ${i + 1}. ${order.symbol} ${order.direction} ${order.orderType}`)
        console.log(`          Status: ${order.status}, Lots: ${order.lotSize}`)
      })
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkChallengeSetup()