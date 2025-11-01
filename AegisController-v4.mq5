//+------------------------------------------------------------------+
//|                                         AegisController-v4.mq5   |
//|                           AEGIS Trading Coach - Unified EA       |
//|          Complete Solution: Sync + Execution + Symbol Specs      |
//+------------------------------------------------------------------+
#property copyright "AEGIS Trading Coach"
#property link      "https://aegis-trading-coach.vercel.app"
#property version   "4.00"
#property strict
#property description "Unified EA: Data Sync + Order Execution + Symbol Sync"
#property description "Replaces both PropControlExporter-v3 and AegisExecutionController"

//+------------------------------------------------------------------+
//| Input Parameters                                                 |
//+------------------------------------------------------------------+
// API Configuration
input string API_URL = "https://aegis-trading-coach.vercel.app";
input string API_KEY = "";  // Generate via: Dashboard > Accounts

// Sync Configuration
input int    SYNC_INTERVAL_SECONDS = 60;
input bool   SYNC_OPEN_POSITIONS = true;
input bool   SYNC_CLOSED_TRADES = true;
input bool   SYNC_METRICS = true;

// Execution Configuration
input bool   ENABLE_AUTO_EXECUTION = true;
input int    ORDER_POLL_INTERVAL_SECONDS = 10;

// Monitor Configuration
input bool   ENABLE_INVALIDATION_MONITOR = true;
input int    INVALIDATION_CHECK_SEC = 1;
input bool   ENABLE_DRAWDOWN_MONITOR = true;
input int    DRAWDOWN_CHECK_SEC = 60;
input bool   ENABLE_ORDER_LOCK = true;

// Account Configuration
input string PROP_FIRM_NAME = "";
input string ACCOUNT_PHASE = "DEMO";
input double ACCOUNT_START_BALANCE = 0;

// Logging
input bool   ENABLE_LOGGING = true;

//+------------------------------------------------------------------+
//| Global Variables                                                 |
//+------------------------------------------------------------------+
// Sync tracking
datetime lastSyncTime = 0;
datetime lastFullSyncCheck = 0;
int      syncAttempts = 0;
int      successfulSyncs = 0;
int      failedSyncs = 0;
bool     isFirstSync = true;
string   lastSyncedTicket = "0";

// Execution tracking
datetime lastOrderPollTime = 0;
int      totalExecutions = 0;
int      failedExecutions = 0;

// Monitor tracking
datetime lastInvalidationCheck = 0;
datetime lastDrawdownCheck = 0;
int      totalInvalidations = 0;
int      totalLockEnforcements = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("=======================================================");
    Print("🚀 AEGIS CONTROLLER v4.0 STARTED");
    Print("=======================================================");
    Print("✨ Unified EA: Sync + Execution + Symbol Specs");
    Print("-------------------------------------------------------");
    Print("API URL: ", API_URL);
    Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("Broker: ", AccountInfoString(ACCOUNT_COMPANY));
    Print("Server: ", AccountInfoString(ACCOUNT_SERVER));
    Print("-------------------------------------------------------");
    Print("📊 Data Sync:");
    Print("  • Sync Interval: ", SYNC_INTERVAL_SECONDS, "s");
    Print("  • Positions: ", SYNC_OPEN_POSITIONS ? "✓" : "✗");
    Print("  • Trades: ", SYNC_CLOSED_TRADES ? "✓" : "✗");
    Print("  • Metrics: ", SYNC_METRICS ? "✓" : "✗");
    Print("-------------------------------------------------------");
    Print("⚡ Order Execution:");
    Print("  • Auto-Execution: ", ENABLE_AUTO_EXECUTION ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Poll Interval: ", ORDER_POLL_INTERVAL_SECONDS, "s");
    Print("-------------------------------------------------------");
    Print("🛡️  Monitors:");
    Print("  • Invalidation: ", ENABLE_INVALIDATION_MONITOR ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Drawdown: ", ENABLE_DRAWDOWN_MONITOR ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Order Lock: ", ENABLE_ORDER_LOCK ? "✓ ENABLED" : "✗ DISABLED");
    Print("=======================================================");

    // Check connection first
    if(!TerminalInfoInteger(TERMINAL_CONNECTED)) {
        Print("❌ ERROR: No connection to trade server");
        return(INIT_FAILED);
    }

    // Check if API Key is set - if not, try auto-registration
    if(API_KEY == "") {
        Print("⚠️  API_KEY not set - attempting auto-registration...");
        Print("📡 Connecting to AEGIS server...");

        bool registered = AttemptAutoRegistration();

        if(!registered) {
            Print("❌ Auto-registration failed!");
            Print("⚠️  Please register manually:");
            Print("   1. Go to: ", API_URL);
            Print("   2. Dashboard > Accounts > Add Account");
            Print("   3. Enter your account details");
            Print("   4. Copy the API Key");
            Print("   5. Paste it in EA settings > API_KEY");
            return(INIT_FAILED);
        }

        Print("✅ Auto-registration successful!");
        Print("⚠️  IMPORTANT: Copy the API Key from the logs above");
        Print("⚠️  Then paste it in EA settings and restart the EA");
        return(INIT_FAILED); // Stop here so user can copy the key
    }

    Print("✅ API Key configured");
    Print("📊 Preparing for first-time full history sync...");
    Print("🔧 Will sync symbol specifications...");
    Print("📥 Order execution polling enabled");

    // Set timer to 1 second (fastest check)
    EventSetTimer(1);

    // Schedule immediate first sync
    lastSyncTime = TimeCurrent() - SYNC_INTERVAL_SECONDS;

    // Send symbol specifications immediately
    SendSymbolSpecifications();

    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();

    Print("=======================================================");
    Print("🛑 AEGIS CONTROLLER v4.0 STOPPED");
    Print("=======================================================");
    Print("📊 Sync Statistics:");
    Print("  • Total Attempts: ", syncAttempts);
    Print("  • Successful: ", successfulSyncs);
    Print("  • Failed: ", failedSyncs);
    Print("-------------------------------------------------------");
    Print("⚡ Execution Statistics:");
    Print("  • Total Executions: ", totalExecutions);
    Print("  • Failed Executions: ", failedExecutions);
    Print("-------------------------------------------------------");
    Print("🛡️  Monitor Statistics:");
    Print("  • Invalidations: ", totalInvalidations);
    Print("  • Lock Enforcements: ", totalLockEnforcements);
    Print("=======================================================");
}

//+------------------------------------------------------------------+
//| Timer function - Main orchestrator                               |
//+------------------------------------------------------------------+
void OnTimer() {
    datetime now = TimeCurrent();

    // PRIORITY 1: Invalidation check (fastest - every 1 second)
    if(ENABLE_INVALIDATION_MONITOR && (now - lastInvalidationCheck) >= INVALIDATION_CHECK_SEC) {
        MonitorInvalidation();
        lastInvalidationCheck = now;
    }

    // PRIORITY 2: Check for pending orders (every ORDER_POLL_INTERVAL_SECONDS)
    if(ENABLE_AUTO_EXECUTION && (now - lastOrderPollTime) >= ORDER_POLL_INTERVAL_SECONDS) {
        CheckAndExecutePendingOrders();
        lastOrderPollTime = now;
    }

    // PRIORITY 3: Drawdown check
    if(ENABLE_DRAWDOWN_MONITOR && (now - lastDrawdownCheck) >= DRAWDOWN_CHECK_SEC) {
        MonitorDrawdown();
        lastDrawdownCheck = now;
    }

    // PRIORITY 4: Regular data sync
    if((now - lastSyncTime) < SYNC_INTERVAL_SECONDS) {
        return;
    }

    syncAttempts++;

    // PHASE 1: First-Time Full Sync
    if(isFirstSync) {
        Print("\n🔵 PHASE 1: First-Time Full History Sync");
        Print("==================================================");
        PerformFullHistorySync();
        isFirstSync = false;
        lastSyncTime = now;
        return;
    }

    // PHASE 2: Regular Real-Time Sync
    if(ENABLE_LOGGING) {
        Print("\n🟢 PHASE 2: Real-Time Sync");
    }
    PerformRegularSync();

    // PHASE 3: Incremental Check (every 5 minutes)
    if((now - lastFullSyncCheck) > 300) {
        if(ENABLE_LOGGING) {
            Print("\n🟡 PHASE 3: Incremental Safety Check");
        }
        PerformIncrementalCheck();
        lastFullSyncCheck = now;
    }

    lastSyncTime = now;
}

//+------------------------------------------------------------------+
//| Send Symbol Specifications to Server                             |
//| Called once at EA startup to sync all available symbols          |
//+------------------------------------------------------------------+
void SendSymbolSpecifications() {
    Print("\n📊 Syncing symbol specifications to server...");

    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    int totalSymbols = SymbolsTotal(true);

    if(totalSymbols == 0) {
        Print("⚠️  No symbols available in Market Watch");
        return;
    }

    Print("📈 Found ", totalSymbols, " symbols in Market Watch");

    // Build JSON array of symbol specifications
    string symbolsJson = "[";
    int validSymbols = 0;

    for(int i = 0; i < totalSymbols; i++) {
        string symbol = SymbolName(i, true);

        // Ensure symbol is selected
        if(!SymbolSelect(symbol, true)) {
            continue;
        }

        // Get symbol specifications
        int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
        double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        int stopLevel = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
        int freezeLevel = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL);
        int spread = (int)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
        int tradeMode = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE);
        string description = SymbolInfoString(symbol, SYMBOL_DESCRIPTION);

        // Get swap costs
        double swapLong = SymbolInfoDouble(symbol, SYMBOL_SWAP_LONG);
        double swapShort = SymbolInfoDouble(symbol, SYMBOL_SWAP_SHORT);
        int swapMode = (int)SymbolInfoInteger(symbol, SYMBOL_SWAP_MODE);

        // Get tick information
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

        // Get currency information
        string currencyBase = SymbolInfoString(symbol, SYMBOL_CURRENCY_BASE);
        string currencyProfit = SymbolInfoString(symbol, SYMBOL_CURRENCY_PROFIT);
        string currencyMargin = SymbolInfoString(symbol, SYMBOL_CURRENCY_MARGIN);

        // Determine trade mode string
        string tradeModeStr = "DISABLED";
        if(tradeMode == SYMBOL_TRADE_MODE_FULL) tradeModeStr = "FULL";
        else if(tradeMode == SYMBOL_TRADE_MODE_CLOSEONLY) tradeModeStr = "CLOSE_ONLY";

        // Determine swap type string
        string swapTypeStr = "POINTS";
        if(swapMode == SYMBOL_SWAP_MODE_POINTS) swapTypeStr = "POINTS";
        else if(swapMode == SYMBOL_SWAP_MODE_CURRENCY_SYMBOL) swapTypeStr = "CURRENCY_BASE";
        else if(swapMode == SYMBOL_SWAP_MODE_CURRENCY_MARGIN) swapTypeStr = "CURRENCY_MARGIN";
        else if(swapMode == SYMBOL_SWAP_MODE_CURRENCY_DEPOSIT) swapTypeStr = "CURRENCY_PROFIT";
        else if(swapMode == SYMBOL_SWAP_MODE_INTEREST_CURRENT) swapTypeStr = "PERCENT_OPEN";
        else if(swapMode == SYMBOL_SWAP_MODE_INTEREST_OPEN) swapTypeStr = "PERCENT_ANNUAL";

        // Escape strings for JSON
        StringReplace(description, "\"", "\\\"");
        StringReplace(description, "\\", "\\\\");

        // Build JSON object for this symbol
        if(validSymbols > 0) symbolsJson += ",";

        symbolsJson += "{";
        symbolsJson += "\"symbol\":\"" + symbol + "\",";
        symbolsJson += "\"description\":\"" + description + "\",";
        symbolsJson += "\"digits\":" + IntegerToString(digits) + ",";
        symbolsJson += "\"point\":" + DoubleToString(point, digits+2) + ",";
        symbolsJson += "\"contractSize\":" + DoubleToString(contractSize, 2) + ",";
        symbolsJson += "\"minLot\":" + DoubleToString(minLot, 2) + ",";
        symbolsJson += "\"maxLot\":" + DoubleToString(maxLot, 2) + ",";
        symbolsJson += "\"lotStep\":" + DoubleToString(lotStep, 2) + ",";
        symbolsJson += "\"stopLevel\":" + IntegerToString(stopLevel) + ",";
        symbolsJson += "\"freezeLevel\":" + IntegerToString(freezeLevel) + ",";
        symbolsJson += "\"tradeMode\":\"" + tradeModeStr + "\",";
        symbolsJson += "\"spread\":" + IntegerToString(spread) + ",";
        // Swap costs
        symbolsJson += "\"swapLong\":" + DoubleToString(swapLong, 2) + ",";
        symbolsJson += "\"swapShort\":" + DoubleToString(swapShort, 2) + ",";
        symbolsJson += "\"swapType\":\"" + swapTypeStr + "\",";
        // Tick information
        symbolsJson += "\"tickValue\":" + DoubleToString(tickValue, 5) + ",";
        symbolsJson += "\"tickSize\":" + DoubleToString(tickSize, digits) + ",";
        // Currency information
        symbolsJson += "\"currencyBase\":\"" + currencyBase + "\",";
        symbolsJson += "\"currencyProfit\":\"" + currencyProfit + "\",";
        symbolsJson += "\"currencyMargin\":\"" + currencyMargin + "\"";
        symbolsJson += "}";

        validSymbols++;
    }

    symbolsJson += "]";

    if(validSymbols == 0) {
        Print("❌ No valid symbols to sync");
        return;
    }

    // Build request body
    string jsonData = "{";
    jsonData += "\"accountLogin\":\"" + accountLogin + "\",";
    jsonData += "\"symbols\":" + symbolsJson;
    jsonData += "}";

    // Send to server
    string url = API_URL + "/api/mt5/symbols/sync";
    string headers = "Content-Type: application/json\r\n";
    headers += "X-API-Key: " + API_KEY + "\r\n";

    char post[], result[];
    string responseHeaders;
    StringToCharArray(jsonData, post, 0, StringLen(jsonData));

    int timeout = 30000; // 30 seconds timeout for symbol sync
    int res = WebRequest(
        "POST",
        url,
        headers,
        timeout,
        post,
        result,
        responseHeaders
    );

    if(res == 200) {
        string response = CharArrayToString(result);
        Print("✅ Symbol sync successful! Synced ", validSymbols, " symbols");
        if(ENABLE_LOGGING) {
            Print("📋 Server response: ", response);
        }
    } else {
        Print("❌ Symbol sync failed with code: ", res);
        if(ENABLE_LOGGING && ArraySize(result) > 0) {
            string errorResponse = CharArrayToString(result);
            Print("❌ Error response: ", errorResponse);
        }
    }
}

//+------------------------------------------------------------------+
//| PHASE 1: Full History Sync (runs ONCE on first connection)      |
//+------------------------------------------------------------------+
void PerformFullHistorySync() {
    Print("📥 Syncing ALL historical trades (no limit)...");

    HistorySelect(0, TimeCurrent());
    int totalDeals = HistoryDealsTotal();

    Print("   Found ", totalDeals, " total deals in MT5 history");

    // Build JSON with ALL trades
    string json = "{";
    json += "\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"syncType\":\"FULL_HISTORY\",";
    json += "\"totalDeals\":" + IntegerToString(totalDeals) + ",";

    // Account info
    json += "\"account\":{";
    json += "\"login\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"broker\":\"" + AccountInfoString(ACCOUNT_COMPANY) + "\",";
    json += "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
    json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";
    json += "},";

    // Open Positions (if enabled)
    if(SYNC_OPEN_POSITIONS) {
        json += "\"openPositions\":[";
        int totalPositions = PositionsTotal();
        for(int i = 0; i < totalPositions; i++) {
            ulong ticket = PositionGetTicket(i);
            if(PositionSelectByTicket(ticket)) {
                if(i > 0) json += ",";
                json += BuildPositionJSON(ticket);
            }
        }
        json += "],";
    }

    // ALL Closed Trades (NO LIMIT for first sync!)
    if(SYNC_CLOSED_TRADES) {
        json += "\"trades\":[";
        int count = 0;

        for(int i = totalDeals - 1; i >= 0; i--) {
            ulong ticket = HistoryDealGetTicket(i);
            if(ticket > 0) {
                if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
                    if(count > 0) json += ",";
                    json += BuildTradeJSON(ticket);
                    count++;

                    // Update last synced ticket
                    if(count == 1) {
                        lastSyncedTicket = IntegerToString(ticket);
                    }
                }
            }
        }
        json += "],";

        Print("   Synced ", count, " closed trades");
    }

    // Metrics
    if(SYNC_METRICS) {
        json += "\"metrics\":" + BuildMetricsJSON();
    }

    json += "}";

    // Send to server
    bool success = SendToServer(json);

    if(success) {
        Print("✅ Full history sync completed successfully!");
        Print("   Last synced ticket: ", lastSyncedTicket);
        successfulSyncs++;
    } else {
        Print("❌ Full history sync failed - will retry on next cycle");
        failedSyncs++;
        isFirstSync = true; // Retry full sync next time
    }
}

//+------------------------------------------------------------------+
//| PHASE 2: Regular Real-Time Sync (positions + last 100 trades)   |
//+------------------------------------------------------------------+
void PerformRegularSync() {
    string json = "{";
    json += "\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"syncType\":\"REALTIME\",";

    // Account info
    json += "\"account\":{";
    json += "\"login\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"broker\":\"" + AccountInfoString(ACCOUNT_COMPANY) + "\",";
    json += "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
    json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";
    json += "},";

    // Open Positions
    if(SYNC_OPEN_POSITIONS) {
        json += "\"openPositions\":[";
        int totalPositions = PositionsTotal();
        for(int i = 0; i < totalPositions; i++) {
            ulong ticket = PositionGetTicket(i);
            if(PositionSelectByTicket(ticket)) {
                if(i > 0) json += ",";
                json += BuildPositionJSON(ticket);
            }
        }
        json += "],";
    }

    // Recent Closed Trades (last 100 for performance)
    if(SYNC_CLOSED_TRADES) {
        HistorySelect(0, TimeCurrent());
        int totalDeals = HistoryDealsTotal();

        json += "\"trades\":[";
        int count = 0;
        int maxTrades = 100;

        for(int i = totalDeals - 1; i >= 0 && count < maxTrades; i--) {
            ulong ticket = HistoryDealGetTicket(i);
            if(ticket > 0) {
                if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
                    if(count > 0) json += ",";
                    json += BuildTradeJSON(ticket);
                    count++;

                    // Update last synced ticket
                    if(count == 1) {
                        lastSyncedTicket = IntegerToString(ticket);
                    }
                }
            }
        }
        json += "],";
    }

    // Metrics
    if(SYNC_METRICS) {
        json += "\"metrics\":" + BuildMetricsJSON();
    }

    json += "}";

    // Send to server
    bool success = SendToServer(json);

    if(success) {
        successfulSyncs++;
        if(ENABLE_LOGGING) {
            Print("✅ Real-time sync completed");
        }
    } else {
        failedSyncs++;
        Print("❌ Sync failed - will retry");
    }
}

//+------------------------------------------------------------------+
//| PHASE 3: Incremental Check (safety net for missed trades)       |
//+------------------------------------------------------------------+
void PerformIncrementalCheck() {
    Print("🔍 Checking for missed trades...");

    string json = "{";
    json += "\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"syncType\":\"INCREMENTAL\",";
    json += "\"lastKnownTicket\":\"" + lastSyncedTicket + "\",";

    // Get trades AFTER lastSyncedTicket
    HistorySelect(0, TimeCurrent());
    int totalDeals = HistoryDealsTotal();

    json += "\"trades\":[";
    int count = 0;
    bool foundLastTicket = false;

    for(int i = totalDeals - 1; i >= 0; i--) {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket > 0) {
            if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
                // If this is the last synced ticket, stop here
                if(IntegerToString(ticket) == lastSyncedTicket) {
                    foundLastTicket = true;
                    break;
                }

                if(count > 0) json += ",";
                json += BuildTradeJSON(ticket);
                count++;
            }
        }
    }
    json += "]";
    json += "}";

    if(count > 0) {
        Print("   Found ", count, " new trades to sync");
        SendToServer(json);
    } else {
        Print("   No new trades to sync - all up to date ✅");
    }
}

//+------------------------------------------------------------------+
//| Helper: Build Position JSON                                      |
//+------------------------------------------------------------------+
string BuildPositionJSON(ulong ticket) {
    string json = "{";
    json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
    json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
    json += "\"type\":\"" + GetPositionType() + "\",";
    json += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
    json += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
    json += "\"openTime\":\"" + TimeToString(PositionGetInteger(POSITION_TIME), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
    json += "\"commission\":0,";
    json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
    json += "\"stopLoss\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5) + ",";
    json += "\"takeProfit\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5);
    json += "}";
    return json;
}

//+------------------------------------------------------------------+
//| Helper: Build Trade JSON                                         |
//+------------------------------------------------------------------+
string BuildTradeJSON(ulong ticket) {
    string json = "{";
    json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
    json += "\"symbol\":\"" + HistoryDealGetString(ticket, DEAL_SYMBOL) + "\",";
    json += "\"type\":\"" + GetDealType(ticket) + "\",";
    json += "\"volume\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + ",";
    json += "\"openPrice\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + ",";
    json += "\"closePrice\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + ",";
    json += "\"openTime\":\"" + TimeToString(HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"closeTime\":\"" + TimeToString(HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"profit\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + ",";
    json += "\"commission\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2) + ",";
    json += "\"swap\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_SWAP), 2);
    json += "}";
    return json;
}

//+------------------------------------------------------------------+
//| Helper: Build Metrics JSON                                       |
//+------------------------------------------------------------------+
string BuildMetricsJSON() {
    double profit = AccountInfoDouble(ACCOUNT_BALANCE) - ACCOUNT_START_BALANCE;
    double drawdown = CalculateDrawdown();

    int totalTrades = 0;
    int winningTrades = 0;
    int losingTrades = 0;

    HistorySelect(0, TimeCurrent());
    int totalDeals = HistoryDealsTotal();

    for(int i = 0; i < totalDeals; i++) {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket > 0 && HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
            totalTrades++;
            double dealProfit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
            if(dealProfit > 0) winningTrades++;
            else if(dealProfit < 0) losingTrades++;
        }
    }

    double winRate = (totalTrades > 0) ? ((double)winningTrades / totalTrades) * 100 : 0;

    string json = "{";
    json += "\"totalTrades\":" + IntegerToString(totalTrades) + ",";
    json += "\"winningTrades\":" + IntegerToString(winningTrades) + ",";
    json += "\"losingTrades\":" + IntegerToString(losingTrades) + ",";
    json += "\"winRate\":" + DoubleToString(winRate, 2) + ",";
    json += "\"profit\":" + DoubleToString(profit, 2) + ",";
    json += "\"drawdown\":" + DoubleToString(drawdown, 2);
    json += "}";

    return json;
}

//+------------------------------------------------------------------+
//| Helper: Calculate Drawdown                                       |
//+------------------------------------------------------------------+
double CalculateDrawdown() {
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double drawdown = balance - equity;
    return drawdown;
}

//+------------------------------------------------------------------+
//| Helper: Get position type as string                             |
//+------------------------------------------------------------------+
string GetPositionType() {
    ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
    return (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
}

//+------------------------------------------------------------------+
//| Helper: Get deal type as string                                 |
//+------------------------------------------------------------------+
string GetDealType(ulong ticket) {
    ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
    if(type == DEAL_TYPE_BUY) return "BUY";
    if(type == DEAL_TYPE_SELL) return "SELL";
    return "UNKNOWN";
}

//+------------------------------------------------------------------+
//| Helper: Send data to AEGIS server                               |
//+------------------------------------------------------------------+
bool SendToServer(string jsonData) {
    char send_data[];
    char result_data[];
    string result_headers;
    int timeout = 5000;

    // Convert JSON string to char array
    StringToCharArray(jsonData, send_data, 0, StringLen(jsonData));

    // Request headers
    string request_headers = "Content-Type: application/json\r\n";
    request_headers += "X-API-Key: " + API_KEY + "\r\n";

    // Send to data sync endpoint
    string url = API_URL + "/api/mt5/data-sync";
    int res = WebRequest("POST", url, request_headers, timeout, send_data, result_data, result_headers);

    if(res == 200) {
        if(ENABLE_LOGGING) {
            string response = CharArrayToString(result_data);
            Print("✅ Server response: ", response);
        }
        return true;
    } else {
        Print("❌ Server error: HTTP ", res);
        if(res == -1) {
            Print("   Error code: ", GetLastError());
            Print("   Make sure ", API_URL, " is allowed in Tools > Options > Expert Advisors");
        }
        return false;
    }
}

//+------------------------------------------------------------------+
//| Check and execute pending orders from server                    |
//+------------------------------------------------------------------+
void CheckAndExecutePendingOrders() {
    if(ENABLE_LOGGING) {
        Print("📡 Polling pending orders from server...");
    }

    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    string url = API_URL + "/api/mt5/pending-orders?accountLogin=" + accountLogin;
    string headers = "X-API-Key: " + API_KEY + "\r\n";

    char post[];
    char result[];
    string responseHeaders;
    int timeout = 5000;

    int res = WebRequest(
        "GET",
        url,
        headers,
        timeout,
        post,
        result,
        responseHeaders
    );

    if(res == 200) {
        string jsonResponse = CharArrayToString(result);

        if(ENABLE_LOGGING) {
            Print("✅ Server response received: ", StringLen(jsonResponse), " bytes");
        }

        // TODO: Parse JSON and execute orders

    } else {
        if(ENABLE_LOGGING) {
            Print("⚠️  Polling failed with code: ", res);
            if(res == -1) {
                Print("ERROR: ", GetLastError());
                Print("Make sure WebRequest is enabled for: ", API_URL);
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Monitor invalidation prices for all open positions              |
//+------------------------------------------------------------------+
void MonitorInvalidation() {
    int totalPositions = PositionsTotal();

    for(int i = 0; i < totalPositions; i++) {
        ulong ticket = PositionGetTicket(i);
        if(PositionSelectByTicket(ticket)) {
            string symbol = PositionGetString(POSITION_SYMBOL);
            ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

            // TODO: Get invalidation price for this order from server/comment
            double invalidationPrice = 0;

            if(invalidationPrice == 0) continue;

            // Get current price
            double currentPrice;
            if(posType == POSITION_TYPE_BUY) {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

                if(currentPrice <= invalidationPrice) {
                    TriggerInvalidation(ticket, currentPrice, invalidationPrice);
                }
            } else {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);

                if(currentPrice >= invalidationPrice) {
                    TriggerInvalidation(ticket, currentPrice, invalidationPrice);
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Trigger invalidation - close position immediately               |
//+------------------------------------------------------------------+
void TriggerInvalidation(ulong ticket, double currentPrice, double invalidationPrice) {
    totalInvalidations++;

    if(ENABLE_LOGGING) {
        Print("⚠️  INVALIDATION TRIGGERED!");
        Print("   Ticket: #", ticket);
        Print("   Current Price: ", currentPrice);
        Print("   Invalidation Price: ", invalidationPrice);
        Print("   Closing position immediately...");
    }

    MqlTradeRequest request;
    MqlTradeResult  result;
    ZeroMemory(request);
    ZeroMemory(result);

    request.action = TRADE_ACTION_DEAL;
    request.position = ticket;
    request.symbol = PositionGetString(POSITION_SYMBOL);
    request.volume = PositionGetDouble(POSITION_VOLUME);
    request.type = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
    request.price = currentPrice;
    request.deviation = 20;
    request.comment = "AEGIS: Invalidation";

    if(OrderSend(request, result)) {
        double finalPnL = PositionGetDouble(POSITION_PROFIT);

        if(ENABLE_LOGGING) {
            Print("✅ Position closed due to invalidation");
            Print("   Final P&L: $", finalPnL);
        }
    } else {
        Print("❌ Failed to close position: ", GetLastError());
    }
}

//+------------------------------------------------------------------+
//| Monitor drawdown and send snapshot to server                    |
//+------------------------------------------------------------------+
void MonitorDrawdown() {
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double floatingPnL = equity - balance;
    double closedPnL = CalculateTodayClosedPnL();
    double dailyDrawdown = closedPnL + floatingPnL;

    if(ENABLE_LOGGING) {
        Print("📊 Drawdown Check:");
        Print("   Balance: $", balance);
        Print("   Equity: $", equity);
        Print("   Floating P&L: $", floatingPnL);
        Print("   Closed P&L (today): $", closedPnL);
        Print("   Daily Drawdown: $", dailyDrawdown);
    }

    // TODO: Send snapshot to server
}

//+------------------------------------------------------------------+
//| Calculate today's closed P&L                                     |
//+------------------------------------------------------------------+
double CalculateTodayClosedPnL() {
    datetime todayStart = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));

    HistorySelect(todayStart, TimeCurrent());
    int totalDeals = HistoryDealsTotal();

    double totalPnL = 0;

    for(int i = 0; i < totalDeals; i++) {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket > 0 && HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
            totalPnL += HistoryDealGetDouble(ticket, DEAL_PROFIT);
        }
    }

    return totalPnL;
}

//+------------------------------------------------------------------+
//| Attempt auto-registration with AEGIS server                     |
//| Returns true if successful, false otherwise                     |
//+------------------------------------------------------------------+
bool AttemptAutoRegistration() {
    Print("📝 Preparing account registration...");

    // Collect account information
    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    string broker = AccountInfoString(ACCOUNT_COMPANY);
    string server = AccountInfoString(ACCOUNT_SERVER);
    string currency = AccountInfoString(ACCOUNT_CURRENCY);
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    string accountName = broker + " - " + accountLogin;

    // Build JSON payload
    string jsonData = "{";
    jsonData += "\"accountLogin\":\"" + accountLogin + "\",";
    jsonData += "\"broker\":\"" + broker + "\",";
    jsonData += "\"server\":\"" + server + "\",";
    jsonData += "\"currency\":\"" + currency + "\",";
    jsonData += "\"balance\":" + DoubleToString(balance, 2) + ",";
    jsonData += "\"accountName\":\"" + accountName + "\"";
    jsonData += "}";

    // Prepare request
    string url = API_URL + "/api/mt5/connect";
    string headers = "Content-Type: application/json\r\n";

    char post[], result[];
    string responseHeaders;
    StringToCharArray(jsonData, post, 0, StringLen(jsonData));

    int timeout = 10000; // 10 seconds for registration
    int res = WebRequest(
        "POST",
        url,
        headers,
        timeout,
        post,
        result,
        responseHeaders
    );

    if(res == 200) {
        string response = CharArrayToString(result);

        Print("✅ Registration successful!");
        Print("=======================================================");
        Print("🔑 YOUR API KEY (COPY THIS):");
        Print("=======================================================");

        // Parse API key from JSON response
        // Simple parsing: find "apiKey":"..." pattern
        int keyStart = StringFind(response, "\"apiKey\":\"");
        if(keyStart >= 0) {
            keyStart += 10; // Length of "apiKey":"
            int keyEnd = StringFind(response, "\"", keyStart);
            if(keyEnd > keyStart) {
                string apiKey = StringSubstr(response, keyStart, keyEnd - keyStart);
                Print("📋 ", apiKey);
                Print("=======================================================");
                Print("");
                Print("⚠️  IMPORTANT NEXT STEPS:");
                Print("   1. COPY the API key above");
                Print("   2. Right-click on EA > Properties");
                Print("   3. Go to 'Inputs' tab");
                Print("   4. Paste the key in 'API_KEY' field");
                Print("   5. Click OK to restart the EA");
                Print("=======================================================");

                return true;
            }
        }

        // If parsing failed, print raw response
        Print("📋 Response: ", response);
        Print("=======================================================");
        Print("⚠️  Please find and copy the API key from the response above");

        return true;
    } else if(res == 409) {
        // Account already exists
        Print("⚠️  Account already registered!");
        Print("   Please retrieve your API key from the dashboard:");
        Print("   ", API_URL, "/dashboard/accounts");
        return false;
    } else {
        Print("❌ Registration failed with HTTP code: ", res);
        if(res == -1) {
            Print("   Error: ", GetLastError());
            Print("   Make sure ", API_URL, " is allowed in:");
            Print("   Tools > Options > Expert Advisors > Allow WebRequest for:");
            Print("   ", API_URL);
        }
        if(ArraySize(result) > 0) {
            string errorResponse = CharArrayToString(result);
            Print("   Server response: ", errorResponse);
        }
        return false;
    }
}
//+------------------------------------------------------------------+
