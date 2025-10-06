import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function setupDatabase() {
  console.log('🗄️  Setting up database...\n')

  try {
    // Check if PRISMA_ACCELERATE_URL is set
    if (!process.env.PRISMA_ACCELERATE_URL) {
      console.error('❌ Error: PRISMA_ACCELERATE_URL is not set')
      console.log('\n📝 Please add PRISMA_ACCELERATE_URL to your .env.local file')
      console.log('Get it from: https://cloud.prisma.io\n')
      process.exit(1)
    }

    console.log('✅ Environment variables found')
    console.log('📦 Generating Prisma Client...\n')

    // Generate Prisma Client
    const { stdout: genStdout, stderr: genStderr } = await execAsync('npx prisma generate')
    console.log(genStdout)
    if (genStderr) console.error(genStderr)

    console.log('📤 Pushing database schema...\n')

    // Push schema to database
    const { stdout: pushStdout, stderr: pushStderr } = await execAsync('npx prisma db push --accept-data-loss')
    console.log(pushStdout)
    if (pushStderr) console.error(pushStderr)

    console.log('\n✅ Database setup completed successfully!\n')
    console.log('📋 Next steps:')
    console.log('1. Create an admin user: npm run create-admin')
    console.log('2. Start the dev server: npm run dev\n')
  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  setupDatabase()
}

export { setupDatabase }
