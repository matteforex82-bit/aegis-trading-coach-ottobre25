# Trading Setups Import - README

## 📁 Directory Purpose

This directory contains YAML files for bulk importing Elliott Wave trading setups into the AEGIS Trading Coach platform.

## 🚀 Quick Start

### For Admins:

1. **Create your setups file**
   ```bash
   cp trading-setups.example.yml trading-setups.yml
   ```

2. **Edit the file** with your trading setups

3. **Upload via Admin Panel**
   - Go to: `/dashboard/admin/trading-room`
   - Click "Import" tab
   - Drag & drop your YAML file
   - Review preview
   - Confirm import

### For AI Analysis:

If you're using AI to analyze PDF reports and generate trading setups:

**Prompt Template:**
```
Analyze this Elliott Wave trading PDF and generate a YAML file following
the AEGIS Trading Coach format. Use the template in
data/trading-setups.example.yml as reference.

Required fields for each setup:
- category (FOREX/INDICES/COMMODITIES/BITCOIN)
- symbol (e.g., EURUSD, US30, XAUUSD, BTCUSD)
- direction (BUY/SELL/NEUTRAL)
- timeframe (e.g., "4h", "1D", "8h")
- entryPrice (decimal number)
- stopLoss (decimal number)
- analysisDate (YYYY-MM-DD format)

Optional but recommended:
- wavePattern, waveCount
- takeProfit1, takeProfit2, takeProfit3
- invalidation
- notes (detailed analysis)

Generate valid YAML output only.
```

## 📋 File Format

### Structure
```yaml
metadata:
  version: "1.0"
  author: "Your Name"
  importDate: "2025-10-19"
  source: "Analysis source description"

setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    # ... other fields
```

### Required Fields
- `category` - Asset type (FOREX, INDICES, COMMODITIES, BITCOIN)
- `symbol` - Trading symbol (will be auto-capitalized)
- `direction` - Trade direction (BUY, SELL, NEUTRAL)
- `timeframe` - Time interval (e.g., "1h", "4h", "1D")
- `entryPrice` - Entry price level (decimal number)
- `stopLoss` - Stop loss price (decimal number)
- `analysisDate` - Date of analysis (YYYY-MM-DD)

### Optional Fields
- `wavePattern` - Elliott Wave pattern description
- `waveCount` - Wave count notation
- `takeProfit1`, `takeProfit2`, `takeProfit3` - Target levels
- `invalidation` - Setup invalidation price
- `expiresAt` - Setup expiration date
- `notes` - Detailed analysis notes (multi-line with `|`)
- `pdfUrl` - Link to original analysis PDF
- `isPremium` - Whether setup is premium (default: true)
- `requiredPlan` - Required subscription plan (default: PRO)
- `isActive` - Whether setup is active (default: true)

## 🔍 Validation Rules

### Data Types
- Prices: Positive decimal numbers (> 0)
- Dates: ISO format YYYY-MM-DD
- Enums: Must match exact values (case-sensitive)

### Constraints
- `analysisDate` ≤ today's date
- `expiresAt` > `analysisDate` (if provided)
- All prices must be > 0
- `symbol` auto-normalized: uppercase, trimmed

## 🔄 Import Behavior

### Duplicate Detection
Setups are compared using: **symbol + entryPrice + stopLoss**

**If duplicate found:**
- Same entry & SL → Only `analysisDate` updated
- Different entry/SL → Complete UPDATE of all fields

**If new setup:**
- INSERT into database

**Existing setups not in file:**
- Left unchanged (not deactivated or deleted)

### Error Handling
- Invalid setups shown in preview with error details
- You can choose to:
  - Import only valid setups
  - Fix errors and re-upload
  - Cancel import

## 📊 Example Workflows

### Workflow 1: Weekly Analysis Update
```bash
# 1. Get latest analysis PDF
# 2. AI generates YAML from PDF
# 3. Save as trading-setups-week-42.yml
# 4. Upload via admin panel
# 5. Review preview
# 6. Confirm import
```

### Workflow 2: Single Setup Quick Add
```yaml
setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h
    entryPrice: 1.0850
    stopLoss: 1.0800
    analysisDate: "2025-10-19"
```

### Workflow 3: Bulk Historical Import
```yaml
# Import 50+ historical setups for backtesting
setups:
  - category: FOREX
    symbol: EURUSD
    # ... setup 1
  - category: FOREX
    symbol: GBPUSD
    # ... setup 2
  # ... (continue for all setups)
```

## 🛡️ Security Notes

- YAML files in this directory are **git-ignored** by default
- Only admin users can import setups
- File validation happens before database writes
- Import is atomic (all-or-nothing transaction)

## 📝 Naming Conventions

Recommended file naming:
```
trading-setups-YYYY-MM-DD.yml          # Date-based
trading-setups-week-XX.yml             # Weekly batch
trading-setups-forex-october.yml       # Category + month
trading-setups-emergency-update.yml    # Ad-hoc updates
```

## 🆘 Troubleshooting

### "Invalid YAML syntax"
- Check indentation (2 spaces, not tabs)
- Ensure quotes around special characters
- Validate YAML at: https://www.yamllint.com/

### "Missing required field"
- All 7 required fields must be present for each setup
- Check spelling and capitalization

### "Invalid enum value"
- `category`: Must be exactly FOREX, INDICES, COMMODITIES, or BITCOIN
- `direction`: Must be exactly BUY, SELL, or NEUTRAL
- `requiredPlan`: Must be FREE, STARTER, PRO, or ENTERPRISE

### "Invalid date format"
- Use ISO format: YYYY-MM-DD
- Example: "2025-10-19"

### "Duplicate detected but not updating"
- Check that symbol + entryPrice + stopLoss match exactly
- Price decimal precision matters (0.65234 ≠ 0.6523)

## 🔗 Related Documentation

- [Admin Trading Room Guide](../docs/admin-trading-room.md)
- [Elliott Wave Analysis Guide](../docs/elliott-wave.md)
- [YAML Specification](https://yaml.org/spec/)

## 💬 Support

For issues or questions:
1. Check this README
2. Review `trading-setups.example.yml`
3. Contact dev team

---

**Last Updated:** 2025-10-19
**Version:** 1.0
