import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Carica .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function checkUsers() {
  const users = await prisma.user.findMany()
  console.log('Utenti nel database:')
  console.log(JSON.stringify(users, null, 2))
  await prisma.$disconnect()
}

checkUsers()
