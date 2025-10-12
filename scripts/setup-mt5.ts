import { generateApiKey } from './generate-api-key'

async function setupMT5() {
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                                                               ║')
  console.log('║     🚀 AEGIS Trading Coach - MT5 Setup Wizard 🚀             ║')
  console.log('║                                                               ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  console.log('This wizard will:')
  console.log('  ✅ Generate a secure API Key for your MT5 Expert Advisor')
  console.log('  ✅ Guide you through the EA configuration')
  console.log('  ✅ Help you test the connection\n')

  console.log('Press Ctrl+C to cancel at any time.\n')
  console.log('Starting in 3 seconds...\n')

  await new Promise(resolve => setTimeout(resolve, 3000))

  // Generate API Key
  await generateApiKey()

  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                    ✅ Setup Complete!                         ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝\n')

  console.log('🎯 What to do next:\n')
  console.log('1. Open MetaTrader 5')
  console.log('2. Press F4 to open MetaEditor')
  console.log('3. Open PropControlExporter.mq5')
  console.log('4. Find line: input string API_KEY = ""')
  console.log('5. Paste your API Key between the quotes')
  console.log('6. Press F7 to compile')
  console.log('7. Go back to MT5 and drag the EA onto any chart')
  console.log('8. Check the Experts tab for "✅ Sync successful!"\n')

  console.log('📚 Need help? Check MT5_INSTALLATION_GUIDE.md\n')
  console.log('🔧 To generate another API Key: npm run generate:api-key\n')
}

setupMT5()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })
