import bcrypt from 'bcryptjs'

async function testBcrypt() {
  const plaintextKey = '0R17ODs8FXp0b5PWpw6g8f4sctavYLI6khnYAN0KH_c'
  const hashedKey = '$2a$12$.47AAAwWT4/UrkZTWg3U3uIECY/Fo.zGpAutf8pCwu8MwwCAOmioi'

  console.log('🧪 Testing bcrypt.compare()...\n')
  console.log(`Plaintext: ${plaintextKey}`)
  console.log(`Hash:      ${hashedKey}`)
  console.log()

  const isMatch = await bcrypt.compare(plaintextKey, hashedKey)

  console.log(`Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`)

  if (!isMatch) {
    console.log('\n⚠️  WARNING: bcrypt.compare() returned false!')
    console.log('This means the hash in the database does not match the plaintext key.')
  }
}

testBcrypt()
