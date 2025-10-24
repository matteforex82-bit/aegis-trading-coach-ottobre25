# AEGIS EXECUTION LAYER - IMPLEMENTATION ROADMAP

**Based on:** Technical Specification Document v1.0
**Approach:** Option B - PDF as pre-fill source + AI-assisted parsing
**Integration:** MT5 API now, full automation incremental
**Start Date:** 25 Ottobre 2025

---

## FASE 1: FOUNDATION (Priorità MASSIMA) - 2-3 giorni

### 1.1 Database Schema Updates
**Reference:** Section 0.4, Section 13.1

**Files to create/modify:**
- `prisma/schema.prisma` - Add new models

**New Models:**
```prisma
// Challenge Setup (Immutable after creation)
model ChallengeSetup {
  id                String   @id @default(cuid())
  accountId         String   @unique
  account           TradingAccount @relation(fields: [accountId], references: [id])

  // Challenge Rules (READ-ONLY from provider)
  challengeProvider String   // FTMO, FundedNext, etc
  challengePhase    String   // Phase1, Phase2, Funded
  overRollMaxPercent Float   // 5.0
  dailyMaxPercent   Float    // 2.5

  // User-Configured Settings (SET ONCE, IMMUTABLE)
  userRiskPerTradePercent  Float  // 2.0
  userRiskPerAssetPercent  Float  // 2.0
  maxOrdersPerAsset        Int    // 3
  minTimeBetweenOrdersSec  Int    // 0

  // Calculated Derived Values
  accountSize              Float
  dailyBudgetDollars       Float
  overRollBudgetDollars    Float
  maxTradeRiskDollars      Float
  maxAssetAllocationDollars Float

  // UI/Discipline Settings
  pnlHideMode              Boolean @default(true)
  pnlRefreshRateHours      Int     @default(4)
  orderLockEnabled         Boolean @default(true)
  autoCloseInvalidation    Boolean @default(true)

  // Status
  setupCompletedAt DateTime?
  status           String   @default("PENDING") // PENDING, ACTIVE, ENDED
  isLocked         Boolean  @default(false)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

// PDF Analysis Storage
model PDFAnalysis {
  id              String   @id @default(cuid())
  accountId       String
  account         TradingAccount @relation(fields: [accountId], references: [id])

  fileName        String
  uploadedAt      DateTime @default(now())

  // AI Parsing Results
  rawText         String   @db.Text
  parsedYAML      Json     // Full YAML structure
  extractedAssets Json     // Array of trading setups

  // Parsing Status
  parsingStatus   String   @default("PENDING") // PENDING, SUCCESS, FAILED, REVIEW_NEEDED
  aiConfidence    Float?   // 0-1
  reviewedBy      String?  // User ID if manually reviewed

  // Association
  generatedOrders TradeOrder[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Drawdown Snapshots (Every 60 seconds)
model DrawdownSnapshot {
  id                    String   @id @default(cuid())
  accountId             String
  account               TradingAccount @relation(fields: [accountId], references: [id])

  dailyDrawdownTotal    Float
  overRollDrawdownTotal Float
  closedPnL             Float
  floatingPnL           Float

  timestamp             DateTime @default(now())
  createdAt             DateTime @default(now())

  @@index([accountId, timestamp])
}

// Violations Log (FOMO attempts, etc)
model ViolationLog {
  id             String   @id @default(cuid())
  accountId      String
  account        TradingAccount @relation(fields: [accountId], references: [id])

  violationType  String   // FOMO_ATTEMPT, ORDER_MOD_ATTEMPT, etc
  description    String   @db.Text
  actionTaken    String   // BLOCKED, WARNED, etc
  severity       String   // INFO, WARNING, CRITICAL

  timestamp      DateTime @default(now())
  createdAt      DateTime @default(now())

  @@index([accountId, timestamp])
}

// Daily Discipline Reports
model DisciplineReport {
  id                 String   @id @default(cuid())
  accountId          String
  account            TradingAccount @relation(fields: [accountId], references: [id])

  reportDate         DateTime
  disciplineScore    Int      // 0-100

  totalTrades        Int
  winningTrades      Int
  losingTrades       Int

  netPnL             Float
  dailyDrawdown      Float
  overRollDrawdown   Float

  reportData         Json     // Full report JSON

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([accountId, reportDate])
}

// Update existing TradeOrder model
model TradeOrder {
  // ... existing fields ...

  // Add new fields for PDF integration
  pdfAnalysisId      String?
  pdfAnalysis        PDFAnalysis? @relation(fields: [pdfAnalysisId], references: [id])
  yamlAssetId        String?      // Reference to YAML asset ID

  // Invalidation tracking
  invalidationPrice  Float?
  invalidationRule   String?

  // Lock mechanism
  isLocked           Boolean  @default(true)
  lockReason         String?  @default("IMMUTABLE_AFTER_PLACEMENT")

  // MT5 Integration
  mt5Ticket          String?
  mt5Status          String?  // PENDING, FILLED, REJECTED, etc
  mt5LastSync        DateTime?
}
```

**Priority:** 🔴 CRITICAL
**Time:** 4-6 hours

---

### 1.2 Setup Wizard UI - 7 Steps (Section 0.3)
**Reference:** Section 0.3

**Files to create:**
- `app/dashboard/setup-challenge/page.tsx` - Main wizard page
- `components/setup-wizard/step-1-verification.tsx`
- `components/setup-wizard/step-2-challenge-limits.tsx`
- `components/setup-wizard/step-3-risk-tolerance.tsx`
- `components/setup-wizard/step-4-asset-allocation.tsx`
- `components/setup-wizard/step-5-position-constraints.tsx`
- `components/setup-wizard/step-6-ui-settings.tsx`
- `components/setup-wizard/step-7-review.tsx`
- `components/setup-wizard/wizard-container.tsx`

**API Endpoints:**
- `POST /api/setup/wizard` - Process wizard completion
- `POST /api/setup/validate` - Validate configuration (Section 0.5)
- `GET /api/setup/presets` - Get challenge presets (FTMO, FundedNext, etc)

**Priority:** 🔴 CRITICAL
**Time:** 8-10 hours

---

### 1.3 Challenge Config & Presets Database
**Reference:** Section 0.2

**Files to create:**
- `lib/challenge-presets.ts` - Challenge definitions
- `lib/setup-validator.ts` - Validation rules (Section 0.5)

**Content:**
```typescript
// lib/challenge-presets.ts
export const CHALLENGE_PRESETS = {
  FUNDEDNEXT_STANDARD: {
    id: "FUNDEDNEXT_001",
    name: "FundedNext Standard",
    provider: "FundedNext",
    overRollMaxPercent: 5.0,
    dailyMaxPercent: 2.5,
    prohibitedStrategies: ["martingale", "grid_trading"],
    // ... etc
  },
  FTMO_PHASE1: {
    // ...
  },
  // etc
}
```

**Priority:** 🟡 HIGH
**Time:** 2-3 hours

---

## FASE 2: PDF PARSING & AI INTEGRATION - 3-4 giorni

### 2.1 PDF Upload Endpoint
**Reference:** Section 2.1

**Files to create:**
- `app/api/analysis/upload/route.ts` - PDF upload handler
- `lib/pdf-parser.ts` - PDF text extraction (pdf-parse library)
- `lib/ai-yaml-extractor.ts` - GPT-4 Vision integration

**Dependencies to install:**
```bash
npm install pdf-parse
npm install openai
```

**API Flow:**
```typescript
// app/api/analysis/upload/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 1. Extract text from PDF
  const pdfText = await extractPDFText(file);

  // 2. Send to GPT-4 Vision for YAML extraction
  const yamlData = await extractYAMLWithAI(pdfText);

  // 3. Validate YAML structure
  const validation = validateYAML(yamlData);

  // 4. Store in database
  const analysis = await prisma.pDFAnalysis.create({
    data: {
      accountId,
      fileName: file.name,
      rawText: pdfText,
      parsedYAML: yamlData,
      parsingStatus: validation.isValid ? 'SUCCESS' : 'REVIEW_NEEDED',
      aiConfidence: validation.confidence,
    }
  });

  return NextResponse.json({
    status: 'success',
    analysisId: analysis.id,
    needsReview: !validation.isValid,
  });
}
```

**Priority:** 🔴 CRITICAL
**Time:** 6-8 hours

---

### 2.2 YAML Extraction with AI
**Reference:** Section 2.2, Section 2.3

**Files to create:**
- `lib/ai-yaml-extractor.ts` - GPT-4 integration
- `lib/yaml-validator.ts` - Validate extracted YAML

**GPT-4 Prompt Strategy:**
```typescript
const YAML_EXTRACTION_PROMPT = `
You are analyzing an Elliott Wave trading analysis PDF.
Extract the following information and return as JSON:

{
  "assets": [
    {
      "symbol": "EURUSD",
      "timeframe": "Daily",
      "current_price": 1.0950,
      "scenario_type": "bullish_impulse",
      "wave_structure": {
        "wave_1": { "start_price": 1.0800, "end_price": 1.1050, "status": "COMPLETED" },
        "wave_2": { "start_price": 1.1050, "end_price": 1.0900, "status": "IN_PROGRESS",
                    "retracement_levels": { "fib_382": 1.0995, "fib_618": 1.0920 } }
      },
      "trading_setup": {
        "primary_entry": { "type": "buy_limit", "price": 1.0920 },
        "stop_loss": { "price": 1.0850 },
        "take_profit_targets": [
          { "price": 1.1150, "description": "Wave 3 target" }
        ],
        "invalidation": { "price": 1.0800, "rule": "Below Wave 1 start" }
      }
    }
  ]
}

Extract ALL trading setups from the PDF text below:
${pdfText}
`;
```

**Priority:** 🔴 CRITICAL
**Time:** 4-6 hours

---

### 2.3 Manual Review Interface
**Reference:** Section 2.3 (Error Handling)

**Files to create:**
- `app/dashboard/analysis/review/[id]/page.tsx` - Review page
- `components/yaml-review-editor.tsx` - Manual YAML editor

**When AI confidence < 0.8:**
- User sees extracted YAML
- Can edit manually
- Must approve before proceeding

**Priority:** 🟡 HIGH
**Time:** 3-4 hours

---

## FASE 3: MT5 API INTEGRATION - 4-5 giorni

### 3.1 MT5 Connection Layer
**Reference:** Section 5.1

**Files to create:**
- `lib/mt5/connection.ts` - MT5 API bridge
- `lib/mt5/order-manager.ts` - Order placement
- `lib/mt5/monitor.ts` - Real-time monitoring

**Dependencies:**
```bash
npm install ws  # WebSocket for real-time updates
```

**MT5 Integration Options:**
1. **MetaTrader 5 WebSocket API** (if broker supports)
2. **Custom MT5 Expert Advisor** (Socket server in MT5)
3. **Third-party bridge** (e.g., MT5 REST API wrapper)

**Priority:** 🔴 CRITICAL
**Time:** 10-12 hours

---

### 3.2 Order Placement to MT5
**Reference:** Section 5.2

**Files to create:**
- `app/api/orders/place-to-mt5/route.ts`

**Flow:**
```typescript
export async function POST(request: NextRequest) {
  // 1. Get YAML trade setup
  const setup = await getYAMLSetup(yamlId, assetId);

  // 2. Calculate position size (from ChallengeSetup)
  const sizing = calculatePositionSize(setup);

  // 3. Validate constraints
  const validation = await validateTradeConstraints(accountId, sizing);
  if (!validation.canExecute) {
    return NextResponse.json({ error: validation.violations }, { status: 400 });
  }

  // 4. Place order to MT5
  const mt5Order = await mt5.placeBuyLimit({
    symbol: setup.symbol,
    volume: sizing.lotSize,
    price: setup.entry_price,
    sl: setup.stop_loss,
    tp: setup.take_profit_1,
    comment: `YAML_${yamlId}_${assetId}`,
    magic: generateMagicNumber(sessionId),
  });

  // 5. Store in database
  await prisma.tradeOrder.create({
    data: {
      accountId,
      pdfAnalysisId: yamlId,
      mt5Ticket: mt5Order.ticket,
      entryPrice: setup.entry_price,
      stopLoss: setup.stop_loss,
      takeProfit1: setup.take_profit_1,
      invalidationPrice: setup.invalidation.price,
      isLocked: true,
      status: 'PENDING',
    }
  });

  return NextResponse.json({ success: true, ticket: mt5Order.ticket });
}
```

**Priority:** 🔴 CRITICAL
**Time:** 6-8 hours

---

## FASE 4: MONITORING & AUTO-EXECUTION - 3-4 giorni

### 4.1 Invalidation Monitor
**Reference:** Section 7.1

**Files to create:**
- `lib/monitors/invalidation-monitor.ts`
- Background job (cron or interval)

**Logic:**
```typescript
// Every 1 second check
setInterval(async () => {
  const openOrders = await prisma.tradeOrder.findMany({
    where: { status: { in: ['PENDING', 'FILLED'] } }
  });

  for (const order of openOrders) {
    const currentPrice = await mt5.getCurrentPrice(order.symbol);

    if (order.invalidationPrice && currentPrice <= order.invalidationPrice) {
      // INVALIDATION TRIGGERED
      await mt5.closePosition(order.mt5Ticket, 'INVALIDATION');

      await prisma.tradeOrder.update({
        where: { id: order.id },
        data: {
          status: 'CLOSED',
          closeReason: 'INVALIDATION',
          closedAt: new Date(),
        }
      });

      // Alert user
      await sendAlert(order.accountId, 'CRITICAL', 'Pattern invalidated. Position closed.');
    }
  }
}, 1000);
```

**Priority:** 🔴 CRITICAL
**Time:** 4-6 hours

---

### 4.2 Real-Time Drawdown Tracking
**Reference:** Section 8.1, Section 8.2

**Files to create:**
- `lib/monitors/drawdown-tracker.ts`
- `app/api/monitoring/drawdown/route.ts`

**Logic:**
```typescript
// Every 60 seconds
setInterval(async () => {
  const accounts = await prisma.tradingAccount.findMany({
    where: { challengeSetup: { isNot: null } }
  });

  for (const account of accounts) {
    const closedPnL = await getClosedPnLToday(account.id);
    const floatingPnL = await getFloatingPnL(account.id);
    const dailyDrawdown = closedPnL + floatingPnL;

    const overRollDrawdown = await getOverRollDrawdown(account.id);

    await prisma.drawdownSnapshot.create({
      data: {
        accountId: account.id,
        dailyDrawdownTotal: dailyDrawdown,
        overRollDrawdownTotal: overRollDrawdown,
        closedPnL,
        floatingPnL,
      }
    });

    // Check limits
    const setup = account.challengeSetup;
    if (Math.abs(dailyDrawdown) >= setup.dailyBudgetDollars * 0.9) {
      await blockNewOrders(account.id, 'DAILY_LIMIT_NEAR');
    }
  }
}, 60000);
```

**Priority:** 🔴 CRITICAL
**Time:** 6-8 hours

---

### 4.3 Auto-Close Triggers
**Reference:** Section 10.1

**Files to create:**
- `lib/monitors/auto-close-manager.ts`

**Triggers:**
1. TP1/TP2 hit → Close
2. SL hit → Close
3. Invalidation → Close
4. Daily limit → Block new
5. Over-roll limit → Close all + end session

**Priority:** 🔴 CRITICAL
**Time:** 4-6 hours

---

## FASE 5: UI/UX & DISCIPLINE FEATURES - 2-3 giorni

### 5.1 P&L Dashboard (4-hour refresh)
**Reference:** Section 9.1, Section 9.2

**Files to create:**
- `components/pnl-dashboard-hidden.tsx`
- `lib/pnl-refresh-scheduler.ts`

**Logic:**
```typescript
// Update P&L every 4 hours
const PNL_REFRESH_HOURS = 4;
const lastUpdate = new Date();

// Show to user:
"Last P&L update: 00:00 UTC
 Next update: 04:00 UTC (in 2 hrs 15 mins)

 Position Status: 3 OPEN
 (P&L numbers hidden until next update)"
```

**Priority:** 🟡 HIGH
**Time:** 3-4 hours

---

### 5.2 Order Lock UI
**Reference:** Section 6.2, Section 6.3

**Files to modify:**
- `components/trade-entry-form.tsx` - Disable modify buttons
- `app/dashboard/orders/page.tsx` - Read-only order list

**UI States:**
```tsx
<Button
  disabled={order.isLocked}
  onClick={() => alert("Order LOCKED. Cannot modify.")}
>
  Modify Entry ❌
</Button>
```

**Priority:** 🟡 HIGH
**Time:** 2-3 hours

---

### 5.3 Discipline Scorecard
**Reference:** Section 11.1

**Files to create:**
- `app/api/reports/daily/route.ts`
- `app/dashboard/reports/daily/page.tsx`
- `components/discipline-scorecard.tsx`

**Score Calculation:**
```typescript
const disciplineScore = {
  followedPlan: 100,        // 100% of trades matched YAML
  noFOMO: 95,               // 0 market entries (1 attempt blocked)
  positionSizing: 100,      // All correct
  noAveragingViolations: 100,
  drawdownRespected: 100,
  lockedOrdersRespected: 100,
};

const totalScore = average(Object.values(disciplineScore)); // 99
```

**Priority:** 🟢 MEDIUM
**Time:** 4-5 hours

---

## FASE 6: INTEGRATION & TESTING - 2-3 giorni

### 6.1 End-to-End Flow Testing
1. Setup wizard → Create immutable config
2. Upload PDF → AI extracts YAML → Review
3. Approve → Generate trade setups
4. Place orders → MT5 receives
5. Monitor → Invalidation triggers → Auto-close
6. Daily report generation

**Priority:** 🔴 CRITICAL
**Time:** 6-8 hours

---

### 6.2 Error Handling & Edge Cases
**Reference:** Section 13.3

Test all edge cases:
- MT5 connection lost
- Price gaps
- Duplicate orders
- YAML parsing failures
- Invalidation near limits

**Priority:** 🟡 HIGH
**Time:** 4-6 hours

---

## TIMELINE SUMMARY

| Fase | Descrizione | Tempo Stimato | Priorità |
|------|-------------|---------------|----------|
| 1 | Foundation (DB + Setup Wizard) | 2-3 giorni | 🔴 CRITICAL |
| 2 | PDF Parsing & AI | 3-4 giorni | 🔴 CRITICAL |
| 3 | MT5 Integration | 4-5 giorni | 🔴 CRITICAL |
| 4 | Monitoring & Auto-Execution | 3-4 giorni | 🔴 CRITICAL |
| 5 | UI/UX & Discipline | 2-3 giorni | 🟡 HIGH |
| 6 | Testing & Integration | 2-3 giorni | 🔴 CRITICAL |

**TOTALE:** ~16-22 giorni di sviluppo

---

## IMMEDIATE NEXT STEPS (Oggi/Domani)

### Step 1: Database Schema (4-6 ore)
✅ Aggiornare `prisma/schema.prisma`
✅ Run migrations
✅ Test database connections

### Step 2: Challenge Presets (2-3 ore)
✅ Creare `lib/challenge-presets.ts`
✅ Definire FTMO, FundedNext, etc
✅ Validation logic

### Step 3: Setup Wizard UI - Parte 1 (4-6 ore)
✅ Wizard container component
✅ Step 1-2 (Verification + Challenge Limits)

---

## DEPENDENCIES & PREREQUISITES

**Required API Keys:**
- OpenAI API (GPT-4 Vision for PDF parsing)
- MT5 Broker API credentials (or EA setup)

**Required NPM Packages:**
```bash
npm install pdf-parse
npm install openai
npm install ws
npm install @prisma/client@latest
```

**Infrastructure:**
- Background job scheduler (for monitoring)
- WebSocket server (for MT5 real-time)

---

**Ready to start?** Dimmi da dove vuoi partire! 🚀

Suggerisco:
1. **Oggi:** Database schema + Challenge presets
2. **Domani:** Setup Wizard (primi 3-4 steps)
3. **Prossimi giorni:** PDF parsing + AI integration
