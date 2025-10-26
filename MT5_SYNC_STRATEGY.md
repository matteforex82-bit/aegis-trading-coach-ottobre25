# 🔄 AEGIS MT5 Sync Strategy - Complete Guide

## 📋 Problema Risolto

**Scenario Prima:**
- Nuovo utente con 500 trades storici collega AEGIS
- EA sincronizza solo ultimi 100 trades
- ❌ **Perde 400 trades storici!**
- Analytics incompleti, profit sbagliato

**Scenario Dopo (v2.0):**
- Primo sync → **TUTTI i trades storici**
- Sync successivi → solo nuovi trades
- ✅ **Nessun trade perso!**
- Analytics completi e accurati

---

## 🎯 3-Phase Sync Strategy

### **Phase 1: First-Time Full Sync** 🔵

**Quando:** Prima volta che EA si connette (flag `isFirstSync = true`)

**Cosa fa:**
```
1. Chiama HistorySelect(0, TimeCurrent())  // Tutto lo storico
2. Cicla TUTTI i deals (no limit)
3. Invia JSON con syncType: "FULL_HISTORY"
4. Server riceve e popola database completamente
5. Salva lastSyncedTicket (ultimo ticket sincronizzato)
6. Imposta isFirstSync = false
```

**Log Output:**
```
🔵 PHASE 1: First-Time Full History Sync
==================================================
📥 Syncing ALL historical trades (no limit)...
   Found 537 total deals in MT5 history
   Synced 537 closed trades
✅ Full history sync completed successfully!
   Last synced ticket: 112345678
```

**Tempo:** ~30-60 secondi (dipende da quanti trades)

---

### **Phase 2: Real-Time Sync** 🟢

**Quando:** Ogni 60 secondi (dopo first sync completato)

**Cosa fa:**
```
1. Monitora TUTTE le posizioni aperte (illimitate)
2. Sync ultimi 100 trades chiusi (per performance)
3. Invia JSON con syncType: "REALTIME"
4. Aggiorna lastSyncedTicket
```

**Perché solo 100?**
- Performance: sync veloce
- I nuovi trades sono nei primi 100 (ordinati dal più recente)
- Phase 3 copre eventuali gap

**Log Output:**
```
🟢 PHASE 2: Real-Time Sync (Positions + Recent Trades)
✅ Real-time sync completed
```

**Tempo:** ~2-3 secondi

---

### **Phase 3: Incremental Safety Check** 🟡

**Quando:** Ogni 5 minuti

**Cosa fa:**
```
1. Controlla se ci sono trades DOPO lastSyncedTicket
2. Se sì → sincronizza solo quelli
3. Se no → skip (tutto ok)
4. Invia JSON con syncType: "INCREMENTAL"
```

**Quando è utile:**
- EA era offline quando trade è stato chiuso
- Connessione persa durante Phase 2
- Edge cases vari

**Log Output:**
```
🟡 PHASE 3: Incremental Safety Check
🔍 Checking for missed trades...
   Found 3 new trades to sync
✅ Incremental sync completed
```

**Oppure:**
```
🟡 PHASE 3: Incremental Safety Check
🔍 Checking for missed trades...
   No new trades to sync - all up to date ✅
```

**Tempo:** ~1-2 secondi

---

## 📊 Confronto Versioni

| Feature | v1.0 (OLD) | v2.0 (NEW) |
|---------|------------|------------|
| **First Sync** | ❌ Only last 100 | ✅ ALL history |
| **Regular Sync** | ✅ Last 100 | ✅ Last 100 + positions |
| **Safety Net** | ❌ No | ✅ Incremental check every 5min |
| **Missing Trades** | ⚠️ Common | ✅ Never |
| **New User** | ❌ Loses old trades | ✅ Gets everything |
| **Performance** | ✅ Fast | ✅ Fast (after first sync) |

---

## 🚀 Come Usare il Nuovo EA

### Step 1: Compila il nuovo EA

```bash
# In MetaEditor
1. Apri PropControlExporter-v2.mq5
2. Premi F7 (Compile)
3. Verifica: "0 errors, 0 warnings"
```

### Step 2: Sostituisci l'EA vecchio

```bash
# In MT5
1. Rimuovi il vecchio PropControlExporter dalla chart
2. Trascina PropControlExporter-v2 sulla chart
3. Configura i parametri:
   - API_KEY: [la tua chiave da Dashboard > Accounts]
   - SYNC_INTERVAL_SECONDS: 60 (default ok)
   - ENABLE_LOGGING: true (per vedere i log)
```

### Step 3: Primo Avvio

**Cosa aspettarsi:**
```
=================================================
AEGIS Trading Coach - EA v2.0 Started
🚀 NEW: Smart 3-Phase Sync Strategy
=================================================
API URL: https://aegis-trading-coach.vercel.app/api/ingest/mt5
Sync Interval: 60 seconds
Account: 4000072938
Broker: Tradeslide Trading Tech Limited
Server: TradeslideTech-Live
=================================================
✅ API Key configured
📊 Preparing for first-time full history sync...

🔵 PHASE 1: First-Time Full History Sync
==================================================
📥 Syncing ALL historical trades (no limit)...
   Found 537 total deals in MT5 history
   Synced 537 closed trades
✅ Full history sync completed successfully!
   Last synced ticket: 112345678
```

**Tempo:** 30-60 secondi per il primo sync

### Step 4: Sync Successivi

Dopo il primo sync, ogni 60 secondi vedrai:

```
🟢 PHASE 2: Real-Time Sync (Positions + Recent Trades)
✅ Real-time sync completed
```

E ogni 5 minuti:

```
🟡 PHASE 3: Incremental Safety Check
🔍 Checking for missed trades...
   No new trades to sync - all up to date ✅
```

---

## 🔍 Verifica che Funzioni

### Nel MT5 (Experts Tab):

```
✅ Vedere "PHASE 1" completato con successo
✅ Numero di trades sincronizzati = totale nel tuo account
✅ "PHASE 2" ogni 60 secondi
✅ "PHASE 3" ogni 5 minuti
✅ Nessun errore HTTP 403 o 500
```

### Nella Dashboard AEGIS:

```
1. Vai su Analytics
2. Verifica "Total Trades" = stesso numero di MT5
3. Verifica Net Profit = stesso di MT5 report
4. Vai su Trades page
5. Scorri fino in fondo → dovresti vedere TUTTI i trades
```

### Script di Test:

Usa lo script diagnostico che abbiamo già:

```bash
cd aegis-trading-coach
npx tsx scripts/compare-mt5-vs-db-trades.ts
```

**Output atteso (dopo v2.0):**
```
✅ Database Trades: 537
📋 MT5 Report Trades: 537
✅ Missing Trades: 0  # PERFECT!

   MT5 Report Net Profit: -$5,852.18
   Database Net Profit:   -$5,852.18
   Difference: $0.00  # PERFECT MATCH!
```

---

## ⚙️ Parametri EA Configurabili

```mql5
input string API_URL = "https://aegis-trading-coach.vercel.app/api/ingest/mt5";
// URL del server AEGIS (non modificare)

input string API_KEY = "";
// ⚠️ OBBLIGATORIO: Genera da Dashboard > Accounts > Add Account

input int SYNC_INTERVAL_SECONDS = 60;
// Ogni quanti secondi fare sync (default: 60)
// Min: 30, Max: 300 (consigliato: 60)

input bool ENABLE_LOGGING = true;
// Mostra log dettagliati nel terminale (consigliato: true per debug)

input bool SYNC_OPEN_POSITIONS = true;
// Sincronizza posizioni aperte (consigliato: true)

input bool SYNC_CLOSED_TRADES = true;
// Sincronizza trades chiusi (consigliato: true)

input bool SYNC_METRICS = true;
// Sincronizza metriche aggregate (consigliato: true)

input string PROP_FIRM_NAME = "";
// Nome prop firm (opzionale, es: "FTMO")

input string ACCOUNT_PHASE = "DEMO";
// Fase account: DEMO, PHASE1, PHASE2, FUNDED

input double ACCOUNT_START_BALANCE = 0;
// Balance iniziale per calcoli (opzionale)
```

---

## 🐛 Troubleshooting

### Errore: "isFirstSync always true"

**Causa:** First sync failed, EA keeps retrying

**Soluzione:**
```
1. Controlla API_KEY è corretto
2. Verifica URL è allowed in MT5:
   Tools > Options > Expert Advisors >
   Allow WebRequest for listed URL:
   https://aegis-trading-coach.vercel.app
3. Check log per errori HTTP
```

### Errore: "HTTP 403 Forbidden"

**Causa:** API Key invalido o non attivo

**Soluzione:**
```
1. Vai su Dashboard > Accounts
2. Click "API Key" button
3. Regenera la chiave
4. Copia la nuova chiave
5. Aggiorna EA settings con la nuova chiave
6. Riavvia EA
```

### Warning: "Found X new trades to sync" (sempre)

**Causa:** lastSyncedTicket non viene aggiornato correttamente

**Soluzione:**
```
1. Rimuovi EA dalla chart
2. Chiudi MT5
3. Riapri MT5
4. Aggiungi EA di nuovo (farà first sync da zero)
```

### Problema: "Database ha meno trades di MT5"

**Causa:** First sync non è mai completato correttamente

**Soluzione:**
```
1. Chiudi EA
2. Nel database, imposta manualmente flag per force re-sync:
   UPDATE trading_accounts
   SET lastFullSyncAt = NULL
   WHERE login = 'YOUR_LOGIN';
3. Riavvia EA (farà full sync di nuovo)
```

---

## 📈 Performance Impact

### First Sync (una volta sola):

| Trades | Time | Data Size |
|--------|------|-----------|
| 100 | ~5 sec | ~50 KB |
| 500 | ~30 sec | ~250 KB |
| 1000 | ~60 sec | ~500 KB |
| 5000 | ~5 min | ~2.5 MB |

**Nota:** Dopo first sync, non c'è più delay!

### Regular Sync (ogni 60 sec):

| Operation | Time | Data Size |
|-----------|------|-----------|
| Positions | <1 sec | ~2-10 KB |
| Last 100 trades | ~2 sec | ~50 KB |
| Metrics | <1 sec | ~1 KB |
| **Total** | **~3 sec** | **~50-60 KB** |

**Impact:** Trascurabile! EA non rallenta trading.

---

## 🔐 Security Notes

### API Key Security:

✅ **DO:**
- Genera API key da Dashboard
- Usa una key diversa per ogni account MT5
- Regenera periodicamente (ogni 3-6 mesi)
- Revoca key se compromessa

❌ **DON'T:**
- Condividere API key pubblicamente
- Usare stessa key su account multipli
- Committare key su GitHub
- Salvare key in plain text su PC condivisi

### Data Privacy:

**Cosa viene sincronizzato:**
- ✅ Trade data (ticket, symbol, P&L, timestamps)
- ✅ Account balance/equity
- ✅ Position data

**Cosa NON viene sincronizzato:**
- ❌ Password MT5
- ❌ Dati personali (nome, email, etc.)
- ❌ Dati bancari
- ❌ IP address

**Encryption:**
- HTTPS per tutte le comunicazioni
- TLS 1.3
- API Key header encrypted

---

## 🎯 Best Practices

### Per Nuovi Utenti:

1. **Genera API Key** da Dashboard > Accounts
2. **Aggiungi EA** con API key
3. **Aspetta first sync** (30-60 sec)
4. **Verifica trades count** match tra MT5 e Dashboard
5. **Lascia EA sempre attivo** per sync continuo

### Per Utenti Esistenti (upgrade da v1.0):

1. **Backup**: Esporta trades attuali da Dashboard
2. **Rimuovi v1.0** EA dalla chart
3. **Aggiungi v2.0** EA con stessa API key
4. **Aspetta first sync** (popola eventuali gap)
5. **Verifica** che ora tutti i trades ci siano

### Per Multiple Accounts:

1. **API Key separata** per ogni account
2. **EA su ogni chart** (uno per account)
3. **Sync interval sfalsati** (es: 60, 70, 80 sec) per non sovraccaricare server

---

## 📞 Support & Feedback

**Issue con sync?**
1. Check log EA nel terminale MT5 (tab "Experts")
2. Verifica API key è valida
3. Run diagnostic script: `npx tsx scripts/compare-mt5-vs-db-trades.ts`
4. Contatta support con log completo

**Feature request?**
- Real-time push notifications quando trade chiude
- Bi-directional sync (dashboard → MT5)
- Multi-account aggregated view

---

**Version:** 2.0
**Last Updated:** 26 Ottobre 2025
**Compatibility:** MT5 Build 3640+, AEGIS Dashboard v1.0+
