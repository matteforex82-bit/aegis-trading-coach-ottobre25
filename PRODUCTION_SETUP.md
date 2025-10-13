# 🚀 AEGIS Trading Coach - Production Setup Guide

## Commercial Product Deployment Strategy

This guide explains how to deploy AEGIS Trading Coach as a **professional, sellable product** that clients can use without manual configuration.

---

## ⚠️ Critical Issue: Vercel Deployment Protection

### The Problem

When deploying to Vercel, **Deployment Protection** is enabled by default on preview deployments. This blocks all external requests (including MT5 Expert Advisors) BEFORE they reach your Next.js application.

**Symptoms:**
- MT5 EA receives HTML authentication page instead of JSON response
- 401 Unauthorized errors
- Middleware never gets a chance to validate API Keys

### The Root Cause

Vercel Deployment Protection operates at the **CDN layer** (edge network), completely bypassing:
- Next.js middleware
- API routes
- Authentication logic

```
MT5 Request → Vercel CDN → ❌ BLOCKED BY PROTECTION
                          ↓
                     (Never reaches Next.js)
```

---

## ✅ Professional Solutions (Choose One)

### Option 1: Custom Domain (RECOMMENDED for Commercial Product)

**Why This Works:**
- Custom domains automatically bypass Deployment Protection
- Professional branding for your product
- No client configuration required
- SSL certificates included

**Setup Steps:**

1. **Purchase a Domain**
   - Recommended registrars: Namecheap, Cloudflare, Google Domains
   - Example: `aegis-trading.com` or `mytradingdash.com`

2. **Add Domain to Vercel Project**
   ```bash
   # Via Vercel Dashboard
   1. Go to your project → Settings → Domains
   2. Click "Add Domain"
   3. Enter your domain (e.g., aegis-trading.com)
   4. Follow DNS configuration instructions
   ```

3. **Update MT5 Expert Advisor**
   ```mql5
   // In PropControlExporter.mq5
   input string API_URL = "https://aegis-trading.com/api/ingest/mt5";
   input string API_KEY = ""; // Client's API Key from dashboard
   ```

4. **Client Setup Process**
   - Client deploys dashboard to their Vercel account
   - Client adds their custom domain
   - Client generates API Key from dashboard
   - Client configures MT5 EA with their domain + API Key
   - ✅ Works immediately with zero manual configuration!

**Cost:** ~$10-15/year for domain

---

### Option 2: Disable Protection (Quick Fix for Testing)

**⚠️ Not Recommended for Production** - Exposes preview deployments publicly

**Manual Steps:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Deployment Protection
3. Choose "Disable Deployment Protection"
4. Save changes

**Downside:** Preview deployments are publicly accessible

---

### Option 3: Production Deployment Only

Deploy to production branch instead of preview:

```bash
# Deploy to production (main branch)
git push origin main

# Or force production deploy
vercel --prod
```

**Production URLs** don't have Deployment Protection enabled by default.

---

## 🎯 Recommended Architecture for Commercial Product

### Multi-Tenant SaaS Model

```
Your Product Domain: aegis-trading.com
├── Landing Page: /
├── Pricing: /pricing
├── Documentation: /docs
└── Client Dashboard: /dashboard

Client Deployment Options:
1. Subdomain: clientname.aegis-trading.com
2. Custom Domain: clientname.com
3. Vercel Project: clientname.vercel.app (requires custom domain)
```

### Implementation Steps:

**For Your Business:**
1. Set up main product website with documentation
2. Create Vercel project template
3. Automate client onboarding with setup wizard

**For Each Client:**
1. Client deploys from your template
2. Client connects their custom domain
3. Client runs `npm run setup:mt5` to generate API Key
4. Client configures MT5 EA with their domain + API Key
5. ✅ System works automatically!

---

## 🔐 Security Architecture

### Layer 1: Middleware (Priority 1)
```typescript
// middleware.ts
if (pathname.startsWith('/api/ingest/')) {
  const apiKey = request.headers.get('X-API-Key')

  if (apiKey && apiKey.startsWith('sk_aegis_')) {
    // Allow through for validation
    return NextResponse.next()
  }

  // Reject immediately
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Layer 2: Database Validation
```typescript
// app/api/ingest/mt5/route.ts
const apiKeys = await db.apiKey.findMany({ where: { isActive: true } })

for (const key of apiKeys) {
  const isValid = await bcrypt.compare(apiKey, key.key)
  if (isValid) {
    // Associate data with user
    return { valid: true, userId: key.userId }
  }
}
```

### Layer 3: Rate Limiting (Future Enhancement)
```typescript
// Optional: Add rate limiting per API Key
const requestCount = await redis.incr(`api_key:${key.id}:count`)
if (requestCount > 100) { // 100 requests per hour
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

---

## 📊 Client Onboarding Flow

### Automated Setup (Zero Manual Config)

```bash
# 1. Client clones your template
npx create-aegis-dashboard my-trading-dashboard

# 2. Client deploys to Vercel
cd my-trading-dashboard
vercel

# 3. Client adds custom domain in Vercel dashboard
# Settings → Domains → Add mytradingdash.com

# 4. Client generates API Key
npm run setup:mt5

# 5. Client configures MT5 EA
# Open PropControlExporter.mq5
# Set API_URL = "https://mytradingdash.com/api/ingest/mt5"
# Set API_KEY = "sk_aegis_..." (from step 4)

# 6. Client compiles and attaches EA
# ✅ Data syncs automatically!
```

---

## 🧪 Testing Checklist

### Local Testing
- [x] Admin user created
- [x] API Key generated
- [x] Middleware validates keys
- [x] MT5 endpoint accepts data
- [x] Database records created

### Production Testing
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] MT5 EA connects successfully
- [ ] API Key validation works
- [ ] Data appears in dashboard
- [ ] Rate limiting enforced (if implemented)

---

## 🚨 Troubleshooting

### MT5 EA Error 4014
**Issue:** WebRequest not allowed
**Fix:** Add your domain to MT5 → Tools → Options → Expert Advisors → Allow WebRequest for URL

### 401 Unauthorized
**Issue:** Vercel Protection blocking
**Fix:** Add custom domain OR disable protection OR use production deployment

### Invalid API Key
**Issue:** Key not found in database
**Fix:** Run `npm run setup:mt5` to generate new key

### Database Connection Failed
**Issue:** PRISMA_ACCELERATE_URL not set
**Fix:** Add environment variable in Vercel dashboard

---

## 📦 Next Steps for Commercial Launch

1. **Create Landing Page** - Sell the product
2. **Setup Stripe Billing** - Monetize with subscriptions
3. **Build Admin Panel** - Manage clients and usage
4. **Add Analytics** - Track API usage and performance
5. **Create Video Tutorials** - Onboarding documentation
6. **Implement Support System** - Help clients with setup
7. **Add Usage Tiers** - FREE/STARTER/PRO/ENTERPRISE plans
8. **Build White-Label Option** - Clients can rebrand

---

## 💰 Pricing Model Suggestion

```
FREE TIER
- 1 Trading Account
- 100 API requests/day
- 7 days data retention

STARTER - $29/month
- 3 Trading Accounts
- 1,000 API requests/day
- 30 days data retention
- Email support

PRO - $99/month
- 10 Trading Accounts
- 10,000 API requests/day
- 90 days data retention
- Priority support
- Advanced analytics

ENTERPRISE - Custom
- Unlimited accounts
- Unlimited API requests
- Unlimited data retention
- White-label option
- Dedicated support
```

---

## 📞 Support

For setup assistance or commercial licensing inquiries:
- Documentation: https://docs.aegis-trading.com
- Email: support@aegis-trading.com
- Discord: https://discord.gg/aegis-trading

---

**Built with 🤖 by Claude Code**
