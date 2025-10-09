# AEGIS Trading Coach - Quick Deploy
$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying AEGIS Trading Coach to Vercel..." -ForegroundColor Cyan
Write-Host ""

# Check Vercel CLI
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

Write-Host "✅ Vercel CLI ready" -ForegroundColor Green
Write-Host ""

# Build check
Write-Host "🔨 Building project..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Push to GitHub
$remote = git remote 2>$null
if ($remote -match "origin") {
    $push = Read-Host "Push to GitHub first? (y/n)"
    if ($push -eq "y") {
        git add .
        $msg = Read-Host "Commit message"
        git commit -m "$msg"
        git push origin main
        Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
    }
}

Write-Host ""

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
$prod = Read-Host "Production deploy? (y/n)"

if ($prod -eq "y") {
    vercel --prod
} else {
    vercel
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add environment variables in Vercel dashboard"
Write-Host "2. Update NEXTAUTH_URL with your Vercel domain"
Write-Host "3. Redeploy after updating env vars"
Write-Host ""
Write-Host "See DEPLOY_ADESSO.md for details" -ForegroundColor Yellow
