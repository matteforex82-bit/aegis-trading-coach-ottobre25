//+------------------------------------------------------------------+
//|                                    PropControlExporter-v3.mq5    |
//|                                    AEGIS Trading Coach Dashboard |
//|                          Smart Sync + Order Execution Integration|
//+------------------------------------------------------------------+
#property copyright "AEGIS Trading Coach"
#property link      "https://aegis-trading-coach.vercel.app"
#property version   "3.00"
#property strict

// Input Parameters
input string API_URL = "https://aegis-trading-coach.vercel.app/api/ingest/mt5";
input string API_PENDING_ORDERS_URL = "https://aegis-trading-coach.vercel.app/api/trade-orders/pending";
input string API_CONFIRM_EXECUTION_URL = "https://aegis-trading-coach.vercel.app/api/trade-orders/confirm-execution";
input string API_KEY = "";  // Your API Key from dashboard (required)
input int    SYNC_INTERVAL_SECONDS = 60;
input int    ORDER_POLL_INTERVAL_SECONDS = 10;  // NEW: Check for orders every 10 seconds
input bool   ENABLE_LOGGING = true;
input bool   SYNC_OPEN_POSITIONS = true;
input bool   SYNC_CLOSED_TRADES = true;
input bool   SYNC_METRICS = true;
input string PROP_FIRM_NAME = "";
input string ACCOUNT_PHASE = "DEMO";
input double ACCOUNT_START_BALANCE = 0;

// Global Variables
datetime lastSyncTime = 0;
datetime lastFullSyncCheck = 0;
datetime lastOrderPollTime = 0;  // NEW: Track order polling
int      syncAttempts = 0;
int      successfulSyncs = 0;
int      failedSyncs = 0;
bool     isFirstSync = true;
string   lastSyncedTicket = "0";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("=================================================");
    Print("AEGIS Trading Coach - EA v3.0 Started");
    Print("🚀 NEW: Order Execution Integration");
    Print("=================================================");
    Print("API URL: ", API_URL);
    Print("Sync Interval: ", SYNC_INTERVAL_SECONDS, " seconds");
    Print("Order Poll Interval: ", ORDER_POLL_INTERVAL_SECONDS, " seconds");
    Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("Broker: ", AccountInfoString(ACCOUNT_COMPANY));
    Print("Server: ", AccountInfoString(ACCOUNT_SERVER));
    Print("=================================================");

    // Check if API Key is set
    if(API_KEY == "") {
        Print("❌ ERROR: API_KEY is not set!");
        Print("⚠️  Generate API Key from: Dashboard > Accounts");
        Print("⚠️  Then add it to EA settings");
        return(INIT_FAILED);
    }

    Print("✅ API Key configured");
    Print("📊 Preparing for first-time full history sync...");
    Print("📥 Order execution polling enabled");

    // Schedule immediate first sync
    EventSetTimer(1); // Sync after 1 second

    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();

    Print("=================================================");
    Print("AEGIS EA Stopped");
    Print("Total Sync Attempts: ", syncAttempts);
    Print("Successful: ", successfulSyncs);
    Print("Failed: ", failedSyncs);
    Print("=================================================");
}

//+------------------------------------------------------------------+
//| Timer function - Main orchestrator                               |
//+------------------------------------------------------------------+
void OnTimer() {
    // PRIORITY 1: Check for pending orders (every 10 seconds)
    if(TimeCurrent() - lastOrderPollTime >= ORDER_POLL_INTERVAL_SECONDS) {
        CheckAndExecutePendingOrders();
        lastOrderPollTime = TimeCurrent();
    }

    // PRIORITY 2: Regular sync interval check
    if(TimeCurrent() - lastSyncTime < SYNC_INTERVAL_SECONDS) {
        return;
    }

    syncAttempts++;

    // PHASE 1: First-Time Full Sync
    if(isFirstSync) {
        Print("\n🔵 PHASE 1: First-Time Full History Sync");
        Print("==================================================");
        PerformFullHistorySync();
        isFirstSync = false;
        lastSyncTime = TimeCurrent();
        return;
    }

    // PHASE 2: Regular Real-Time Sync
    Print("\n🟢 PHASE 2: Real-Time Sync (Positions + Recent Trades)");
    PerformRegularSync();

    // PHASE 3: Periodic Incremental Check (every 5 minutes)
    if(TimeCurrent() - lastFullSyncCheck > 300) { // 300 seconds = 5 minutes
        Print("\n🟡 PHASE 3: Incremental Safety Check");
        PerformIncrementalCheck();
        lastFullSyncCheck = TimeCurrent();
    }

    lastSyncTime = TimeCurrent();
}

//+------------------------------------------------------------------+
//| NEW: Check for pending orders and execute them                   |
//+------------------------------------------------------------------+
void CheckAndExecutePendingOrders() {
    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    string url = API_PENDING_ORDERS_URL + "/" + accountLogin;

    char result[];
    string headers;
    int timeout = 5000;

    // Add API Key header
    headers = "Content-Type: application/json\r\n";
    headers += "X-API-Key: " + API_KEY + "\r\n";

    int res = WebRequest("GET", url, headers, timeout, NULL, result, headers);

    if(res == 200) {
        string response = CharArrayToString(result);

        if(ENABLE_LOGGING) {
            Print("📥 Pending orders response: ", response);
        }

        // Parse JSON response (simplified - in production use proper JSON parser)
        // Expected format: {"success":true,"orderCount":2,"orders":[...]}

        int orderCount = ExtractOrderCount(response);

        if(orderCount > 0) {
            Print("🎯 Found ", orderCount, " pending orders to execute");

            // Parse and execute each order
            ExecuteOrdersFromJSON(response);
        } else {
            if(ENABLE_LOGGING) {
                Print("✅ No pending orders");
            }
        }
    } else if(res == 404) {
        // Account not found - this is OK, might be first time
        if(ENABLE_LOGGING) {
            Print("ℹ️  Account not registered yet or no orders");
        }
    } else {
        Print("⚠️  Failed to fetch pending orders: HTTP ", res);
    }
}

//+------------------------------------------------------------------+
//| Helper: Extract order count from JSON                            |
//+------------------------------------------------------------------+
int ExtractOrderCount(string json) {
    int start = StringFind(json, "\"orderCount\":");
    if(start < 0) return 0;

    start += 13; // Length of "orderCount":
    int end = StringFind(json, ",", start);
    if(end < 0) end = StringFind(json, "}", start);

    string countStr = StringSubstr(json, start, end - start);
    StringTrimLeft(countStr);
    StringTrimRight(countStr);

    return (int)StringToInteger(countStr);
}

//+------------------------------------------------------------------+
//| Helper: Execute orders from JSON response                        |
//+------------------------------------------------------------------+
void ExecuteOrdersFromJSON(string json) {
    // Find orders array
    int ordersStart = StringFind(json, "\"orders\":[");
    if(ordersStart < 0) return;

    ordersStart += 10; // Skip to after "orders":[

    // Simple JSON parsing - extract each order object
    int pos = ordersStart;
    int orderNum = 0;

    while(true) {
        // Find next order object
        int orderStart = StringFind(json, "{", pos);
        if(orderStart < 0) break;

        int orderEnd = StringFind(json, "}", orderStart);
        if(orderEnd < 0) break;

        string orderJSON = StringSubstr(json, orderStart, orderEnd - orderStart + 1);

        // Extract order details
        string orderId = ExtractJSONString(orderJSON, "orderId");
        string symbol = ExtractJSONString(orderJSON, "symbol");
        string direction = ExtractJSONString(orderJSON, "direction");
        string orderType = ExtractJSONString(orderJSON, "orderType");
        double lotSize = ExtractJSONDouble(orderJSON, "lotSize");
        double entryPrice = ExtractJSONDouble(orderJSON, "entryPrice");
        double stopLoss = ExtractJSONDouble(orderJSON, "stopLoss");
        double takeProfit = ExtractJSONDouble(orderJSON, "takeProfit1");
        int magicNumber = (int)ExtractJSONDouble(orderJSON, "magicNumber");

        Print("\n📋 Order ", ++orderNum, ":");
        Print("   ID: ", orderId);
        Print("   Symbol: ", symbol);
        Print("   Direction: ", direction);
        Print("   Type: ", orderType);
        Print("   Lot Size: ", lotSize);
        Print("   Entry: ", entryPrice);
        Print("   SL: ", stopLoss);
        Print("   TP: ", takeProfit);

        // Execute the order
        ExecuteSingleOrder(orderId, symbol, direction, orderType, lotSize, entryPrice, stopLoss, takeProfit, magicNumber);

        pos = orderEnd + 1;
    }
}

//+------------------------------------------------------------------+
//| Helper: Execute a single order on MT5                            |
//+------------------------------------------------------------------+
void ExecuteSingleOrder(string orderId, string symbol, string direction, string orderType,
                        double lotSize, double entryPrice, double stopLoss, double takeProfit, int magicNumber) {

    MqlTradeRequest request;
    MqlTradeResult result;
    ZeroMemory(request);
    ZeroMemory(result);

    // Prepare request
    request.action = TRADE_ACTION_DEAL; // Market order for now
    request.symbol = symbol;
    request.volume = lotSize;
    request.type = (direction == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    request.price = (direction == "BUY") ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
    request.sl = stopLoss;
    request.tp = takeProfit;
    request.deviation = 10;
    request.magic = magicNumber;
    request.comment = "AEGIS-" + orderId;
    request.type_filling = ORDER_FILLING_IOC;

    Print("🚀 Sending order to MT5...");

    // Send order
    bool sent = OrderSend(request, result);

    if(sent && result.retcode == TRADE_RETCODE_DONE) {
        Print("✅ Order executed successfully!");
        Print("   MT5 Ticket: ", result.order);
        Print("   Fill Price: ", result.price);

        // Confirm execution to server
        ConfirmExecution(orderId, IntegerToString(result.order), result.price, "ACTIVE", "");
    } else {
        Print("❌ Order execution failed!");
        Print("   Error: ", result.retcode);
        Print("   Comment: ", result.comment);

        // Report failure to server
        ConfirmExecution(orderId, "", 0, "FAILED", result.comment);
    }
}

//+------------------------------------------------------------------+
//| Helper: Confirm execution to server                              |
//+------------------------------------------------------------------+
void ConfirmExecution(string orderId, string mt5Ticket, double executionPrice, string status, string failureReason) {
    string json = "{";
    json += "\"orderId\":\"" + orderId + "\",";
    json += "\"mt5Ticket\":\"" + mt5Ticket + "\",";
    json += "\"executionPrice\":" + DoubleToString(executionPrice, 5) + ",";
    json += "\"executionTime\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"status\":\"" + status + "\"";

    if(failureReason != "") {
        json += ",\"failureReason\":\"" + failureReason + "\"";
    }

    json += "}";

    char post[], result[];
    string headers;
    int timeout = 5000;

    StringToCharArray(json, post, 0, StringLen(json));

    headers = "Content-Type: application/json\r\n";
    headers += "X-API-Key: " + API_KEY + "\r\n";

    int res = WebRequest("POST", API_CONFIRM_EXECUTION_URL, headers, timeout, post, result, headers);

    if(res == 200) {
        Print("✅ Execution confirmed to server");
    } else {
        Print("❌ Failed to confirm execution: HTTP ", res);
    }
}

//+------------------------------------------------------------------+
//| Helper: Extract string value from JSON                           |
//+------------------------------------------------------------------+
string ExtractJSONString(string json, string key) {
    string searchKey = "\"" + key + "\":\"";
    int start = StringFind(json, searchKey);
    if(start < 0) return "";

    start += StringLen(searchKey);
    int end = StringFind(json, "\"", start);
    if(end < 0) return "";

    return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Helper: Extract double value from JSON                           |
//+------------------------------------------------------------------+
double ExtractJSONDouble(string json, string key) {
    string searchKey = "\"" + key + "\":";
    int start = StringFind(json, searchKey);
    if(start < 0) return 0;

    start += StringLen(searchKey);
    int end = StringFind(json, ",", start);
    if(end < 0) end = StringFind(json, "}", start);
    if(end < 0) return 0;

    string valueStr = StringSubstr(json, start, end - start);
    StringTrimLeft(valueStr);
    StringTrimRight(valueStr);

    // Remove quotes if present
    StringReplace(valueStr, "\"", "");

    return StringToDouble(valueStr);
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
    json += "\"commission\":" + DoubleToString(PositionGetDouble(POSITION_COMMISSION), 2) + ",";
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
    char post[], result[];
    string headers;
    int timeout = 5000;

    // Convert JSON to char array
    StringToCharArray(jsonData, post, 0, StringLen(jsonData));

    // Add API Key header
    headers = "Content-Type: application/json\r\n";
    headers += "X-API-Key: " + API_KEY + "\r\n";

    int res = WebRequest("POST", API_URL, headers, timeout, post, result, headers);

    if(res == 200) {
        if(ENABLE_LOGGING) {
            string response = CharArrayToString(result);
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
