# Script automatico per deploy su Vercel con tutte le variabili d'ambiente

Write-Host "🚀 AEGIS Trading Coach - Deploy Automatico su Vercel" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Leggi le variabili da .env.local
$envContent = Get-Content .env.local -Raw

# Estrai i valori
$prismaUrl = ($envContent | Select-String 'PRISMA_ACCELERATE_URL="([^"]+)"').Matches.Groups[1].Value
$nextauthSecret = ($envContent | Select-String 'NEXTAUTH_SECRET="([^"]+)"').Matches.Groups[1].Value

Write-Host "✅ Variabili caricate da .env.local" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Configurazione Deploy:" -ForegroundColor Yellow
Write-Host "  - Database: Prisma Cloud" -ForegroundColor White
Write-Host "  - Auth: NextAuth configurato" -ForegroundColor White
Write-Host "  - Framework: Next.js 15" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Eseguo deploy con Vercel CLI..." -ForegroundColor Cyan
Write-Host ""

# Deploy con tutte le variabili d'ambiente
vercel --prod `
  -e PRISMA_ACCELERATE_URL="$prismaUrl" `
  -e NEXTAUTH_SECRET="$nextauthSecret" `
  -e NODE_ENV="production" `
  --yes

Write-Host ""
Write-Host "✅ Deploy completato!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 IMPORTANTE: Dopo il deploy, devi fare UNA VOLTA:" -ForegroundColor Yellow
Write-Host "  1. Copia l'URL che Vercel ti ha dato (es: https://tuo-progetto.vercel.app)" -ForegroundColor White
Write-Host "  2. Esegui questo comando:" -ForegroundColor White
Write-Host ""
Write-Host "     vercel env add NEXTAUTH_URL production" -ForegroundColor Cyan
Write-Host "     (incolla il tuo URL quando richiesto)" -ForegroundColor White
Write-Host ""
Write-Host "     vercel env add NEXT_PUBLIC_APP_URL production" -ForegroundColor Cyan
Write-Host "     (incolla lo stesso URL quando richiesto)" -ForegroundColor White
Write-Host ""
Write-Host "  3. Rideploya con: vercel --prod" -ForegroundColor White
Write-Host ""
