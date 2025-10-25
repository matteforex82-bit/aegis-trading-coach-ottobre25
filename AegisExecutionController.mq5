//+------------------------------------------------------------------+
//|                                    AegisExecutionController.mq5 |
//|                        AEGIS Trading Coach - Execution Layer    |
//|                   Auto-Execution + Invalidation Monitor + Lock  |
//+------------------------------------------------------------------+
#property copyright "AEGIS Trading Coach"
#property link      "https://aegis-trading-coach.vercel.app"
#property version   "2.00"
#property strict
#property description "Advanced execution controller for AEGIS Execution Layer"
#property description "Features: Auto-execution, Invalidation monitor, Order lock, Drawdown tracking"

//+------------------------------------------------------------------+
//| Input Parameters                                                 |
//+------------------------------------------------------------------+
input string API_URL = "https://aegis-trading-coach.vercel.app";
input string API_KEY = "";  // Generate via: npm run setup:mt5
input bool   ENABLE_AUTO_EXECUTION = true;
input bool   ENABLE_INVALIDATION_MONITOR = true;
input bool   ENABLE_ORDER_LOCK = true;
input bool   ENABLE_DRAWDOWN_MONITOR = true;
input int    POLLING_INTERVAL_SEC = 5;
input int    INVALIDATION_CHECK_SEC = 1;
input int    DRAWDOWN_CHECK_SEC = 60;
input int    STATUS_SYNC_SEC = 10;
input bool   ENABLE_LOGGING = true;

//+------------------------------------------------------------------+
//| Global Variables                                                 |
//+------------------------------------------------------------------+
datetime lastPollingTime = 0;
datetime lastInvalidationCheck = 0;
datetime lastDrawdownCheck = 0;
datetime lastStatusSync = 0;

int      totalExecutions = 0;
int      totalInvalidations = 0;
int      totalLockEnforcements = 0;
int      failedExecutions = 0;

// Store active orders data from server
struct ServerOrder {
    string orderId;
    string symbol;
    string direction;      // BUY or SELL
    string orderType;      // BUY_LIMIT or SELL_LIMIT
    double entryPrice;
    double stopLoss;
    double takeProfit;
    double lotSize;
    double invalidationPrice;
    string invalidationRule;
    bool isLocked;
};

ServerOrder activeOrders[];
int activeOrdersCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("=======================================================");
    Print("🚀 AEGIS EXECUTION CONTROLLER STARTED");
    Print("=======================================================");
    Print("Version: 2.00 (Execution Layer)");
    Print("API URL: ", API_URL);
    Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("Broker: ", AccountInfoString(ACCOUNT_COMPANY));
    Print("Server: ", AccountInfoString(ACCOUNT_SERVER));
    Print("-------------------------------------------------------");
    Print("Features:");
    Print("  • Auto-Execution: ", ENABLE_AUTO_EXECUTION ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Invalidation Monitor: ", ENABLE_INVALIDATION_MONITOR ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Order Lock: ", ENABLE_ORDER_LOCK ? "✓ ENABLED" : "✗ DISABLED");
    Print("  • Drawdown Monitor: ", ENABLE_DRAWDOWN_MONITOR ? "✓ ENABLED" : "✗ DISABLED");
    Print("-------------------------------------------------------");
    Print("Intervals:");
    Print("  • Polling: ", POLLING_INTERVAL_SEC, "s");
    Print("  • Invalidation: ", INVALIDATION_CHECK_SEC, "s");
    Print("  • Drawdown: ", DRAWDOWN_CHECK_SEC, "s");
    Print("=======================================================");

    // Check if API Key is set
    if(API_KEY == "") {
        Print("❌ ERROR: API_KEY is not set!");
        Print("⚠️  Generate key: npm run setup:mt5");
        Print("⚠️  Then add it to EA parameters");
        return(INIT_FAILED);
    }

    // Verify connection
    if(!TerminalInfoInteger(TERMINAL_CONNECTED)) {
        Print("❌ ERROR: No connection to trade server");
        return(INIT_FAILED);
    }

    // Set timer to 1 second (fastest check for invalidation)
    EventSetTimer(1);

    // Perform initial polling
    PollPendingOrders();

    Print("✅ Initialization complete. EA is now active.");

    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();

    Print("=======================================================");
    Print("🛑 AEGIS EXECUTION CONTROLLER STOPPED");
    Print("=======================================================");
    Print("Statistics:");
    Print("  • Total Executions: ", totalExecutions);
    Print("  • Total Invalidations: ", totalInvalidations);
    Print("  • Lock Enforcements: ", totalLockEnforcements);
    Print("  • Failed Executions: ", failedExecutions);
    Print("=======================================================");
}

//+------------------------------------------------------------------+
//| Timer function - dispatcher for all periodic tasks              |
//+------------------------------------------------------------------+
void OnTimer() {
    datetime now = TimeCurrent();

    // 1. Invalidation check (every INVALIDATION_CHECK_SEC)
    if(ENABLE_INVALIDATION_MONITOR && (now - lastInvalidationCheck) >= INVALIDATION_CHECK_SEC) {
        MonitorInvalidation();
        lastInvalidationCheck = now;
    }

    // 2. Poll pending orders (every POLLING_INTERVAL_SEC)
    if(ENABLE_AUTO_EXECUTION && (now - lastPollingTime) >= POLLING_INTERVAL_SEC) {
        PollPendingOrders();
        lastPollingTime = now;
    }

    // 3. Status sync (every STATUS_SYNC_SEC)
    if((now - lastStatusSync) >= STATUS_SYNC_SEC) {
        SyncOrderStatus();
        lastStatusSync = now;
    }

    // 4. Drawdown monitoring (every DRAWDOWN_CHECK_SEC)
    if(ENABLE_DRAWDOWN_MONITOR && (now - lastDrawdownCheck) >= DRAWDOWN_CHECK_SEC) {
        MonitorDrawdown();
        lastDrawdownCheck = now;
    }
}

//+------------------------------------------------------------------+
//| Trade transaction event - intercept manual modifications        |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                       const MqlTradeRequest& request,
                       const MqlTradeResult& result) {
    if(!ENABLE_ORDER_LOCK) return;

    // Intercept SL/TP modifications
    if(trans.type == TRADE_TRANSACTION_REQUEST) {
        if(request.action == TRADE_ACTION_SLTP) {
            // Check if this order should be locked
            ulong ticket = request.position;

            if(IsOrderLocked(ticket)) {
                totalLockEnforcements++;

                if(ENABLE_LOGGING) {
                    Print("🔒 LOCK ENFORCEMENT: Manual modification blocked on ticket #", ticket);
                }

                // Restore original SL/TP
                RestoreOriginalSLTP(ticket);

                // Log violation to server
                LogViolation(ticket, "MANUAL_SLTP_MODIFICATION_ATTEMPT", "User attempted to modify locked order SL/TP");
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Poll pending orders from AEGIS server                           |
//+------------------------------------------------------------------+
void PollPendingOrders() {
    if(ENABLE_LOGGING) {
        Print("📡 Polling pending orders from server...");
    }

    string accountLogin = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
    string url = API_URL + "/api/mt5/pending-orders?accountLogin=" + accountLogin;
    string headers = "X-API-Key: " + API_KEY + "\r\n";

    char result[];
    string responseHeaders;
    int timeout = 5000;

    int res = WebRequest(
        "GET",
        url,
        headers,
        timeout,
        NULL,
        result,
        responseHeaders
    );

    if(res == 200) {
        string jsonResponse = CharArrayToString(result);

        if(ENABLE_LOGGING) {
            Print("✅ Server response received: ", StringLen(jsonResponse), " bytes");
        }

        // Parse JSON and extract orders
        ParsePendingOrders(jsonResponse);

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
//| Parse JSON response and extract pending orders                  |
//+------------------------------------------------------------------+
void ParsePendingOrders(string jsonResponse) {
    // Simple JSON parsing for order array
    // Format: {"orders":[{"orderId":"...","symbol":"EURUSD",...}]}

    // TODO: Implement proper JSON parsing
    // For now, log that we received orders

    if(ENABLE_LOGGING) {
        Print("📦 Parsing orders from JSON response...");
    }

    // In production, parse JSON and populate activeOrders[] array
    // Then call ExecuteOrder() for each pending order
}

//+------------------------------------------------------------------+
//| Execute order on MT5                                             |
//+------------------------------------------------------------------+
bool ExecuteOrder(ServerOrder &order) {
    if(ENABLE_LOGGING) {
        Print("🎯 Executing order: ", order.symbol, " ", order.orderType, " @ ", order.entryPrice);
    }

    MqlTradeRequest request;
    MqlTradeResult  result;
    ZeroMemory(request);
    ZeroMemory(result);

    // Determine order type
    ENUM_ORDER_TYPE mt5OrderType;
    if(order.orderType == "BUY_LIMIT") {
        mt5OrderType = ORDER_TYPE_BUY_LIMIT;
    } else if(order.orderType == "SELL_LIMIT") {
        mt5OrderType = ORDER_TYPE_SELL_LIMIT;
    } else {
        Print("❌ Invalid order type: ", order.orderType);
        return false;
    }

    // Build request
    request.action = TRADE_ACTION_PENDING;
    request.symbol = order.symbol;
    request.volume = order.lotSize;
    request.type = mt5OrderType;
    request.price = order.entryPrice;
    request.sl = order.stopLoss;
    request.tp = order.takeProfit;
    request.deviation = 10;
    request.magic = 123456;  // AEGIS magic number
    request.comment = "AEGIS:" + order.orderId;

    // Send order
    if(!OrderSend(request, result)) {
        Print("❌ Order execution failed: ", GetLastError());
        Print("   Retcode: ", result.retcode);
        Print("   Comment: ", result.comment);
        failedExecutions++;
        return false;
    }

    // Success
    totalExecutions++;

    if(ENABLE_LOGGING) {
        Print("✅ Order executed successfully!");
        Print("   MT5 Ticket: #", result.order);
        Print("   Price: ", result.price);
    }

    // Notify server
    NotifyOrderExecuted(order.orderId, result.order, result.price);

    return true;
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

            // Get invalidation price for this order
            double invalidationPrice = GetInvalidationPrice(ticket);

            if(invalidationPrice == 0) continue;  // No invalidation set

            // Get current price
            double currentPrice;
            if(posType == POSITION_TYPE_BUY) {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

                // Check if price dropped below invalidation (for BUY positions)
                if(currentPrice <= invalidationPrice) {
                    TriggerInvalidation(ticket, currentPrice, invalidationPrice);
                }
            } else {
                currentPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);

                // Check if price rose above invalidation (for SELL positions)
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

        // Notify server
        NotifyOrderClosed(ticket, "INVALIDATION_TRIGGERED", currentPrice, finalPnL);
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

    // Calculate floating P&L
    double floatingPnL = equity - balance;

    // Calculate closed P&L (today)
    double closedPnL = CalculateTodayClosedPnL();

    // Total daily drawdown
    double dailyDrawdown = closedPnL + floatingPnL;

    if(ENABLE_LOGGING) {
        Print("📊 Drawdown Check:");
        Print("   Balance: $", balance);
        Print("   Equity: $", equity);
        Print("   Floating P&L: $", floatingPnL);
        Print("   Closed P&L (today): $", closedPnL);
        Print("   Daily Drawdown: $", dailyDrawdown);
    }

    // Send snapshot to server
    SendDrawdownSnapshot(dailyDrawdown, floatingPnL, closedPnL);
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
//| Sync order status with server                                   |
//+------------------------------------------------------------------+
void SyncOrderStatus() {
    // Send current status of all positions to server
    // This ensures server has up-to-date info on order fills, closes, etc.

    if(ENABLE_LOGGING) {
        Print("🔄 Syncing order status with server...");
    }

    // Build JSON with current positions
    string json = BuildStatusSyncPayload();

    // POST to server
    string url = API_URL + "/api/mt5/status-sync";
    string headers = "Content-Type: application/json\r\nX-API-Key: " + API_KEY + "\r\n";

    char post[], result[];
    StringToCharArray(json, post, 0, StringLen(json));

    int timeout = 5000;
    int res = WebRequest(
        "POST",
        url,
        headers,
        timeout,
        post,
        result,
        headers
    );

    if(res == 200) {
        if(ENABLE_LOGGING) {
            Print("✅ Status sync successful");
        }
    }
}

//+------------------------------------------------------------------+
//| Helper: Build status sync JSON payload                          |
//+------------------------------------------------------------------+
string BuildStatusSyncPayload() {
    string json = "{\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"positions\":[";

    int totalPositions = PositionsTotal();
    for(int i = 0; i < totalPositions; i++) {
        ulong ticket = PositionGetTicket(i);
        if(PositionSelectByTicket(ticket)) {
            if(i > 0) json += ",";
            json += "{";
            json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
            json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
            json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2);
            json += "}";
        }
    }

    json += "]}";
    return json;
}

//+------------------------------------------------------------------+
//| Helper: Check if order is locked                                |
//+------------------------------------------------------------------+
bool IsOrderLocked(ulong ticket) {
    // Check against activeOrders array
    for(int i = 0; i < activeOrdersCount; i++) {
        string comment = PositionGetString(POSITION_COMMENT);
        if(StringFind(comment, activeOrders[i].orderId) >= 0) {
            return activeOrders[i].isLocked;
        }
    }
    return false;
}

//+------------------------------------------------------------------+
//| Helper: Restore original SL/TP                                  |
//+------------------------------------------------------------------+
void RestoreOriginalSLTP(ulong ticket) {
    // Find original SL/TP from activeOrders
    for(int i = 0; i < activeOrdersCount; i++) {
        string comment = PositionGetString(POSITION_COMMENT);
        if(StringFind(comment, activeOrders[i].orderId) >= 0) {
            MqlTradeRequest request;
            MqlTradeResult  result;
            ZeroMemory(request);
            ZeroMemory(result);

            request.action = TRADE_ACTION_SLTP;
            request.position = ticket;
            request.sl = activeOrders[i].stopLoss;
            request.tp = activeOrders[i].takeProfit;

            OrderSend(request, result);
            break;
        }
    }
}

//+------------------------------------------------------------------+
//| Helper: Get invalidation price for ticket                       |
//+------------------------------------------------------------------+
double GetInvalidationPrice(ulong ticket) {
    for(int i = 0; i < activeOrdersCount; i++) {
        string comment = PositionGetString(POSITION_COMMENT);
        if(StringFind(comment, activeOrders[i].orderId) >= 0) {
            return activeOrders[i].invalidationPrice;
        }
    }
    return 0;
}

//+------------------------------------------------------------------+
//| API: Notify server that order was executed                      |
//+------------------------------------------------------------------+
void NotifyOrderExecuted(string orderId, ulong mt5Ticket, double executionPrice) {
    string json = "{";
    json += "\"orderId\":\"" + orderId + "\",";
    json += "\"mt5Ticket\":\"" + IntegerToString(mt5Ticket) + "\",";
    json += "\"executionPrice\":" + DoubleToString(executionPrice, 5) + ",";
    json += "\"executionTime\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json += "}";

    SendPostRequest("/api/mt5/order-executed", json);
}

//+------------------------------------------------------------------+
//| API: Notify server that order was closed                        |
//+------------------------------------------------------------------+
void NotifyOrderClosed(ulong ticket, string closeReason, double closePrice, double finalPnL) {
    string json = "{";
    json += "\"mt5Ticket\":\"" + IntegerToString(ticket) + "\",";
    json += "\"closeReason\":\"" + closeReason + "\",";
    json += "\"closePrice\":" + DoubleToString(closePrice, 5) + ",";
    json += "\"finalPnL\":" + DoubleToString(finalPnL, 2) + ",";
    json += "\"closeTime\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json += "}";

    SendPostRequest("/api/mt5/order-closed", json);
}

//+------------------------------------------------------------------+
//| API: Send drawdown snapshot                                     |
//+------------------------------------------------------------------+
void SendDrawdownSnapshot(double dailyDD, double floatingPnL, double closedPnL) {
    string json = "{";
    json += "\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"dailyDrawdown\":" + DoubleToString(dailyDD, 2) + ",";
    json += "\"floatingPnL\":" + DoubleToString(floatingPnL, 2) + ",";
    json += "\"closedPnL\":" + DoubleToString(closedPnL, 2);
    json += "}";

    SendPostRequest("/api/mt5/drawdown-snapshot", json);
}

//+------------------------------------------------------------------+
//| API: Log violation                                              |
//+------------------------------------------------------------------+
void LogViolation(ulong ticket, string violationType, string description) {
    string json = "{";
    json += "\"accountLogin\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
    json += "\"violationType\":\"" + violationType + "\",";
    json += "\"description\":\"" + description + "\",";
    json += "\"severity\":\"WARNING\"";
    json += "}";

    SendPostRequest("/api/mt5/violation-log", json);
}

//+------------------------------------------------------------------+
//| Helper: Send POST request to API                                |
//+------------------------------------------------------------------+
void SendPostRequest(string endpoint, string jsonData) {
    string url = API_URL + endpoint;
    string headers = "Content-Type: application/json\r\nX-API-Key: " + API_KEY + "\r\n";

    char post[], result[];
    StringToCharArray(jsonData, post, 0, StringLen(jsonData));

    int timeout = 5000;
    int res = WebRequest(
        "POST",
        url,
        headers,
        timeout,
        post,
        result,
        headers
    );

    if(res != 200 && ENABLE_LOGGING) {
        Print("⚠️  POST request failed to ", endpoint, " with code: ", res);
    }
}
//+------------------------------------------------------------------+
