import { db } from '@/lib/db'

async function findUsers() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`📋 Found ${users.length} users:\n`)

  for (const user of users) {
    console.log(`Email: ${user.email}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Created: ${user.createdAt.toISOString()}`)
    console.log('')
  }

  await db.$disconnect()
}

findUsers().catch(console.error)
