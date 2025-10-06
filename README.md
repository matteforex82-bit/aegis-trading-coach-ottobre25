# 🛡️ AEGIS Trading Coach

Professional trading dashboard with MT4/MT5 integration built with Next.js 15, React 18, Prisma, and NextAuth.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/aegis-trading-coach)

## 🚀 **[➡️ INIZIA DA QUI! ⬅️](../INIZIA_QUI.md)**

## 📖 Documentation

- **[🎯 INIZIA_QUI.md](../INIZIA_QUI.md)** - **START HERE!** Setup in 5 minuti
- **[🗄️ DATABASE_SETUP.md](DATABASE_SETUP.md)** - Database setup guide
- **[⚡ QUICK_START.md](QUICK_START.md)** - Get started in 3 commands
- **[🚀 DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[📋 SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Detailed setup instructions
- **[🔧 PROJECT_REBUILD_GUIDE.md](../PROJECT_REBUILD_GUIDE.md)** - Full rebuild guide

## 🚀 Quick Deploy (Automated)

### One-Command Deployment

**Windows (PowerShell):**
```powershell
.\scripts\quick-deploy.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/quick-deploy.sh && ./scripts/quick-deploy.sh
```

This will automatically:
- ✅ Check your setup
- ✅ Build the project
- ✅ Push to GitHub
- ✅ Deploy to Vercel

### Manual Setup (3 Steps)

**1. Setup Database**
```bash
npm run setup:db
```

**2. Create Admin User**
```bash
ADMIN_EMAIL="your@email.com" ADMIN_PASSWORD="Pass123!" npm run create-admin
```

**3. Deploy**
```bash
vercel --prod
```

**Done!** 🎉

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

## 📦 Tech Stack

- **Frontend**: Next.js 15.5.4, React 18.3.1, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (via Prisma Accelerate)
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Deployment**: Vercel

## 📡 MT5 Integration

1. Copy `PropControlExporter.mq5` to your MT5 Experts folder:
   ```
   C:\Users\YourName\AppData\Roaming\MetaQuotes\Terminal\YOUR_MT5_ID\MQL5\Experts\
   ```

2. Compile in MetaEditor

3. Add to chart and configure:
   - `API_URL`: Your deployed URL + `/api/ingest/mt5`
   - `SYNC_INTERVAL_SECONDS`: 60
   - `PROP_FIRM_NAME`: Your prop firm (optional)
   - `ACCOUNT_PHASE`: DEMO/CHALLENGE/FUNDED
   - `ACCOUNT_START_BALANCE`: Your starting balance

4. In MT5 → Tools → Options → Expert Advisors:
   - Enable "Allow WebRequest for listed URLs"
   - Add your deployed URL

## 🚀 Deployment

### Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repository to Vercel dashboard.

### Environment Variables on Vercel

Add these in Vercel project settings:

```
PRISMA_ACCELERATE_URL=your-prisma-url
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-project.vercel.app
```

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run setup:db` - Setup database (generate + push)
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio

### Admin & Deployment
- `npm run create-admin` - Create admin user
- `npm run deploy:check` - Check if ready to deploy
- `npm run deploy:prepare` - Check + build

### Automated Deploy
- `.\scripts\quick-deploy.ps1` (Windows)
- `./scripts/quick-deploy.sh` (Linux/Mac)

## 🔑 Features

- ✅ Real-time trading data sync from MT4/MT5
- ✅ Multi-account management (demo, live, prop firms)
- ✅ Advanced trading statistics
- ✅ User authentication with roles
- ✅ Responsive design
- ✅ Dark mode support (ready)
- ✅ API health monitoring
- ✅ Secure database connection pooling

## 📚 Project Structure

```
aegis-trading-coach/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth endpoints
│   │   ├── health/               # Health check
│   │   ├── ea-health/            # EA health check
│   │   └── ingest/
│   │       ├── mt4/              # MT4 data ingestion
│   │       └── mt5/              # MT5 data ingestion
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   └── db.ts                     # Prisma client
├── prisma/
│   └── schema.prisma             # Database schema
├── scripts/
│   └── create-admin.ts           # Admin user creation script
├── PropControlExporter.mq5       # MT5 Expert Advisor
├── middleware.ts                 # Auth middleware
└── package.json
```

## ⚠️ Important Notes

- **React Version**: This project uses React 18.3.1 (NOT v19) for compatibility with Radix UI
- **Database**: Must use Prisma Accelerate for connection pooling in serverless environment
- **Security**: The `/api/ingest/*` endpoints are public for EA access. In production, implement API key authentication
- **MT5 EA**: Make sure to enable WebRequest in MT5 settings

## 🐛 Troubleshooting

### Database Connection Issues

If you get P1001 errors, ensure you're using the Prisma Accelerate URL, not the direct database URL.

### MT5 EA Not Syncing

1. Check MT5 Expert Advisors tab for errors
2. Verify WebRequest is enabled for your domain
3. Test API endpoint: `https://your-url.vercel.app/api/ea-health`

### Build Errors

If you encounter React 19 compatibility issues:

```bash
npm install react@18.3.1 react-dom@18.3.1
npm install
```

## 📖 Documentation

Full rebuild guide available in `PROJECT_REBUILD_GUIDE.md`

## 📄 License

ISC

## 🤝 Support

For issues and questions, check the PROJECT_REBUILD_GUIDE.md troubleshooting section.
