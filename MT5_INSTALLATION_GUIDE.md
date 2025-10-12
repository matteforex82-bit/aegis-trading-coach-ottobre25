# 📊 AEGIS Trading Coach - Guida Installazione Expert Advisor MT5

## 🎯 Obiettivo
Collegare il tuo account MetaTrader 5 alla dashboard AEGIS per sincronizzare automaticamente:
- ✅ Informazioni account (balance, equity, margin)
- ✅ Posizioni aperte in tempo reale
- ✅ Storico trade (ultimi 100)
- ✅ Metriche di performance

---

## 📋 Requisiti

- MetaTrader 5 installato e configurato
- Account trading (Demo o Live)
- Connessione internet attiva
- Dashboard AEGIS online

---

## 🚀 Installazione Expert Advisor

### **Step 1: Copia il File**

1. Trova il file **`PropControlExporter.mq5`** nella cartella del progetto
   ```
   c:\Users\matte\Downloads\nuova Aegis ottobre 2025\aegis-trading-coach\PropControlExporter.mq5
   ```

2. Apri MetaTrader 5

3. Vai su **File → Apri Cartella Dati** (o premi `Ctrl+Shift+D`)

4. Naviga nella cartella:
   ```
   MQL5\Experts\
   ```

5. **Copia** il file `PropControlExporter.mq5` in questa cartella

---

### **Step 2: Compila l'Expert Advisor**

1. In MT5, apri **MetaEditor** (premi `F4` o click sull'icona)

2. Nel MetaEditor, trova `PropControlExporter.mq5` nel pannello **Navigator** a sinistra
   ```
   Experts → PropControlExporter.mq5
   ```

3. Fai doppio click per aprirlo

4. Clicca su **Compila** (icona ingranaggio o premi `F7`)

5. Verifica che la compilazione sia **0 errori, 0 warnings**
   ```
   ✅ Compilation completed successfully
   ✅ 0 error(s), 0 warning(s)
   ```

6. Chiudi MetaEditor e torna su MT5

---

### **Step 3: Abilita WebRequest**

⚠️ **IMPORTANTE**: MT5 blocca le richieste web per sicurezza. Devi abilitarle manualmente.

1. In MT5, vai su **Strumenti → Opzioni** (o premi `Ctrl+O`)

2. Clicca sulla tab **Expert Advisors**

3. Trova la sezione **"Consenti WebRequest per i seguenti URL:"**

4. Aggiungi questo URL (copia esattamente):
   ```
   https://aegis-trading-coach-k3zlqosbl-matteo-negrinis-projects.vercel.app
   ```

5. Click **OK**

---

### **Step 4: Applica l'Expert Advisor al Grafico**

1. Nel pannello **Navigator** di MT5 (sinistra), espandi **Expert Advisors**

2. Troverai **PropControlExporter**

3. **Trascina** `PropControlExporter` su **qualsiasi grafico** (non importa il simbolo)

4. Si aprirà una finestra di configurazione

---

### **Step 5: Configura i Parametri**

Nella finestra **Input Parameters**, verifica/modifica:

#### **Parametri Principali:**

| Parametro | Valore | Descrizione |
|-----------|--------|-------------|
| **API_URL** | `https://aegis-trading-coach-k3zlqosbl...` | URL della tua dashboard |
| **SYNC_INTERVAL_SECONDS** | `60` | Sincronizza ogni 60 secondi |
| **ENABLE_LOGGING** | `true` | Mostra log nel terminale |
| **SYNC_OPEN_POSITIONS** | `true` | Sincronizza posizioni aperte |
| **SYNC_CLOSED_TRADES** | `true` | Sincronizza storico trade |
| **SYNC_METRICS** | `true` | Sincronizza metriche |

#### **Parametri Opzionali (per Prop Firm):**

| Parametro | Esempio | Quando Usare |
|-----------|---------|--------------|
| **PROP_FIRM_NAME** | `"FTMO"` | Se stai usando prop firm |
| **ACCOUNT_PHASE** | `"Phase 1"` | Per challenge multi-fase |
| **ACCOUNT_START_BALANCE** | `100000` | Balance iniziale del challenge |

---

### **Step 6: Avvia l'Expert Advisor**

1. Nella stessa finestra, vai alla tab **Common**

2. ✅ Assicurati che sia **ABILITATO**:
   - ☑️ Allow Algo Trading
   - ☑️ Allow WebRequest

3. Click **OK**

4. L'EA si avvierà e vedrai una **faccina sorridente** 😊 nell'angolo del grafico

---

## 🔍 Verificare che Funzioni

### **1. Controlla i Log in MT5**

1. Apri il pannello **Toolbox** in basso (premi `Ctrl+T` se non è visibile)

2. Click sulla tab **Experts**

3. Dovresti vedere:
   ```
   =================================================
   AEGIS Trading Coach - Expert Advisor Started
   =================================================
   API URL: https://aegis-trading-coach-k3zlqosbl...
   Sync Interval: 60 seconds
   Account: 123456789
   Broker: FTMO Demo
   Server: FTMO-Demo
   =================================================
   🔄 Starting data sync #1...
   📦 Payload size: 1234 bytes
   ✅ Sync successful! Response: {"success":true,...}
   ```

### **2. Controlla la Dashboard**

1. Vai su:
   ```
   https://aegis-trading-coach-k3zlqosbl-matteo-negrinis-projects.vercel.app/dashboard/accounts
   ```

2. Dovresti vedere il tuo account MT5 apparire automaticamente!

3. Vai su **Dashboard → Trades** per vedere le posizioni

---

## ❌ Troubleshooting

### **Problema 1: "WebRequest is not allowed"**

**Soluzione:**
- Vai su **Strumenti → Opzioni → Expert Advisors**
- Aggiungi l'URL completo della dashboard alla lista autorizzata
- Riavvia l'EA (rimuovi e riapplica al grafico)

---

### **Problema 2: "Sync failed with code: -1"**

**Soluzione:**
- Verifica che Internet sia connesso
- Controlla che l'URL in `API_URL` sia corretto
- Assicurati di aver abilitato WebRequest (vedi sopra)

---

### **Problema 3: "Sync failed with code: 401/403"**

**Soluzione:**
- La dashboard potrebbe richiedere autenticazione
- Verifica che l'API endpoint `/api/ingest/mt5` sia pubblico
- Controlla i log di Vercel per errori

---

### **Problema 4: L'account non appare nella dashboard**

**Soluzione:**
1. Controlla i log MT5 - deve dire "✅ Sync successful"
2. Fai refresh della pagina dashboard
3. Controlla che tu sia loggato con l'account admin
4. Verifica il database - dovrebbe contenere i dati:
   ```bash
   npm run db:studio
   ```

---

### **Problema 5: "Cannot find module 'PropControlExporter'"**

**Soluzione:**
- Compila nuovamente l'EA nel MetaEditor (`F7`)
- Riavvia MT5
- Verifica che il file `.mq5` sia nella cartella `MQL5\Experts\`

---

## 📊 Parametri Avanzati

### **Cambiare Frequenza di Sync**

Per sincronizzare più spesso/meno spesso:
- `SYNC_INTERVAL_SECONDS = 30` → sync ogni 30 secondi
- `SYNC_INTERVAL_SECONDS = 300` → sync ogni 5 minuti

⚠️ Non scendere sotto i 10 secondi per evitare rate limiting.

---

### **Disabilitare il Logging**

Se i log sono troppi:
```
ENABLE_LOGGING = false
```

---

### **Sync Solo Posizioni Aperte**

Se vuoi solo le posizioni correnti, non lo storico:
```
SYNC_OPEN_POSITIONS = true
SYNC_CLOSED_TRADES = false
SYNC_METRICS = false
```

---

## 🎯 Prossimi Step

Una volta che l'EA è connesso e funzionante:

1. ✅ Monitora le posizioni in tempo reale nella dashboard
2. ✅ Analizza le metriche di performance
3. ✅ Usa il Journal per annotare le tue strategie
4. ✅ Configura le Prop Firm settings per tracking challenge

---

## 🆘 Supporto

Se hai problemi:
1. Controlla i log in MT5 (tab **Experts**)
2. Controlla i log di Vercel: https://vercel.com/matteo-negrinis-projects/aegis-trading-coach
3. Verifica che l'API sia raggiungibile:
   ```
   curl https://aegis-trading-coach-k3zlqosbl-matteo-negrinis-projects.vercel.app/api/health
   ```

---

## ✅ Checklist Finale

- [ ] File `.mq5` copiato in `MQL5\Experts\`
- [ ] EA compilato senza errori
- [ ] WebRequest abilitato per l'URL dashboard
- [ ] EA applicato a un grafico
- [ ] Parametri configurati correttamente
- [ ] Log MT5 mostra "✅ Sync successful"
- [ ] Account visibile nella dashboard

---

**🎉 Congratulazioni! Il tuo MT5 è ora connesso alla dashboard AEGIS!**

📈 Buon trading e buon monitoraggio!
