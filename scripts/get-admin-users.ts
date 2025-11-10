import { db } from '../lib/db'

async function getAdminUsers() {
  try {
    console.log('🔍 Cercando utenti admin nel database...\n')

    const adminUsers = await db.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
      }
    })

    if (adminUsers.length === 0) {
      console.log('❌ Nessun utente admin trovato nel database.')
      console.log('\n💡 Puoi crearne uno con: npm run create-admin')
    } else {
      console.log(`✅ Trovati ${adminUsers.length} utenti admin:\n`)

      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Plan: ${user.plan}`)
        console.log(`   Created: ${user.createdAt}`)
        console.log('')
      })

      console.log('ℹ️  Nota: Le password sono hashate e non possono essere visualizzate.')
      console.log('ℹ️  Se hai dimenticato la password, puoi creare un nuovo admin con: npm run create-admin')
    }
  } catch (error) {
    console.error('❌ Errore durante la query:', error)
  } finally {
    await db.$disconnect()
  }
}

getAdminUsers()
