# 🧪 AEGIS EXECUTION LAYER - TESTING CHECKLIST

**Date:** 25 Ottobre 2025
**Version:** MT5 Execution Layer v2.0
**Status:** ✅ Ready for Testing

---

## 📋 PRE-REQUISITES

### ✅ Environment Setup
- [x] Database migration completed
- [x] Prisma Client regenerated
- [x] Build successful (no TypeScript errors)
- [x] Deployed to production: https://aegis-trading-coach.vercel.app

### ✅ Test Data Available
- [x] Admin user created (admin@aegis.com / Admin123!)
- [x] Demo account available (DEMO_ADMIN_12345)
- [x] Test YAML files ready:
  - `/test-eurusd-wave3-setup.yaml` (single asset)
  - `/test-multi-asset-setup.yaml` (3 assets)

### 🔲 MT5 Setup Required
- [ ] MT5 installed and demo account created
- [ ] AegisExecutionController.mq5 compiled
- [ ] MT5 API key generated for account
- [ ] WebRequest enabled for https://aegis-trading-coach.vercel.app

---

## 🎯 TEST FLOW - COMPLETE END-TO-END

### **Phase 1: Challenge Setup Wizard**

#### Test 1.1: Create Challenge Setup
- [ ] Login to AEGIS dashboard
- [ ] Navigate to `/dashboard/challenge-setup`
- [ ] Select challenge provider (e.g., FTMO Phase 1)
- [ ] Verify auto-fill of rules (daily loss 5%, over-roll 10%)
- [ ] Configure user settings:
  - Risk per trade: 1.5%
  - Risk per asset: 2.0%
  - Max orders per asset: 3
- [ ] Review calculated budgets
- [ ] Activate setup
- [ ] Verify setup is locked (immutable)

**Expected Result:**
✅ Challenge setup created successfully
✅ Setup shows as ACTIVE and isLocked=true
✅ Daily budget and max risk calculated correctly

---

### **Phase 2: YAML Upload & Review**

#### Test 2.1: Upload Single Asset YAML
- [ ] Navigate to `/dashboard/yaml-upload`
- [ ] Select demo account from dropdown
- [ ] Upload `test-eurusd-wave3-setup.yaml`
- [ ] Verify automatic redirect to `/dashboard/yaml-review/[id]`

#### Test 2.2: Review YAML Analysis
- [ ] Verify YAML parsing successful
- [ ] Check asset card displays:
  - Symbol: EURUSD
  - Scenario: bullish_impulse_wave3
  - Entry: 1.0920
  - Stop Loss: 1.0850
  - Take Profits: 1.1050, 1.1150, 1.1300
  - Invalidation: 1.0800
- [ ] Verify risk preview shows calculated lot size
- [ ] Check daily budget remaining

**Expected Result:**
✅ YAML parsed correctly
✅ Asset information displayed accurately
✅ Risk calculations match expectations (1.5% of account)

---

### **Phase 3: Generate Trade Orders**

#### Test 3.1: Generate Orders from YAML
- [ ] Click "Generate Orders" button on review page
- [ ] Verify success message
- [ ] Automatic redirect to `/dashboard/trades`
- [ ] Verify TradeOrder records created:
  - Status: PENDING
  - Direction: BUY
  - Order Type: BUY_LIMIT
  - Lot Size: calculated
  - Invalidation Price: 1.0800
  - isLocked: true

**Expected Result:**
✅ TradeOrders created with status PENDING
✅ All Elliott Wave data preserved (invalidation, TPs)
✅ Risk amounts within challenge limits

---

### **Phase 4: MT5 API Key Generation**

#### Test 4.1: Generate MT5 API Key
```bash
npm run generate:mt5-key DEMO_ADMIN_12345
```

- [ ] Verify key generated (format: `aegis_mt5_[32bytes]`)
- [ ] Key saved to database (TradingAccount.mt5ApiKey)
- [ ] Copy key for MT5 EA configuration

**Expected Result:**
✅ API key generated successfully
✅ Key stored in database
✅ Ready for MT5 EA authentication

---

### **Phase 5: MT5 Expert Advisor Setup**

#### Test 5.1: Configure AegisExecutionController.mq5
- [ ] Open MT5
- [ ] Attach EA to any chart
- [ ] Configure EA parameters:
  ```
  API_URL: https://aegis-trading-coach.vercel.app
  API_KEY: [paste generated key]
  ENABLE_AUTO_EXECUTION: true
  ENABLE_INVALIDATION_MONITOR: true
  ENABLE_ORDER_LOCK: true
  ENABLE_DRAWDOWN_MONITOR: true
  POLLING_INTERVAL_SEC: 5
  INVALIDATION_CHECK_SEC: 1
  DRAWDOWN_CHECK_SEC: 60
  ENABLE_LOGGING: true
  ```
- [ ] Enable AutoTrading in MT5
- [ ] Verify EA initializes without errors

**Expected Result:**
✅ EA starts successfully
✅ Console shows: "AEGIS EXECUTION CONTROLLER STARTED"
✅ All features enabled

---

### **Phase 6: Auto-Execution Testing**

#### Test 6.1: Poll Pending Orders
- [ ] Wait 5 seconds for EA polling cycle
- [ ] Check MT5 Expert Advisor log:
  - "📡 Polling pending orders from server..."
  - "✅ Server response received"
  - "📦 Parsing orders from JSON response..."

#### Test 6.2: Order Execution
- [ ] EA should automatically place BUY_LIMIT order for EURUSD
- [ ] Verify MT5 shows pending order:
  - Symbol: EURUSD
  - Type: BUY LIMIT
  - Price: 1.0920
  - SL: 1.0850
  - TP: 1.1050 (TP1)
  - Comment: "AEGIS:[orderId]"

#### Test 6.3: Verify Server Update
- [ ] Check `/dashboard/trades`
- [ ] Order status should update to: ACTIVE
- [ ] mt5Ticket field populated
- [ ] mt5Status: FILLED
- [ ] executionTime recorded

**Expected Result:**
✅ Order automatically executed by EA
✅ MT5 shows pending order with correct parameters
✅ Server database updated with execution details

---

### **Phase 7: Invalidation Monitor Testing**

#### Test 7.1: Simulate Invalidation Trigger
**WARNING: This will close position if executed**

Option A - Manual Test (if market allows):
- [ ] Wait for EURUSD price to reach invalidation (1.0800)
- [ ] EA should detect price breach
- [ ] Position closed automatically
- [ ] Server notified with closeReason: "INVALIDATION_TRIGGERED"

Option B - Simulated Test:
- [ ] Manually modify invalidation price to current price + 5 pips
- [ ] Wait 1 second for EA check cycle
- [ ] Verify EA closes position
- [ ] Check MT5 log: "⚠️  INVALIDATION TRIGGERED!"

#### Test 7.2: Verify Invalidation Log
- [ ] Check database ViolationLog table
- [ ] Record should exist:
  - violationType: "INVALIDATION_TRIGGERED"
  - description: mentions invalidation price
  - severity: INFO
  - metadata: includes price details

**Expected Result:**
✅ Position closed immediately when invalidation triggered
✅ ViolationLog record created
✅ Server dashboard shows closed order

---

### **Phase 8: Order Lock Enforcement**

#### Test 8.1: Attempt Manual SL/TP Modification
- [ ] In MT5, try to manually modify Stop Loss of AEGIS order
- [ ] EA should intercept the modification
- [ ] Original SL/TP restored automatically
- [ ] Check MT5 log: "🔒 LOCK ENFORCEMENT: Manual modification blocked"

#### Test 8.2: Verify Lock Violation Logged
- [ ] Check ViolationLog in database
- [ ] Record should show:
  - violationType: "MANUAL_SLTP_MODIFICATION_ATTEMPT"
  - actionTaken: "BLOCKED_AND_RESTORED"
  - severity: WARNING

**Expected Result:**
✅ Manual modifications blocked
✅ Original values restored within 1 second
✅ Violation logged to server

---

### **Phase 9: Drawdown Monitoring**

#### Test 9.1: Verify Drawdown Snapshots
- [ ] Wait 60 seconds for drawdown check
- [ ] Check MT5 log:
  - "📊 Drawdown Check:"
  - Shows balance, equity, floating P&L
- [ ] Verify DrawdownSnapshot created in database
- [ ] Check fields:
  - dailyDrawdownTotal
  - floatingPnL
  - closedPnL

#### Test 9.2: Test Drawdown Limit Warning
**Option:** Manually adjust challenge limits to trigger warning

- [ ] Reduce dailyBudgetDollars to very low value
- [ ] Wait for next drawdown check
- [ ] Verify response includes warnings
- [ ] Check if blockOrders flag set when >90% limit

**Expected Result:**
✅ Drawdown snapshots created every 60 seconds
✅ Warnings triggered at 70% and 90% limits
✅ Critical violations logged when near limits

---

### **Phase 10: Multi-Asset Testing**

#### Test 10.1: Upload Multi-Asset YAML
- [ ] Upload `test-multi-asset-setup.yaml` (EURUSD, GBPUSD, XAUUSD)
- [ ] Generate orders for all 3 assets
- [ ] Verify 3 TradeOrders created (or more if secondary entries)

#### Test 10.2: EA Executes Multiple Orders
- [ ] EA should poll and execute all pending orders
- [ ] Verify 3 positions opened in MT5
- [ ] Each with correct symbol, direction, SL, TP

#### Test 10.3: Monitor All Positions Simultaneously
- [ ] EA monitors invalidation for all 3 positions
- [ ] Each checked independently every 1 second
- [ ] Verify no cross-interference

**Expected Result:**
✅ Multiple orders executed correctly
✅ All positions monitored independently
✅ No conflicts or errors

---

## 🐛 KNOWN ISSUES TO TEST FOR

### Critical Bugs to Watch:
- [ ] **Connection Loss**: What happens if API connection drops mid-execution?
- [ ] **Duplicate Orders**: Can EA execute same order twice?
- [ ] **Race Conditions**: Simultaneous order execution and invalidation check?
- [ ] **Price Gaps**: Weekend gap opens beyond invalidation - is position closed Monday?
- [ ] **Account Switch**: What if user changes account in dashboard while EA running?

### Edge Cases:
- [ ] YAML with missing optional fields (e.g., no secondary entry)
- [ ] YAML with invalid invalidation price (e.g., = entry price)
- [ ] Challenge setup without lock enabled
- [ ] Order generation when daily budget exhausted
- [ ] Multiple YAMLs uploaded rapidly

---

## 📊 SUCCESS CRITERIA

### ✅ MVP Success (Minimum Viable Product)
- [x] Challenge setup wizard completes successfully
- [x] YAML upload and parsing works
- [x] TradeOrders generated with correct risk calculations
- [x] MT5 EA authenticates and connects
- [x] Orders executed automatically by EA
- [x] Database updated with execution details

### 🎯 Full Success (Production Ready)
- [ ] Invalidation monitor closes positions correctly
- [ ] Order lock blocks manual modifications
- [ ] Drawdown monitoring sends snapshots
- [ ] Multi-asset support works seamlessly
- [ ] All violations logged correctly
- [ ] No critical bugs in 30-minute stress test

---

## 🚨 EMERGENCY ROLLBACK

If critical bugs found:
```bash
# Stop MT5 EA immediately
# Disable AutoTrading in MT5

# Rollback database (if needed)
npx prisma migrate reset

# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous version
vercel --prod
```

---

## 📝 BUG REPORT TEMPLATE

```
**Bug Title:** [Short description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- AEGIS Version: 2.0
- MT5 Build: [build number]
- Account: [demo/real]
- Challenge: [FTMO/etc]

**Logs/Screenshots:**
[Attach MT5 logs, server logs, screenshots]
```

---

## ✅ TESTING COMPLETION CHECKLIST

Once all phases tested:

- [ ] All critical features work as expected
- [ ] No critical bugs found
- [ ] Edge cases handled gracefully
- [ ] Documentation updated with findings
- [ ] User manual created (if needed)
- [ ] Mark Execution Layer as **PRODUCTION READY** ✅

---

**Happy Testing! 🚀**

Report any issues immediately for quick fixes.
