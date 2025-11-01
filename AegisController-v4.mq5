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

        // Parse JSON and check for orders
        if(StringFind(jsonResponse, "\"ordersCount\":0") >= 0) {
            if(ENABLE_LOGGING) {
                Print("   No pending orders to execute");
            }
            return;
        }

        // Extract orders count
        int ordersCountPos = StringFind(jsonResponse, "\"ordersCount\":");
        if(ordersCountPos < 0) return;

        int ordersCount = 0;
        string ordersCountStr = "";
        int numStart = ordersCountPos + 15; // Skip "ordersCount":
        for(int i = numStart; i < StringLen(jsonResponse); i++) {
            string char = StringSubstr(jsonResponse, i, 1);
            if(char >= "0" && char <= "9") {
                ordersCountStr += char;
            } else {
                break;
            }
        }
        ordersCount = (int)StringToInteger(ordersCountStr);

        if(ordersCount > 0) {
            Print("📋 Found ", ordersCount, " pending order(s) to execute");

            // Find orders array
            int ordersArrayStart = StringFind(jsonResponse, "\"orders\":[");
            if(ordersArrayStart >= 0) {
                ProcessPendingOrders(jsonResponse, ordersArrayStart);
            }
        }

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
//| Process pending orders from JSON response                        |
//+------------------------------------------------------------------+
void ProcessPendingOrders(string jsonResponse, int startPos) {
    // Simple JSON parsing - extract each order object
    int currentPos = startPos + 10; // Skip "orders":[

    while(currentPos < StringLen(jsonResponse)) {
        // Find next order object
        int objStart = StringFind(jsonResponse, "{", currentPos);
        if(objStart < 0) break;

        int objEnd = StringFind(jsonResponse, "}", objStart);
        if(objEnd < 0) break;

        string orderJson = StringSubstr(jsonResponse, objStart, objEnd - objStart + 1);

        // Parse order fields
        string orderId = ExtractJsonString(orderJson, "orderId");
        string symbol = ExtractJsonString(orderJson, "symbol");
        string direction = ExtractJsonString(orderJson, "direction");
        string orderType = ExtractJsonString(orderJson, "orderType");
        double entryPrice = ExtractJsonDouble(orderJson, "entryPrice");
        double stopLoss = ExtractJsonDouble(orderJson, "stopLoss");
        double takeProfit = ExtractJsonDouble(orderJson, "takeProfit");
        double lotSize = ExtractJsonDouble(orderJson, "lotSize");
        double invalidationPrice = ExtractJsonDouble(orderJson, "invalidationPrice");

        if(orderId != "" && symbol != "") {
            Print("\n═══════════════════════════════════════════════════");
            Print("📋 Processing Order: ", orderId);
            Print("═══════════════════════════════════════════════════");
            Print("Symbol: ", symbol);
            Print("Direction: ", direction);
            Print("Type: ", orderType);
            Print("Entry: ", entryPrice);
            Print("Stop Loss: ", stopLoss);
            Print("Take Profit: ", takeProfit);
            Print("Lot Size (from dashboard): ", lotSize);

            // Execute order with position sizing
            ExecuteOrder(orderId, symbol, direction, orderType, entryPrice, stopLoss, takeProfit, lotSize, invalidationPrice);
        }

        currentPos = objEnd + 1;

        // Check if we've reached the end of the array
        if(StringFind(jsonResponse, "]", currentPos) < StringFind(jsonResponse, "{", currentPos) ||
           StringFind(jsonResponse, "{", currentPos) < 0) {
            break;
        }
    }
}

//+------------------------------------------------------------------+
//| Execute a single order with position sizing                      |
//+------------------------------------------------------------------+
void ExecuteOrder(string orderId, string symbol, string direction, string orderType,
                  double entryPrice, double stopLoss, double takeProfit, double dashboardLotSize,
                  double invalidationPrice) {

    // 1. Calculate optimal position size (if lotSize from dashboard is 0, calculate based on risk)
    double calculatedVolume = 0;
    double actualRisk = 0;
    double actualRiskPercent = 0;

    if(dashboardLotSize > 0) {
        // Dashboard specified exact lot size - use it
        calculatedVolume = dashboardLotSize;
        Print("✅ Using lot size from dashboard: ", calculatedVolume);
    } else {
        // Calculate based on risk percentage (assume 1% default if not specified)
        double riskPercent = 1.0;
        calculatedVolume = CalculatePositionSize(symbol, direction, stopLoss, riskPercent, entryPrice);

        if(calculatedVolume <= 0) {
            Print("❌ Position size calculation failed - skipping order");
            SendExecutionFeedback(orderId, "FAILED", 0, 0, 0, 0, 0, 0, 0, "Position size calculation failed");
            return;
        }
    }

    // 2. Calculate swap costs for preview
    double swapCost5Day = CalculateSwapCost(symbol, direction, calculatedVolume, 5);
    double swapCost10Day = CalculateSwapCost(symbol, direction, calculatedVolume, 10);

    Print("───────────────────────────────────────────────────");
    Print("💰 Calculated Position Details:");
    Print("   Volume: ", DoubleToString(calculatedVolume, 2), " lots");
    Print("   5-Day Swap Cost: $", DoubleToString(swapCost5Day, 2));
    Print("   10-Day Swap Cost: $", DoubleToString(swapCost10Day, 2));
    Print("───────────────────────────────────────────────────");

    // 3. Execute order on MT5
    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);

    // Determine order action and type
    if(orderType == "MARKET" || orderType == "BUY" || orderType == "SELL") {
        // Market order
        request.action = TRADE_ACTION_DEAL;
        request.type = (direction == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
        request.price = (direction == "BUY") ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
    } else if(orderType == "BUY_LIMIT" || orderType == "SELL_LIMIT") {
        // Limit order
        request.action = TRADE_ACTION_PENDING;
        request.type = (orderType == "BUY_LIMIT") ? ORDER_TYPE_BUY_LIMIT : ORDER_TYPE_SELL_LIMIT;
        request.price = entryPrice;
    } else if(orderType == "BUY_STOP" || orderType == "SELL_STOP") {
        // Stop order
        request.action = TRADE_ACTION_PENDING;
        request.type = (orderType == "BUY_STOP") ? ORDER_TYPE_BUY_STOP : ORDER_TYPE_SELL_STOP;
        request.price = entryPrice;
    } else {
        Print("❌ Unknown order type: ", orderType);
        SendExecutionFeedback(orderId, "FAILED", 0, 0, 0, 0, 0, 0, 0, "Unknown order type");
        return;
    }

    request.symbol = symbol;
    request.volume = calculatedVolume;
    request.sl = stopLoss;
    request.tp = takeProfit;
    request.deviation = 20;
    request.magic = 123456; // AEGIS magic number
    request.comment = "AEGIS:" + orderId;
    request.type_filling = ORDER_FILLING_FOK;

    Print("───────────────────────────────────────────────────");
    Print("⚡ Sending order to MT5...");
    Print("───────────────────────────────────────────────────");

    // Send order
    bool success = OrderSend(request, result);

    if(success && (result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)) {
        Print("✅ ORDER EXECUTED SUCCESSFULLY!");
        Print("   MT5 Ticket: #", result.order);
        Print("   Volume: ", result.volume, " lots");
        Print("   Price: ", result.price);
        Print("═══════════════════════════════════════════════════\n");

        totalExecutions++;

        // Calculate actual risk
        double balance = AccountInfoDouble(ACCOUNT_BALANCE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double stopLossDistance = MathAbs(result.price - stopLoss);
        double stopLossTicks = stopLossDistance / tickSize;
        actualRisk = result.volume * stopLossTicks * tickValue;
        actualRiskPercent = (actualRisk / balance) * 100.0;

        // Send feedback to server
        SendExecutionFeedback(
            orderId,
            "EXECUTED",
            result.order,
            result.volume,
            actualRisk,
            actualRiskPercent,
            swapCost5Day,
            swapCost10Day,
            result.price,
            ""
        );
    } else {
        Print("❌ ORDER EXECUTION FAILED!");
        Print("   Error code: ", result.retcode);
        Print("   Error description: ", GetRetcodeDescription(result.retcode));
        Print("═══════════════════════════════════════════════════\n");

        failedExecutions++;

        SendExecutionFeedback(
            orderId,
            "FAILED",
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            GetRetcodeDescription(result.retcode)
        );
    }
}

//+------------------------------------------------------------------+
//| Send execution feedback to server                                |
//+------------------------------------------------------------------+
void SendExecutionFeedback(string orderId, string status, ulong mt5Ticket, double volume,
                          double actualRisk, double actualRiskPercent,
                          double swapCost5Day, double swapCost10Day,
                          double executionPrice, string failureReason) {

    string jsonData = "{";
    jsonData += "\"orderId\":\"" + orderId + "\",";
    jsonData += "\"status\":\"" + status + "\",";
    jsonData += "\"mt5Ticket\":\"" + IntegerToString(mt5Ticket) + "\",";
    jsonData += "\"calculatedVolume\":" + DoubleToString(volume, 2) + ",";
    jsonData += "\"actualRisk\":" + DoubleToString(actualRisk, 2) + ",";
    jsonData += "\"actualRiskPercent\":" + DoubleToString(actualRiskPercent, 2) + ",";
    jsonData += "\"swapCost5Day\":" + DoubleToString(swapCost5Day, 2) + ",";
    jsonData += "\"swapCost10Day\":" + DoubleToString(swapCost10Day, 2) + ",";
    jsonData += "\"executionPrice\":" + DoubleToString(executionPrice, 5) + ",";
    jsonData += "\"executedAt\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",";
    jsonData += "\"failureReason\":\"" + failureReason + "\"";
    jsonData += "}";

    // Send to server
    char send_data[];
    char result_data[];
    string result_headers;
    int timeout = 5000;

    StringToCharArray(jsonData, send_data, 0, StringLen(jsonData));

    string request_headers = "Content-Type: application/json\r\n";
    request_headers += "X-API-Key: " + API_KEY + "\r\n";

    string url = API_URL + "/api/mt5/execution-feedback";
    int res = WebRequest("POST", url, request_headers, timeout, send_data, result_data, result_headers);

    if(res == 200) {
        Print("✅ Execution feedback sent to server");
    } else {
        Print("⚠️  Failed to send execution feedback (HTTP ", res, ")");
    }
}

//+------------------------------------------------------------------+
//| Helper: Extract string value from JSON                          |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key) {
    string searchKey = "\"" + key + "\":\"";
    int startPos = StringFind(json, searchKey);
    if(startPos < 0) return "";

    startPos += StringLen(searchKey);
    int endPos = StringFind(json, "\"", startPos);
    if(endPos < 0) return "";

    return StringSubstr(json, startPos, endPos - startPos);
}

//+------------------------------------------------------------------+
//| Helper: Extract double value from JSON                          |
//+------------------------------------------------------------------+
double ExtractJsonDouble(string json, string key) {
    string searchKey = "\"" + key + "\":";
    int startPos = StringFind(json, searchKey);
    if(startPos < 0) return 0;

    startPos += StringLen(searchKey);
    string numStr = "";

    for(int i = startPos; i < StringLen(json); i++) {
        string char = StringSubstr(json, i, 1);
        if((char >= "0" && char <= "9") || char == "." || char == "-") {
            numStr += char;
        } else {
            break;
        }
    }

    return StringToDouble(numStr);
}

//+------------------------------------------------------------------+
//| Helper: Get retcode description                                 |
//+------------------------------------------------------------------+
string GetRetcodeDescription(int retcode) {
    switch(retcode) {
        case TRADE_RETCODE_DONE: return "Request completed";
        case TRADE_RETCODE_PLACED: return "Order placed";
        case TRADE_RETCODE_REJECT: return "Request rejected";
        case TRADE_RETCODE_CANCEL: return "Request canceled";
        case TRADE_RETCODE_ERROR: return "Request processing error";
        case TRADE_RETCODE_TIMEOUT: return "Request timeout";
        case TRADE_RETCODE_INVALID: return "Invalid request";
        case TRADE_RETCODE_INVALID_VOLUME: return "Invalid volume";
        case TRADE_RETCODE_INVALID_PRICE: return "Invalid price";
        case TRADE_RETCODE_INVALID_STOPS: return "Invalid stops";
        case TRADE_RETCODE_TRADE_DISABLED: return "Trading disabled";
        case TRADE_RETCODE_MARKET_CLOSED: return "Market closed";
        case TRADE_RETCODE_NO_MONEY: return "Insufficient funds";
        case TRADE_RETCODE_PRICE_CHANGED: return "Price changed";
        case TRADE_RETCODE_PRICE_OFF: return "No prices";
        case TRADE_RETCODE_INVALID_EXPIRATION: return "Invalid expiration";
        case TRADE_RETCODE_ORDER_CHANGED: return "Order changed";
        case TRADE_RETCODE_TOO_MANY_REQUESTS: return "Too many requests";
        default: return "Unknown error (" + IntegerToString(retcode) + ")";
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
            string comment = PositionGetString(POSITION_COMMENT);

            // Extract orderId from comment (format: "AEGIS:orderId")
            if(StringFind(comment, "AEGIS:") < 0) continue;

            // Parse invalidation price from comment or use a separate mechanism
            // For now, we'll check positions that have AEGIS in the comment
            // The invalidation price should be stored in the position comment or fetched from server

            // Extract orderId
            int colonPos = StringFind(comment, ":");
            if(colonPos < 0) continue;

            string orderId = StringSubstr(comment, colonPos + 1);

            // Get current price
            double currentPrice;
            if(posType == POSITION_TYPE_BUY) {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);
            } else {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);
            }

            // Check invalidation (we need to fetch this from server or store it differently)
            // For now, we monitor all AEGIS positions
            // Future enhancement: Store invalidation price in position magic number or fetch from server
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

    // Calculate drawdown percentage
    double startBalance = (ACCOUNT_START_BALANCE > 0) ? ACCOUNT_START_BALANCE : balance;
    double totalDrawdown = startBalance - equity;
    double totalDrawdownPercent = (totalDrawdown / startBalance) * 100.0;
    double dailyDrawdownPercent = (dailyDrawdown / balance) * 100.0;

    if(ENABLE_LOGGING) {
        Print("📊 Drawdown Check:");
        Print("   Start Balance: $", startBalance);
        Print("   Current Balance: $", balance);
        Print("   Equity: $", equity);
        Print("   Floating P&L: $", floatingPnL);
        Print("   Closed P&L (today): $", closedPnL);
        Print("   Daily Drawdown: $", dailyDrawdown, " (", DoubleToString(dailyDrawdownPercent, 2), "%)");
        Print("   Total Drawdown: $", totalDrawdown, " (", DoubleToString(totalDrawdownPercent, 2), "%)");
    }

    // Send snapshot to server
    SendDrawdownSnapshot(balance, equity, floatingPnL, closedPnL, dailyDrawdown, totalDrawdown);

    // Check for warning thresholds (these should come from ChallengeSetup)
    // For now, we just log warnings
    if(totalDrawdownPercent > 8.0) {
        Print("⚠️  WARNING: Total drawdown approaching limit (", DoubleToString(totalDrawdownPercent, 2), "%)");
    }

    if(dailyDrawdownPercent < -4.0) {
        Print("⚠️  WARNING: Daily loss approaching limit (", DoubleToString(dailyDrawdownPercent, 2), "%)");
    }
}

//+------------------------------------------------------------------+
//| Send drawdown snapshot to server                                |
//+------------------------------------------------------------------+
void SendDrawdownSnapshot(double balance, double equity, double floatingPnL,
                         double closedPnL, double dailyDrawdown, double totalDrawdown) {

    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

    string jsonData = "{";
    jsonData += "\"accountLogin\":\"" + accountLogin + "\",";
    jsonData += "\"balance\":" + DoubleToString(balance, 2) + ",";
    jsonData += "\"equity\":" + DoubleToString(equity, 2) + ",";
    jsonData += "\"floatingPnL\":" + DoubleToString(floatingPnL, 2) + ",";
    jsonData += "\"closedPnL\":" + DoubleToString(closedPnL, 2) + ",";
    jsonData += "\"dailyDrawdown\":" + DoubleToString(dailyDrawdown, 2) + ",";
    jsonData += "\"totalDrawdown\":" + DoubleToString(totalDrawdown, 2) + ",";
    jsonData += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    jsonData += "}";

    // Send to server
    char send_data[];
    char result_data[];
    string result_headers;
    int timeout = 5000;

    StringToCharArray(jsonData, send_data, 0, StringLen(jsonData));

    string request_headers = "Content-Type: application/json\r\n";
    request_headers += "X-API-Key: " + API_KEY + "\r\n";

    string url = API_URL + "/api/mt5/drawdown-snapshot";
    int res = WebRequest("POST", url, request_headers, timeout, send_data, result_data, result_headers);

    if(res == 200) {
        if(ENABLE_LOGGING) {
            Print("✅ Drawdown snapshot sent to server");
        }
    } else {
        if(ENABLE_LOGGING) {
            Print("⚠️  Failed to send drawdown snapshot (HTTP ", res, ")");
        }
    }
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
//| Calculate optimal position size based on risk percentage        |
//| Parameters:                                                      |
//|   - symbol: Trading pair (e.g., "EURUSD")                       |
//|   - direction: "BUY" or "SELL"                                  |
//|   - stopLossPrice: Stop loss price level                        |
//|   - riskPercent: Risk percentage (e.g., 1.0 for 1%)             |
//|   - entryPrice: Entry price (0 = use current market price)      |
//| Returns: Calculated volume in lots (0 if error)                 |
//+------------------------------------------------------------------+
double CalculatePositionSize(string symbol, string direction, double stopLossPrice, double riskPercent, double entryPrice = 0) {
    // Validate inputs
    if(symbol == "" || stopLossPrice <= 0 || riskPercent <= 0) {
        Print("❌ CalculatePositionSize: Invalid parameters");
        return 0;
    }

    // 1. Get LIVE account balance
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    if(balance <= 0) {
        Print("❌ CalculatePositionSize: Invalid account balance: ", balance);
        return 0;
    }

    // 2. Calculate risk amount in account currency
    double riskMoney = balance * (riskPercent / 100.0);
    if(ENABLE_LOGGING) {
        Print("💰 Risk calculation:");
        Print("   Balance: $", DoubleToString(balance, 2));
        Print("   Risk %: ", DoubleToString(riskPercent, 2), "%");
        Print("   Risk amount: $", DoubleToString(riskMoney, 2));
    }

    // 3. Determine entry price (use market price if not specified)
    double actualEntryPrice = entryPrice;
    if(actualEntryPrice <= 0) {
        if(direction == "BUY") {
            actualEntryPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);
        } else {
            actualEntryPrice = SymbolInfoDouble(symbol, SYMBOL_BID);
        }
    }

    if(actualEntryPrice <= 0) {
        Print("❌ CalculatePositionSize: Invalid entry price for ", symbol);
        return 0;
    }

    // 4. Calculate stop loss distance in price points
    double stopLossDistance = MathAbs(actualEntryPrice - stopLossPrice);
    if(stopLossDistance <= 0) {
        Print("❌ CalculatePositionSize: Stop loss distance is zero or negative");
        return 0;
    }

    // 5. Get tick size and tick value
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);

    if(tickSize <= 0 || tickValue <= 0) {
        Print("❌ CalculatePositionSize: Invalid tick data for ", symbol);
        Print("   Tick size: ", tickSize);
        Print("   Tick value: ", tickValue);
        return 0;
    }

    // 6. Calculate stop loss distance in ticks
    double stopLossTicks = stopLossDistance / tickSize;

    if(ENABLE_LOGGING) {
        Print("📏 Distance calculation:");
        Print("   Entry price: ", DoubleToString(actualEntryPrice, 5));
        Print("   Stop loss: ", DoubleToString(stopLossPrice, 5));
        Print("   Distance: ", DoubleToString(stopLossDistance, 5));
        Print("   Tick size: ", DoubleToString(tickSize, 5));
        Print("   Stop loss in ticks: ", DoubleToString(stopLossTicks, 2));
        Print("   Tick value: $", DoubleToString(tickValue, 5));
    }

    // 7. Calculate raw volume
    // Formula: volume = riskMoney / (stopLossTicks * tickValue)
    double rawVolume = riskMoney / (stopLossTicks * tickValue);

    if(ENABLE_LOGGING) {
        Print("📊 Raw volume calculated: ", DoubleToString(rawVolume, 3), " lots");
    }

    // 8. Get broker volume constraints
    double minVolume = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double maxVolume = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double volumeStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

    if(minVolume <= 0 || volumeStep <= 0) {
        Print("❌ CalculatePositionSize: Invalid broker volume limits for ", symbol);
        Print("   Min volume: ", minVolume);
        Print("   Max volume: ", maxVolume);
        Print("   Volume step: ", volumeStep);
        return 0;
    }

    // 9. Normalize volume to broker constraints
    // Round down to nearest step
    double normalizedVolume = MathFloor(rawVolume / volumeStep) * volumeStep;

    // Ensure within min/max limits
    if(normalizedVolume < minVolume) {
        Print("⚠️  Calculated volume (", DoubleToString(normalizedVolume, 3), ") below minimum (", DoubleToString(minVolume, 3), ")");
        normalizedVolume = minVolume;
    }

    if(normalizedVolume > maxVolume) {
        Print("⚠️  Calculated volume (", DoubleToString(normalizedVolume, 3), ") above maximum (", DoubleToString(maxVolume, 3), ")");
        normalizedVolume = maxVolume;
    }

    // 10. Calculate actual risk with normalized volume
    double actualRiskMoney = normalizedVolume * stopLossTicks * tickValue;
    double actualRiskPercent = (actualRiskMoney / balance) * 100.0;

    if(ENABLE_LOGGING) {
        Print("✅ Position size calculated:");
        Print("   Raw volume: ", DoubleToString(rawVolume, 3), " lots");
        Print("   Normalized volume: ", DoubleToString(normalizedVolume, 3), " lots");
        Print("   Min/Max/Step: ", DoubleToString(minVolume, 3), "/", DoubleToString(maxVolume, 3), "/", DoubleToString(volumeStep, 3));
        Print("   Actual risk: $", DoubleToString(actualRiskMoney, 2), " (", DoubleToString(actualRiskPercent, 2), "%)");
    }

    return normalizedVolume;
}

//+------------------------------------------------------------------+
//| Calculate swap cost for holding a position                      |
//| Parameters:                                                      |
//|   - symbol: Trading pair                                        |
//|   - direction: "BUY" or "SELL"                                  |
//|   - volume: Position size in lots                               |
//|   - days: Number of days (5 or 10 typically)                    |
//| Returns: Swap cost in account currency (negative = cost)        |
//+------------------------------------------------------------------+
double CalculateSwapCost(string symbol, string direction, double volume, int days) {
    // Get swap rates
    double swapLong = SymbolInfoDouble(symbol, SYMBOL_SWAP_LONG);
    double swapShort = SymbolInfoDouble(symbol, SYMBOL_SWAP_SHORT);
    int swapMode = (int)SymbolInfoInteger(symbol, SYMBOL_SWAP_MODE);

    // Select appropriate swap rate
    double swapRate = (direction == "BUY") ? swapLong : swapShort;

    // Get contract size and point
    double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);

    double swapCost = 0;

    // Calculate swap based on mode
    if(swapMode == SYMBOL_SWAP_MODE_POINTS) {
        // Swap in points: multiply by point value
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        swapCost = swapRate * volume * days * tickValue;
    }
    else if(swapMode == SYMBOL_SWAP_MODE_CURRENCY_SYMBOL ||
            swapMode == SYMBOL_SWAP_MODE_CURRENCY_MARGIN ||
            swapMode == SYMBOL_SWAP_MODE_CURRENCY_DEPOSIT) {
        // Swap in currency units
        swapCost = swapRate * volume * days;
    }
    else if(swapMode == SYMBOL_SWAP_MODE_INTEREST_CURRENT) {
        // Swap as percentage of current price
        double currentPrice = SymbolInfoDouble(symbol, (direction == "BUY") ? SYMBOL_BID : SYMBOL_ASK);
        swapCost = (currentPrice * contractSize * volume * swapRate * days) / 36000.0;
    }
    else if(swapMode == SYMBOL_SWAP_MODE_INTEREST_OPEN) {
        // Swap as annual percentage - not implemented fully, use approximation
        double currentPrice = SymbolInfoDouble(symbol, (direction == "BUY") ? SYMBOL_BID : SYMBOL_ASK);
        swapCost = (currentPrice * contractSize * volume * swapRate * days) / 36000.0;
    }

    if(ENABLE_LOGGING) {
        Print("💸 Swap calculation for ", symbol, " (", direction, "):");
        Print("   Swap rate: ", DoubleToString(swapRate, 2));
        Print("   Volume: ", DoubleToString(volume, 2), " lots");
        Print("   Days: ", days);
        Print("   Estimated cost: $", DoubleToString(swapCost, 2));
    }

    return swapCost;
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
