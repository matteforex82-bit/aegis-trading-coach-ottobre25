# 🚀 AEGIS Trading Coach - Deployment Guide

## Quick Deploy to Vercel (5 Minutes)

### Prerequisites
- ✅ GitHub account
- ✅ Vercel account (free tier works)
- ✅ Prisma Cloud account (free tier works)

---

## 📋 Step-by-Step Deployment

### 1️⃣ Setup Database (2 minutes)

1. **Go to Prisma Cloud**
   - Visit: https://cloud.prisma.io
   - Sign in or create account

2. **Create Database**
   - Click "New Project"
   - Select "PostgreSQL"
   - Choose region (closest to your users)
   - Click "Create"

3. **Enable Accelerate**
   - In your project, click "Enable Accelerate"
   - Copy the connection string:
     ```
     prisma+postgres://accelerate.prisma-data.net/?api_key=xxxxx
     ```
   - **Save this URL** - you'll need it soon!

---

### 2️⃣ Prepare Your Code (1 minute)

1. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

2. **Generate NextAuth Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output.

3. **Update .env.local**
   ```bash
   PRISMA_ACCELERATE_URL="your-prisma-url-from-step-1"
   NEXTAUTH_SECRET="your-generated-secret-from-step-2"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Run pre-deployment check**
   ```bash
   npm run deploy:check
   ```

   This will verify everything is ready!

---

### 3️⃣ Push to GitHub (1 minute)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: AEGIS Trading Coach"

# Create main branch
git branch -M main

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/aegis-trading-coach.git

# Push to GitHub
git push -u origin main
```

---

### 4️⃣ Deploy to Vercel (1 minute)

#### Option A: Automatic (Recommended)

1. **Go to Vercel**
   - Visit: https://vercel.com/new
   - Click "Import Project"
   - Select your GitHub repository

2. **Configure Project**
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Add Environment Variables**
   Click "Environment Variables" and add:

   | Name | Value |
   |------|-------|
   | `PRISMA_ACCELERATE_URL` | Your Prisma URL |
   | `NEXTAUTH_SECRET` | Your generated secret |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |

   ⚠️ **Important**: Replace `your-app.vercel.app` with your actual Vercel domain (you'll see it after first deploy, then update it)

4. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - ✅ Done!

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow prompts and add environment variables when asked
```

---

### 5️⃣ Post-Deployment Setup (Optional)

#### Create Admin User

You have 2 options:

**Option 1: Locally with Production Database**
```bash
PRISMA_ACCELERATE_URL="your-production-url" \
ADMIN_EMAIL="your@email.com" \
ADMIN_PASSWORD="SecurePassword123!" \
ADMIN_NAME="Your Name" \
npm run create-admin
```

**Option 2: Via Vercel Function**
Create a temporary API route (delete after use):

Create `app/api/setup-admin/route.ts`:
```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  // Add a secret key for security
  const { secret, email, password, name } = await request.json()

  if (secret !== "YOUR_TEMP_SECRET_123") {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  })

  return NextResponse.json({ success: true, userId: user.id })
}
```

Then call it:
```bash
curl -X POST https://your-app.vercel.app/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_TEMP_SECRET_123",
    "email": "your@email.com",
    "password": "SecurePassword123!",
    "name": "Your Name"
  }'
```

**Don't forget to delete this API route after creating the admin!**

---

## 🔄 Automatic Deployments (CI/CD)

The project includes GitHub Actions for automatic deployments!

### Setup GitHub Actions

1. **Get Vercel Tokens**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login
   vercel login

   # Link to your project
   vercel link

   # Get tokens
   vercel --token
   ```

2. **Add GitHub Secrets**

   Go to: `Settings` → `Secrets and variables` → `Actions`

   Add these secrets:
   - `VERCEL_TOKEN` - From vercel --token
   - `VERCEL_ORG_ID` - From .vercel/project.json
   - `VERCEL_PROJECT_ID` - From .vercel/project.json

3. **Done!**
   Now every push to `main` will auto-deploy!

---

## 🧪 Testing Your Deployment

### 1. Health Checks
```bash
# API Health
curl https://your-app.vercel.app/api/health

# EA Health
curl https://your-app.vercel.app/api/ea-health
```

### 2. Test MT5 Integration
```bash
curl -X POST https://your-app.vercel.app/api/ingest/mt5 \
  -H "Content-Type: application/json" \
  -d '{
    "account": {
      "login": "12345",
      "broker": "Test Broker",
      "balance": 10000,
      "equity": 10000
    }
  }'
```

---

## 📊 Monitoring & Logs

### Vercel Dashboard
- View logs: https://vercel.com/dashboard
- Check deployment status
- Monitor performance
- View analytics

### Prisma Cloud
- Database metrics: https://cloud.prisma.io
- Query performance
- Connection pooling stats

---

## 🔧 Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
```bash
# Solution: The build command should include prisma generate
# This is already in package.json: "build": "prisma generate && next build"
```

**Error: Environment variables missing**
```bash
# Solution: Add all required env vars in Vercel dashboard
# Required: PRISMA_ACCELERATE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### Database Connection Issues

**Error: Can't reach database**
```bash
# Check:
# 1. PRISMA_ACCELERATE_URL is correct (starts with prisma+postgres://)
# 2. API key is valid in Prisma Cloud
# 3. Database is running in Prisma Cloud
```

### Authentication Issues

**Error: NextAuth configuration error**
```bash
# Check:
# 1. NEXTAUTH_SECRET is set and matches in all environments
# 2. NEXTAUTH_URL matches your actual domain
# 3. For production: https://your-app.vercel.app
# 4. For local: http://localhost:3000
```

### MT5 Sync Issues

**Error: 403 Forbidden from MT5**
```bash
# Check:
# 1. /api/ingest routes are in middleware.ts public routes
# 2. MT5 WebRequest URLs include your Vercel domain
# 3. EA settings have correct API_URL
```

---

## 🔐 Security Checklist

Before going live:

- [ ] `.env.local` is in `.gitignore`
- [ ] Strong `NEXTAUTH_SECRET` generated
- [ ] Database password is secure
- [ ] Admin account has strong password
- [ ] API routes have proper authentication
- [ ] CORS is configured if needed
- [ ] Rate limiting is enabled (future feature)

---

## 📈 Post-Deployment Optimization

### 1. Custom Domain (Optional)
- Buy domain (e.g., GoDaddy, Namecheap)
- Add to Vercel: Settings → Domains
- Update `NEXTAUTH_URL` to your custom domain

### 2. Enable Analytics
- Vercel Analytics: Enable in project settings
- Add monitoring for API routes
- Track user behavior

### 3. Performance
- Enable Vercel Edge Functions (if needed)
- Configure caching headers
- Optimize images with next/image

### 4. Database Optimization
- Enable Prisma Pulse for real-time updates
- Configure connection pooling limits
- Add database indexes for performance

---

## 🎯 Quick Command Reference

```bash
# Development
npm run dev                  # Start dev server
npm run build               # Build for production
npm start                   # Start production server

# Database
npm run setup:db            # Setup database (generate + push)
npm run db:push             # Push schema to database
npm run db:studio           # Open Prisma Studio

# Admin
npm run create-admin        # Create admin user

# Deployment
npm run deploy:check        # Check if ready to deploy
npm run deploy:prepare      # Check + build

# Vercel
vercel                      # Deploy preview
vercel --prod              # Deploy to production
vercel logs                # View logs
```

---

## 🆘 Need Help?

1. Check the logs:
   - Vercel: https://vercel.com/dashboard
   - Local: Terminal output

2. Review documentation:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://www.prisma.io/docs
   - NextAuth: https://next-auth.js.org

3. Common issues:
   - See TROUBLESHOOTING.md (if available)
   - Check GitHub issues

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Application loads at your Vercel URL
- [ ] Can create new account via /auth/signup
- [ ] Can login with admin credentials
- [ ] Dashboard shows correctly
- [ ] API health check returns 200
- [ ] MT5 test sync works (if applicable)
- [ ] All pages load without errors
- [ ] Database connection is stable

---

## 🎉 You're Live!

Congratulations! Your AEGIS Trading Coach is now deployed and running on Vercel!

**Next Steps:**
1. Share your app URL with users
2. Configure MT5 Expert Advisor
3. Start tracking your trading performance
4. Monitor and optimize

**Your App URL:** https://your-app.vercel.app

Happy Trading! 📈
