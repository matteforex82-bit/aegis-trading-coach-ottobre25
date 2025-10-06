#!/bin/bash

# AEGIS Trading Coach - Quick Deploy Script
# This script automates the entire deployment process to Vercel

set -e  # Exit on error

echo "🚀 AEGIS Trading Coach - Quick Deploy to Vercel"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}"
echo ""

# Step 1: Run deployment checks
echo "📋 Step 1/5: Running pre-deployment checks..."
npm run deploy:check || {
    echo -e "${RED}❌ Deployment checks failed. Please fix the issues above.${NC}"
    exit 1
}
echo ""

# Step 2: Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    read -p "Do you want to commit them? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_message
        git commit -m "$commit_message"
        echo -e "${GREEN}✅ Changes committed${NC}"
    fi
fi
echo ""

# Step 3: Build the project
echo "🔨 Step 2/5: Building the project..."
npm run build || {
    echo -e "${RED}❌ Build failed. Please fix the errors above.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 4: Push to GitHub (if remote exists)
if git remote | grep -q origin; then
    echo "📤 Step 3/5: Pushing to GitHub..."
    read -p "Do you want to push to GitHub? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main || git push origin master
        echo -e "${GREEN}✅ Pushed to GitHub${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipped GitHub push${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No GitHub remote found. Skipping push.${NC}"
fi
echo ""

# Step 5: Deploy to Vercel
echo "🚀 Step 4/5: Deploying to Vercel..."
read -p "Deploy to production? (y for production, n for preview): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying to PRODUCTION..."
    vercel --prod
else
    echo "Deploying PREVIEW..."
    vercel
fi

echo ""
echo -e "${GREEN}✅ Step 5/5: Deployment complete!${NC}"
echo ""
echo "================================================"
echo "🎉 Your app is now live!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your deployment URL"
echo "2. Test the application"
echo "3. Create admin user (if not done yet)"
echo "4. Configure MT5 Expert Advisor"
echo ""
echo "Need help? Check DEPLOYMENT_GUIDE.md"
echo "================================================"
