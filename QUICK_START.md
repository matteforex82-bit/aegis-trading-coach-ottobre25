# 🚀 Quick Start - Connect MT5 to Dashboard

## ✅ System Status

**Dashboard:** https://aegis-trading-coach.vercel.app
**Status:** ✅ Online and working
**API Endpoint:** ✅ Tested and functional
**Authentication:** ✅ API Key validation active

---

## 📋 Prerequisites

Before starting, make sure you have:
- [x] Dashboard deployed to Vercel
- [x] Database configured and migrated
- [x] Admin user created
- [x] MT5/MT4 terminal installed

---

## 🔑 Step 1: Generate Your API Key

Open terminal in your project folder and run:

```bash
npm run setup:mt5
```

**Output will show:**
```
🔑 API Key (copy this):
   sk_aegis_71bd7c593bb3af1b8f61973f9bcfcf640d10faf877fc04397d47af2c0e7d8978

⚠️  IMPORTANT: Copy this key now! It will not be shown again.
```

**Copy the entire API key** (starts with `sk_aegis_`)

---

## 📝 Step 2: Configure MT5 Expert Advisor

### Open MetaEditor

1. Open MetaTrader 5
2. Press `F4` to open MetaEditor
3. Navigate to: **File → Open** → Browse to your project folder
4. Open `PropControlExporter.mq5`

### Edit Configuration

Find these lines at the top of the file:

```mql5
// Input Parameters
input string API_URL = "https://aegis-trading-coach.vercel.app/api/ingest/mt5";
input string API_KEY = "";  // Your API Key from dashboard (required)
```

**Paste your API Key** between the quotes:

```mql5
input string API_KEY = "sk_aegis_71bd7c593bb3af1b8f61973f9bcfcf640d10faf877fc04397d47af2c0e7d8978";
```

### Compile the Expert Advisor

1. Press `F7` to compile (or click **Compile** button)
2. Check for success message: `0 error(s), 0 warning(s)`
3. Close MetaEditor

---

## 🌐 Step 3: Allow WebRequest in MT5

### Enable URL Access

1. In MT5, go to: **Tools → Options**
2. Click **Expert Advisors** tab
3. Check: ☑ **Allow WebRequest for listed URL**
4. Click **Add** button
5. Enter: `https://aegis-trading-coach.vercel.app`
6. Click **OK**

**This allows the EA to send data to your dashboard.**

---

## 🎯 Step 4: Attach EA to Chart

### Load Expert Advisor

1. In MT5, open any chart (e.g., EURUSD M15)
2. In **Navigator** panel (Ctrl+N), expand **Expert Advisors**
3. Drag **PropControlExporter** onto the chart
4. Settings window will appear

### Verify Configuration

Check these parameters:
- **API_URL:** Should show your production URL
- **API_KEY:** Should show `sk_aegis_...` (first few characters)
- **SYNC_INTERVAL_SECONDS:** `60` (syncs every minute)
- **ENABLE_LOGGING:** `true` (for debugging)

### Enable Algo Trading

1. Make sure **AutoTrading** button is ON (green) in MT5 toolbar
2. Click **Allow** in the EA permissions dialog
3. Click **OK** to attach EA

---

## ✅ Step 5: Verify Connection

### Check MT5 Experts Tab

At the bottom of MT5, click the **Experts** tab. You should see:

```
=================================================
AEGIS Trading Coach - Expert Advisor Started
=================================================
API URL: https://aegis-trading-coach.vercel.app/api/ingest/mt5
Sync Interval: 60 seconds
Account: 123456
Broker: Your Broker Name
Server: YourBroker-Live
=================================================
✅ API Key configured
🔄 Starting first sync...
✅ Sync successful! Server response: 200
📊 Account data synced
💹 0 trades processed
📈 Metrics updated
```

### Check Dashboard

1. Open: https://aegis-trading-coach.vercel.app
2. Login with your admin credentials:
   - Email: `admin@dashboard.com`
   - Password: `Admin123!`
3. Go to **Accounts** page
4. You should see your MT5 account listed with:
   - Account number
   - Current balance
   - Equity
   - Last sync time

---

## 🎉 Success!

Your MT5 account is now connected and syncing data every 60 seconds!

---

## 🔧 Troubleshooting

### Error: 4014 - Function not allowed

**Problem:** WebRequest URL not allowed
**Fix:** Add `https://aegis-trading-coach.vercel.app` to MT5 Options → Expert Advisors → Allow WebRequest

### Error: 401 Unauthorized

**Problem:** Invalid or missing API Key
**Fix:**
1. Generate new API Key: `npm run setup:mt5`
2. Update API_KEY in EA settings
3. Recompile and reattach EA

### Error: API_KEY is not set

**Problem:** API Key parameter is empty
**Fix:** Open EA settings, paste your API Key, save and restart

### No data showing in dashboard

**Problem:** EA might not be running or sync failed
**Fix:**
1. Check MT5 Experts tab for error messages
2. Verify AutoTrading is enabled (green button)
3. Check EA is attached to chart (smiley face icon)
4. Wait 60 seconds for next sync attempt

### 500 Internal Server Error

**Problem:** Database connection or server issue
**Fix:**
1. Check Vercel logs: `vercel logs`
2. Verify `PRISMA_ACCELERATE_URL` is set in Vercel environment variables
3. Check database is accessible

---

## 📚 Advanced Configuration

### Sync Frequency

To change sync interval, edit in EA settings:
```mql5
input int SYNC_INTERVAL_SECONDS = 30;  // Sync every 30 seconds
```

### Prop Firm Challenge Tracking

If using for prop firm challenge:
```mql5
input string PROP_FIRM_NAME = "FTMO";
input string ACCOUNT_PHASE = "Phase 1";
input double ACCOUNT_START_BALANCE = 100000;
```

### Disable Closed Trades Sync

To sync only open positions:
```mql5
input bool SYNC_OPEN_POSITIONS = true;
input bool SYNC_CLOSED_TRADES = false;  // Don't sync history
input bool SYNC_METRICS = true;
```

---

## 📞 Need Help?

- Read full documentation: PRODUCTION_SETUP.md
- Check MT5 installation guide: MT5_INSTALLATION_GUIDE.md
- Review API endpoint: app/api/ingest/mt5/route.ts

---

## 🔐 Security Notes

- ✅ API Keys are hashed in database (bcrypt with 12 rounds)
- ✅ Each key is unique and linked to specific user
- ✅ Keys can be revoked from dashboard
- ✅ Rate limiting can be added per key
- ✅ All requests logged with timestamps

**Never share your API Key publicly!**

---

**Built with 🤖 by Claude Code**
