import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function hashApiKey() {
  try {
    console.log('🔐 Hashing API Key in production database...\n')

    const plaintextKey = '0R17ODs8FXp0b5PWpw6g8f4sctavYLI6khnYAN0KH_c'

    // 1. Find the API key record
    const apiKey = await db.apiKey.findFirst({
      where: {
        key: plaintextKey,
        isActive: true,
      },
    })

    if (!apiKey) {
      console.log('❌ API key not found in database')
      return
    }

    console.log('✓ Found API key:', apiKey.name)
    console.log(`  Current key (plaintext): ${apiKey.key.substring(0, 20)}...`)
    console.log()

    // 2. Hash the key
    console.log('🔄 Hashing key with bcrypt...')
    const hashedKey = await bcrypt.hash(plaintextKey, 12)
    console.log(`  Hashed key: ${hashedKey.substring(0, 60)}...`)
    console.log()

    // 3. Update the database
    console.log('💾 Updating database...')
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { key: hashedKey },
    })

    console.log('✅ API key hashed successfully!')
    console.log()
    console.log('📋 Summary:')
    console.log(`   API Key ID: ${apiKey.id}`)
    console.log(`   Name: ${apiKey.name}`)
    console.log(`   Old (plaintext): ${plaintextKey}`)
    console.log(`   New (bcrypt hash): ${hashedKey.substring(0, 60)}...`)
    console.log()
    console.log('💡 The EA will still use the plaintext key:')
    console.log(`   X-API-Key: ${plaintextKey}`)
    console.log('   The endpoint will compare it with bcrypt.compare()')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

hashApiKey()
