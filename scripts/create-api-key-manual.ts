import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const USER_EMAIL = process.argv[2]
const KEY_NAME = process.argv[3] || 'Manual MT5 Key'

if (!USER_EMAIL) {
  console.log('❌ Usage: npx tsx scripts/create-api-key-manual.ts <user-email> [key-name]')
  process.exit(1)
}

async function createApiKey() {
  // Find user
  const user = await db.user.findUnique({
    where: { email: USER_EMAIL }
  })

  if (!user) {
    console.log(`❌ User not found: ${USER_EMAIL}`)
    await db.$disconnect()
    return
  }

  console.log(`✅ Found user: ${user.name} (${user.email})`)
  console.log('')

  // Generate new API key
  const rawKey = 'sk_aegis_' + randomBytes(32).toString('hex')
  console.log('🔑 Generated raw key:', rawKey)
  console.log('')

  // Hash it properly
  console.log('🔐 Hashing with bcrypt (salt rounds: 12)...')
  const hashedKey = await bcrypt.hash(rawKey, 12)
  console.log('✅ Hashed successfully')
  console.log('   Hash preview:', hashedKey.substring(0, 30) + '...')
  console.log('')

  // Save to database
  const apiKey = await db.apiKey.create({
    data: {
      key: hashedKey,
      userId: user.id,
      name: KEY_NAME,
      isActive: true,
    }
  })

  console.log('✅ API Key saved to database!')
  console.log('   ID:', apiKey.id)
  console.log('   Name:', apiKey.name)
  console.log('   Created:', apiKey.createdAt.toISOString())
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  COPY THIS API KEY NOW - IT WILL NOT BE SHOWN AGAIN!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(rawKey)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Next steps:')
  console.log('1. Copy the key above')
  console.log('2. Paste it in your MT5 EA settings (API_KEY parameter)')
  console.log('3. Restart the EA')

  await db.$disconnect()
}

createApiKey().catch(console.error)
