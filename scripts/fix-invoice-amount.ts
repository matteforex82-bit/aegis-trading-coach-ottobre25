/**
 * Quick fix script to correct invoice amount from cents to dollars
 * Multiplies all invoice amounts by 100 to convert from incorrect cents to correct dollars
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const db = new PrismaClient()

async function fixInvoiceAmounts() {
  console.log('\n🔧 Fixing invoice amounts...\n')

  const invoices = await db.invoice.findMany()

  console.log(`Found ${invoices.length} invoice(s)\n`)

  for (const invoice of invoices) {
    const oldAmount = invoice.amount
    const newAmount = oldAmount * 100

    console.log(`Invoice ${invoice.stripeInvoiceId}:`)
    console.log(`  Old: ${oldAmount} ${invoice.currency}`)
    console.log(`  New: ${newAmount} ${invoice.currency}`)

    await db.invoice.update({
      where: { id: invoice.id },
      data: { amount: newAmount },
    })

    console.log(`  ✅ Updated\n`)
  }

  console.log('✅ All invoices fixed!\n')

  await db.$disconnect()
}

fixInvoiceAmounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
