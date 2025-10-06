# AEGIS Trading Coach - Quick Deploy Script (PowerShell)
# This script automates the entire deployment process to Vercel

$ErrorActionPreference = "Stop"

Write-Host "🚀 AEGIS Trading Coach - Quick Deploy to Vercel" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelExists = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelExists) {
    Write-Host "❌ Vercel CLI not found" -ForegroundColor Red
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Step 1: Run deployment checks
Write-Host "📋 Step 1/5: Running pre-deployment checks..." -ForegroundColor Cyan
try {
    npm run deploy:check
    Write-Host ""
} catch {
    Write-Host "❌ Deployment checks failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}

# Step 2: Check for uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes" -ForegroundColor Yellow
    $commit = Read-Host "Do you want to commit them? (y/n)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        git add .
        $commitMessage = Read-Host "Enter commit message"
        git commit -m "$commitMessage"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
}
Write-Host ""

# Step 3: Build the project
Write-Host "🔨 Step 2/5: Building the project..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Build failed. Please fix the errors above." -ForegroundColor Red
    exit 1
}

# Step 4: Push to GitHub (if remote exists)
$hasRemote = git remote | Select-String -Pattern "origin"
if ($hasRemote) {
    Write-Host "📤 Step 3/5: Pushing to GitHub..." -ForegroundColor Cyan
    $pushToGitHub = Read-Host "Do you want to push to GitHub? (y/n)"
    if ($pushToGitHub -eq "y" -or $pushToGitHub -eq "Y") {
        try {
            git push origin main
            Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
        } catch {
            try {
                git push origin master
                Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Failed to push to GitHub" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠️  Skipped GitHub push" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No GitHub remote found. Skipping push." -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Deploy to Vercel
Write-Host "🚀 Step 4/5: Deploying to Vercel..." -ForegroundColor Cyan
$deployProd = Read-Host "Deploy to production? (y for production, n for preview)"

if ($deployProd -eq "y" -or $deployProd -eq "Y") {
    Write-Host "Deploying to PRODUCTION..." -ForegroundColor Yellow
    vercel --prod
} else {
    Write-Host "Deploying PREVIEW..." -ForegroundColor Yellow
    vercel
}

Write-Host ""
Write-Host "✅ Step 5/5: Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 Your app is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit your deployment URL"
Write-Host "2. Test the application"
Write-Host "3. Create admin user (if not done yet)"
Write-Host "4. Configure MT5 Expert Advisor"
Write-Host ""
Write-Host "Need help? Check DEPLOYMENT_GUIDE.md"
Write-Host "================================================" -ForegroundColor Cyan
