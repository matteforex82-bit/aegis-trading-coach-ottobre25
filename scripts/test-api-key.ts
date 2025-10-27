import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const API_KEY = process.argv[2]

if (!API_KEY) {
  console.log('❌ Usage: npx tsx scripts/test-api-key.ts <your-api-key>')
  process.exit(1)
}

async function testApiKey() {
  console.log('🔍 Testing API Key:', API_KEY.substring(0, 20) + '...')
  console.log('')

  // Check format
  if (!API_KEY.startsWith('sk_aegis_')) {
    console.log('❌ Invalid format - must start with "sk_aegis_"')
    return
  }
  console.log('✅ Format valid')

  // Get all active API keys
  const apiKeys = await db.apiKey.findMany({
    where: { isActive: true }
  })

  console.log(`📋 Found ${apiKeys.length} active API keys in database`)
  console.log('')

  // Test each one
  let found = false
  for (const key of apiKeys) {
    console.log(`Testing key ${key.id.substring(0, 8)}... (name: ${key.name})`)

    const isValid = await bcrypt.compare(API_KEY, key.key)

    if (isValid) {
      console.log('✅ MATCH FOUND!')
      console.log('   Name:', key.name)
      console.log('   User ID:', key.userId)
      console.log('   Key ID:', key.id)
      console.log('   Created:', key.createdAt)
      console.log('   Last used:', key.lastUsedAt || 'Never')
      found = true
      break
    } else {
      console.log('   ❌ No match')
    }
  }

  if (!found) {
    console.log('')
    console.log('❌ API Key NOT FOUND in database')
    console.log('')
    console.log('Possible issues:')
    console.log('1. The API key was not saved correctly when generated')
    console.log('2. The API key was marked as inactive')
    console.log('3. You copied the wrong key from the dashboard')
    console.log('')
    console.log('Solution: Regenerate a new API key from the dashboard')
  }

  await db.$disconnect()
}

testApiKey().catch(console.error)
