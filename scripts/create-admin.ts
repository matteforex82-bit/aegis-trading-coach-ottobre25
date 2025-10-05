import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...')

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dashboard.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'
    const adminName = process.env.ADMIN_NAME || 'Administrator'

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      console.log('⚠️  User already exists:', adminEmail)

      if (existingAdmin.role !== UserRole.ADMIN) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: UserRole.ADMIN }
        })
        console.log('✅ User promoted to admin!')
      } else {
        console.log('✅ User is already an admin')
      }
      return
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: UserRole.ADMIN
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Password:', adminPassword)
    console.log('👤 ID:', adminUser.id)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Failed:', error)
      process.exit(1)
    })
}

export { createAdminUser }
