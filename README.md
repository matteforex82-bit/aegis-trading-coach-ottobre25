# 🛡️ AEGIS Trading Coach

Professional trading dashboard with MT4/MT5 integration built with Next.js 15, React 18, Prisma, and NextAuth.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js >= 18.17.0
- npm >= 9.x
- Prisma Cloud account (https://cloud.prisma.io)
- Vercel account (https://vercel.com)

### 2. Setup Database

1. Go to https://cloud.prisma.io
2. Create new PostgreSQL database
3. Enable Prisma Accelerate
4. Copy the Accelerate connection URL

### 3. Configure Environment Variables

Edit `.env.local` and update:

```bash
PRISMA_ACCELERATE_URL="your-prisma-accelerate-url-here"
```

### 4. Initialize Database

```bash
npm run db:push
```

### 5. Create Admin User

```bash
ADMIN_EMAIL="your@email.com" ADMIN_PASSWORD="YourPassword123!" ADMIN_NAME="Your Name" npx tsx scripts/create-admin.ts
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio

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
