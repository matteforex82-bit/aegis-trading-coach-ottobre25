import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function generateApiKey() {
  try {
    console.log('🔐 Generating MT5 API Key...\n')

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      console.error('❌ Error: No admin user found.')
      console.log('Please create an admin user first using: npm run create-admin')
      process.exit(1)
    }

    // Generate secure random API key
    const rawKey = 'sk_aegis_' + randomBytes(32).toString('hex')

    // Hash the key for secure storage
    const hashedKey = await bcrypt.hash(rawKey, 12)

    // Get account name from user input or use default
    const accountName = process.argv[2] || 'MT5 Account'

    // Save to database
    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        userId: adminUser.id,
        name: accountName,
        isActive: true,
      }
    })

    console.log('✅ API Key generated successfully!\n')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('⚠️  IMPORTANT: Save this key securely!')
    console.log('⚠️  You will NOT be able to see it again!\n')
    console.log('📋 API Key Details:')
    console.log(`   Name: ${apiKey.name}`)
    console.log(`   Created: ${apiKey.createdAt.toISOString()}`)
    console.log(`   User: ${adminUser.email}\n`)
    console.log('🔑 API Key (copy this):')
    console.log(`\n   ${rawKey}\n`)
    console.log('═══════════════════════════════════════════════════════════════\n')

    console.log('📝 Next Steps:')
    console.log('1. Copy the API key above')
    console.log('2. Open MetaEditor and edit PropControlExporter.mq5')
    console.log('3. Find line: input string API_KEY = ""')
    console.log('4. Replace with: input string API_KEY = "' + rawKey + '"')
    console.log('5. Press F7 to compile')
    console.log('6. Restart EA on your MT5 chart')
    console.log('7. Check logs for "✅ Sync successful!"\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  generateApiKey()
    .then(() => {
      console.log('🎉 Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Failed:', error)
      process.exit(1)
    })
}

export { generateApiKey }
