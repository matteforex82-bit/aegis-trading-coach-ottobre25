# ⚡ AEGIS Trading Coach - Quick Start

## 🚀 Deploy in 3 Commands

### Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm i -g vercel`)
- Prisma Cloud account (https://cloud.prisma.io)

---

## 📦 Option 1: Automated Deploy (Recommended)

### Windows (PowerShell)
```powershell
# Run the automated deployment script
.\scripts\quick-deploy.ps1
```

### Linux/Mac (Bash)
```bash
# Make script executable
chmod +x scripts/quick-deploy.sh

# Run the automated deployment script
./scripts/quick-deploy.sh
```

**That's it!** The script will:
- ✅ Check your setup
- ✅ Build the project
- ✅ Push to GitHub
- ✅ Deploy to Vercel

---

## 🛠️ Option 2: Manual Deploy (Step by Step)

### Step 1: Setup Environment
```bash
# Copy environment template
cp .env.example .env.local

# Generate NextAuth secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env.local and add:
# - PRISMA_ACCELERATE_URL (from Prisma Cloud)
# - NEXTAUTH_SECRET (generated above)
# - NEXTAUTH_URL=http://localhost:3000
```

### Step 2: Setup Database
```bash
# One command to setup everything
npm run setup:db
```

### Step 3: Deploy to Vercel
```bash
# Check if ready to deploy
npm run deploy:check

# Deploy to production
vercel --prod
```

---

## 🎯 Post-Deployment

### Create Admin User
```bash
# Method 1: Environment variables
ADMIN_EMAIL="your@email.com" ADMIN_PASSWORD="SecurePass123!" npm run create-admin

# Method 2: Interactive (will prompt for details)
npm run create-admin
```

### Test Your Deployment
```bash
# Health check
curl https://your-app.vercel.app/api/health

# Should return: {"status":"ok","timestamp":"...","service":"AEGIS Trading Coach API"}
```

---

## 📱 Access Your App

1. **Open your browser**
   - Go to: `https://your-app.vercel.app`

2. **Sign In**
   - Use admin credentials you created
   - Or create new account at `/auth/signup`

3. **Configure MT5**
   - Copy `PropControlExporter.mq5` to MT5
   - Set API_URL to your Vercel URL
   - Enable WebRequest in MT5 settings

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database
npm run setup:db         # Setup database from scratch
npm run db:studio        # Open Prisma Studio GUI

# Admin
npm run create-admin     # Create admin user

# Deployment
npm run deploy:check     # Check if ready to deploy
vercel                   # Deploy preview
vercel --prod           # Deploy to production

# Automated (Windows)
.\scripts\quick-deploy.ps1

# Automated (Linux/Mac)
./scripts/quick-deploy.sh
```

---

## 🆘 Troubleshooting

### "Vercel command not found"
```bash
npm install -g vercel
```

### "Database connection failed"
- Check `PRISMA_ACCELERATE_URL` in `.env.local`
- Verify database is running in Prisma Cloud
- Make sure URL starts with `prisma+postgres://`

### "Build failed"
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### "Can't create admin user"
- Make sure database is setup: `npm run setup:db`
- Check PRISMA_ACCELERATE_URL is correct
- Verify database has tables (use `npm run db:studio`)

---

## 📚 Need More Help?

- **Full Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Setup Guide**: See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **Project Docs**: See [PROJECT_REBUILD_GUIDE.md](PROJECT_REBUILD_GUIDE.md)

---

## ✅ Success Checklist

After deployment:

- [ ] App loads at Vercel URL
- [ ] Can login with admin account
- [ ] Dashboard shows statistics
- [ ] API health check works
- [ ] Database connected
- [ ] MT5 sync configured (optional)

---

## 🎉 You're Done!

Your AEGIS Trading Coach is now live on Vercel!

**Next Steps:**
1. Configure your trading accounts
2. Setup MT5 Expert Advisor
3. Start tracking your trades

Happy Trading! 📈
