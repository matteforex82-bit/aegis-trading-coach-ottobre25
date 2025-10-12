# Deploy automatico su Vercel

Write-Host "Deploy su Vercel in corso..." -ForegroundColor Cyan

# Leggi le variabili da .env.local
$envContent = Get-Content .env.local -Raw
$prismaUrl = ($envContent | Select-String 'PRISMA_ACCELERATE_URL="([^"]+)"').Matches.Groups[1].Value
$nextauthSecret = ($envContent | Select-String 'NEXTAUTH_SECRET="([^"]+)"').Matches.Groups[1].Value

Write-Host "Variabili caricate!" -ForegroundColor Green

# Deploy
vercel --prod -e PRISMA_ACCELERATE_URL="$prismaUrl" -e NEXTAUTH_SECRET="$nextauthSecret" -e NODE_ENV="production" --yes

Write-Host ""
Write-Host "Deploy completato!" -ForegroundColor Green
Write-Host "Copia URL e poi esegui:" -ForegroundColor Yellow
Write-Host "  vercel env add NEXTAUTH_URL production" -ForegroundColor Cyan
Write-Host "  vercel env add NEXT_PUBLIC_APP_URL production" -ForegroundColor Cyan
Write-Host "  vercel --prod" -ForegroundColor Cyan
