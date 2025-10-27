import { db } from '@/lib/db'

async function listApiKeys() {
  const apiKeys = await db.apiKey.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`📋 Found ${apiKeys.length} active API keys:\n`)

  for (const key of apiKeys) {
    console.log(`Key ID: ${key.id}`)
    console.log(`  Name: ${key.name}`)
    console.log(`  User ID: ${key.userId}`)
    console.log(`  Created: ${key.createdAt.toISOString()}`)
    console.log(`  Last used: ${key.lastUsedAt?.toISOString() || 'Never'}`)
    console.log(`  Hash (first 20 chars): ${key.key.substring(0, 20)}...`)
    console.log('')
  }

  await db.$disconnect()
}

listApiKeys().catch(console.error)
