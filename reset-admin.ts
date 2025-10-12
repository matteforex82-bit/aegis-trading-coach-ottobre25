import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdmin() {
  try {
    console.log('🔄 Resetting admin password...')

    const email = 'admin@dashboard.com'
    const newPassword = 'Admin123!'

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Aggiorna l'utente esistente
    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('✅ Password reset successfully!')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', newPassword)
    console.log('👤 User ID:', user.id)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdmin()
