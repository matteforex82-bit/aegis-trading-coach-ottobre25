# 🚀 AEGIS Trading Coach - Setup Instructions

## ✅ Current Status

The application has been successfully built with all core features implemented!

### Completed Features:
- ✅ Authentication system (Sign in / Sign up)
- ✅ Dashboard with trading statistics
- ✅ Trading accounts management
- ✅ Trades history viewer
- ✅ MT4/MT5 API integration endpoints
- ✅ Responsive UI with Tailwind CSS
- ✅ Database schema with Prisma
- ✅ All API routes configured

---

## 🗄️ Database Setup

### Step 1: Configure Environment Variables

Your `.env.local` file needs:

```bash
# Database (Prisma Accelerate URL)
PRISMA_ACCELERATE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 2: Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it as `NEXTAUTH_SECRET`.

### Step 3: Setup Prisma Database

1. Go to https://cloud.prisma.io
2. Create a new project
3. Create a PostgreSQL database
4. Enable Prisma Accelerate
5. Copy the Accelerate URL and paste it in `.env.local`

### Step 4: Push Database Schema

```bash
npm run db:push
```

This will create all the tables in your database.

### Step 5: Create Admin User

```bash
ADMIN_EMAIL="your@email.com" ADMIN_PASSWORD="YourPassword123!" ADMIN_NAME="Your Name" npx tsx scripts/create-admin.ts
```

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 🔐 First Login

1. Go to http://localhost:3000
2. Click "Sign In"
3. Use the admin credentials you created
4. You'll be redirected to the dashboard

---

## 🌐 Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: AEGIS Trading Coach"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aegis-trading-coach.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables in Vercel project settings:
   - `PRISMA_ACCELERATE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your Vercel domain: `https://your-app.vercel.app`)

4. Deploy!

---

## 📡 MT5 Expert Advisor Setup

### Step 1: Configure EA

The Expert Advisor file is located in the project root: `PropControlExporter.mq5`

Copy it to your MT5 Experts folder:
```
C:\Users\YourName\AppData\Roaming\MetaQuotes\Terminal\YOUR_MT5_ID\MQL5\Experts\
```

### Step 2: Compile in MetaEditor

1. Open MetaEditor (F4 in MT5)
2. Open `PropControlExporter.mq5`
3. Click Compile (F7)

### Step 3: Configure MT5 Settings

1. MT5 → Tools → Options → Expert Advisors
2. Enable "Allow WebRequest for listed URLs"
3. Add your application URL:
   - Local: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`

### Step 4: Attach EA to Chart

1. Drag `PropControlExporter` from Navigator to any chart
2. In settings, configure:
   - **API_URL**: `https://your-app.vercel.app/api/ingest/mt5` (or local URL)
   - **SYNC_INTERVAL_SECONDS**: `60`
   - **PROP_FIRM_NAME**: Your prop firm (optional)
   - **ACCOUNT_PHASE**: `DEMO`, `CHALLENGE`, or `FUNDED`
   - **ACCOUNT_START_BALANCE**: Your starting balance

3. Enable "Allow live trading"
4. Click OK

---

## 📊 Application Pages

### Available Routes:

- **/** - Landing page (redirects to dashboard if logged in)
- **/auth/signin** - Login page
- **/auth/signup** - Registration page
- **/dashboard** - Main dashboard with statistics
- **/dashboard/accounts** - Trading accounts management
- **/dashboard/trades** - Trade history
- **/dashboard/analytics** - Analytics (placeholder)
- **/dashboard/journal** - Trading journal (placeholder)
- **/dashboard/settings** - Settings (placeholder)

### API Endpoints:

- **POST /api/auth/signup** - Create new user
- **GET /api/dashboard/stats** - Dashboard statistics
- **GET /api/accounts** - Get user's trading accounts
- **DELETE /api/accounts/[id]** - Delete account
- **GET /api/trades** - Get user's trades
- **POST /api/ingest/mt5** - MT5 data sync endpoint
- **POST /api/ingest/mt4** - MT4 data sync endpoint
- **GET /api/health** - Health check
- **GET /api/ea-health** - EA endpoint health check

---

## 🛠️ Tech Stack

- **Next.js 15.5.4** - React framework
- **React 18.3.1** - UI library
- **TypeScript 5.7.2** - Type safety
- **Tailwind CSS** - Styling
- **Prisma 6.16.3** - ORM
- **NextAuth.js 4.24.11** - Authentication
- **Radix UI** - Headless components
- **Lucide React** - Icons

---

## 📝 Next Steps

### Features to Implement:

1. **Analytics Page**
   - Add charts with Recharts
   - Performance graphs
   - Win/loss analysis

2. **Trading Journal**
   - Add CRUD operations for journal entries
   - Tags and categories
   - Search and filter

3. **Settings Page**
   - Profile management
   - Password change
   - Theme switcher
   - API key management

4. **Account Management**
   - Add manual account creation form
   - Account editing
   - Sync status indicators

5. **Real-time Updates**
   - WebSocket integration
   - Live trade updates
   - Real-time notifications

---

## 🐛 Troubleshooting

### Database Connection Issues

If you get database errors, verify:
- `PRISMA_ACCELERATE_URL` is correct
- Database is running
- Run `npm run db:push` again

### Authentication Issues

If login doesn't work:
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Ensure admin user was created successfully

### MT5 Sync Issues

If MT5 EA can't connect:
- Verify WebRequest URLs are configured in MT5
- Check API_URL in EA settings
- Look for errors in MT5 Expert tab
- Verify API endpoints are accessible

---

## 📚 Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Push database schema
npm run db:push

# Open Prisma Studio
npm run db:studio

# Create admin user
npx tsx scripts/create-admin.ts

# Check for issues
npm run lint
```

---

## ✨ Success!

Your AEGIS Trading Coach application is now ready to use! 🎉

For questions or issues, refer to the main PROJECT_REBUILD_GUIDE.md file.
