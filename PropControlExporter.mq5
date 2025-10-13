//+------------------------------------------------------------------+
//|                                          PropControlExporter.mq5 |
//|                                    AEGIS Trading Coach Dashboard |
//|                                             Real-time Data Sync  |
//+------------------------------------------------------------------+
#property copyright "AEGIS Trading Coach"
#property link      "https://aegis-trading-coach.vercel.app"
#property version   "1.00"
#property strict

// Input Parameters
input string API_URL = "https://aegis-trading-coach.vercel.app/api/ingest/mt5";
input string API_KEY = "";  // Your API Key from dashboard (required)
input int    SYNC_INTERVAL_SECONDS = 60;
input bool   ENABLE_LOGGING = true;
input bool   SYNC_OPEN_POSITIONS = true;
input bool   SYNC_CLOSED_TRADES = true;
input bool   SYNC_METRICS = true;
input string PROP_FIRM_NAME = "";
input string ACCOUNT_PHASE = "DEMO";
input double ACCOUNT_START_BALANCE = 0;

// Global Variables
datetime lastSyncTime = 0;
int      syncAttempts = 0;
int      successfulSyncs = 0;
int      failedSyncs = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
    Print("=================================================");
    Print("AEGIS Trading Coach - Expert Advisor Started");
    Print("=================================================");
    Print("API URL: ", API_URL);
    Print("Sync Interval: ", SYNC_INTERVAL_SECONDS, " seconds");
    Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("Broker: ", AccountInfoString(ACCOUNT_COMPANY));
    Print("Server: ", AccountInfoString(ACCOUNT_SERVER));
    Print("=================================================");

    // Check if API Key is set
    if(API_KEY == "") {
        Print("❌ ERROR: API_KEY is not set!");
        Print("⚠️  Please generate an API Key using: npm run setup:mt5");
        Print("⚠️  Then add it to the API_KEY parameter in EA settings");
        return(INIT_FAILED);
    }

    // Verify WebRequest is allowed
    if(!TerminalInfoInteger(TERMINAL_CONNECTED)) {
        Print("❌ ERROR: No connection to trade server");
        return(INIT_FAILED);
    }

    EventSetTimer(SYNC_INTERVAL_SECONDS);

    // Perform initial sync
    OnTimer();

    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();

    Print("=================================================");
    Print("AEGIS Trading Coach - Expert Advisor Stopped");
    Print("Total Sync Attempts: ", syncAttempts);
    Print("Successful Syncs: ", successfulSyncs);
    Print("Failed Syncs: ", failedSyncs);
    Print("=================================================");
}

//+------------------------------------------------------------------+
//| Timer function - triggers data sync                             |
//+------------------------------------------------------------------+
void OnTimer() {
    SyncDataToAPI();
}

//+------------------------------------------------------------------+
//| Main sync function                                               |
//+------------------------------------------------------------------+
void SyncDataToAPI() {
    syncAttempts++;

    if(ENABLE_LOGGING) {
        Print("🔄 Starting data sync #", syncAttempts, "...");
    }

    // Build JSON payload
    string jsonData = BuildJSONPayload();

    if(ENABLE_LOGGING) {
        Print("📦 Payload size: ", StringLen(jsonData), " bytes");
    }

    // Send to API with API Key authentication
    string headers = "Content-Type: application/json\r\nX-API-Key: " + API_KEY + "\r\n";
    char post[], result[];

    StringToCharArray(jsonData, post, 0, StringLen(jsonData));

    int timeout = 5000; // 5 seconds
    int res = WebRequest(
        "POST",
        API_URL,
        headers,
        timeout,
        post,
        result,
        headers
    );

    if(res == 200) {
        successfulSyncs++;
        lastSyncTime = TimeCurrent();

        if(ENABLE_LOGGING) {
            Print("✅ Sync successful! Response: ", CharArrayToString(result));
        }
    } else {
        failedSyncs++;

        if(ENABLE_LOGGING) {
            Print("❌ Sync failed with code: ", res);
            if(res == -1) {
                Print("ERROR: ", GetLastError());
                Print("⚠️  Make sure WebRequest is enabled for: ", API_URL);
            } else {
                Print("Response: ", CharArrayToString(result));
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Build JSON payload with account, trades, and metrics            |
//+------------------------------------------------------------------+
string BuildJSONPayload() {
    string json = "{";

    // Account Info
    json += "\"account\":{";
    json += "\"login\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"broker\":\"" + AccountInfoString(ACCOUNT_COMPANY) + "\",";
    json += "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
    json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
    json += "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_FREEMARGIN), 2) + ",";
    json += "\"marginLevel\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ",";
    json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\",";
    json += "\"leverage\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE));

    if(PROP_FIRM_NAME != "") {
        json += ",\"propFirm\":\"" + PROP_FIRM_NAME + "\"";
    }
    if(ACCOUNT_PHASE != "") {
        json += ",\"phase\":\"" + ACCOUNT_PHASE + "\"";
    }
    if(ACCOUNT_START_BALANCE > 0) {
        json += ",\"startBalance\":" + DoubleToString(ACCOUNT_START_BALANCE, 2);
    }

    json += "}";

    // Open Positions
    if(SYNC_OPEN_POSITIONS) {
        json += ",\"openPositions\":[";
        int totalPositions = PositionsTotal();
        for(int i = 0; i < totalPositions; i++) {
            ulong ticket = PositionGetTicket(i);
            if(PositionSelectByTicket(ticket)) {
                if(i > 0) json += ",";
                json += "{";
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
            }
        }
        json += "]";
    }

    // Closed Trades (last 100)
    if(SYNC_CLOSED_TRADES) {
        HistorySelect(0, TimeCurrent());
        int totalDeals = HistoryDealsTotal();

        json += ",\"trades\":[";
        int count = 0;
        int maxTrades = 100;

        for(int i = totalDeals - 1; i >= 0 && count < maxTrades; i--) {
            ulong ticket = HistoryDealGetTicket(i);
            if(ticket > 0) {
                if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
                    if(count > 0) json += ",";

                    json += "{";
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

                    count++;
                }
            }
        }
        json += "]";
    }

    // Metrics
    if(SYNC_METRICS) {
        json += ",\"metrics\":{";

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

        json += "\"profit\":" + DoubleToString(profit, 2) + ",";
        json += "\"drawdown\":" + DoubleToString(drawdown, 2) + ",";
        json += "\"totalTrades\":" + IntegerToString(totalTrades) + ",";
        json += "\"winningTrades\":" + IntegerToString(winningTrades) + ",";
        json += "\"losingTrades\":" + IntegerToString(losingTrades);

        json += "}";
    }

    json += "}";

    return json;
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
    return (type == DEAL_TYPE_BUY) ? "BUY" : "SELL";
}

//+------------------------------------------------------------------+
//| Helper: Calculate current drawdown                              |
//+------------------------------------------------------------------+
double CalculateDrawdown() {
    double startBalance = (ACCOUNT_START_BALANCE > 0) ? ACCOUNT_START_BALANCE : AccountInfoDouble(ACCOUNT_BALANCE);
    double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);

    if(currentBalance < startBalance) {
        return ((startBalance - currentBalance) / startBalance) * 100.0;
    }

    return 0.0;
}
//+------------------------------------------------------------------+
