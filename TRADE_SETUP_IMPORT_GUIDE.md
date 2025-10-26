# 📊 AEGIS Trading Coach - Trade Setup Import Guide

## 🎯 Scopo di questo documento

Questa guida ti aiuta a creare rapidamente file **YAML** o **TXT** per importare i tuoi trading setup Elliott Wave nella dashboard AEGIS.

---

## 📋 Formato File Supportati

AEGIS supporta **2 formati**:

### 1. **YAML** (Consigliato) ✅
- File strutturato e leggibile
- Supporta commenti e annotazioni
- Validazione automatica della sintassi
- **Estensione**: `.yml` o `.yaml`

### 2. **TXT** (Alternativo)
- File semplice key-value
- Più veloce da scrivere a mano
- Meno strutturato
- **Estensione**: `.txt`

---

## 🚀 QUICK START - Crea il tuo primo setup in 3 minuti

### Step 1: Copia il Template Base

Crea un file chiamato `my-setups.yml` e incolla:

```yaml
setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h
    entryPrice: 1.0850
    stopLoss: 1.0800
    takeProfit1: 1.0900
    analysisDate: "2025-10-26"
```

### Step 2: Compila i tuoi dati

Sostituisci i valori con i tuoi:
- `symbol`: EURUSD, GBPUSD, XAUUSD, etc.
- `direction`: BUY o SELL
- `entryPrice`: Il tuo livello di entrata
- `stopLoss`: Il tuo stop loss
- `takeProfit1`: Il tuo primo target
- `analysisDate`: Data di oggi (formato YYYY-MM-DD)

### Step 3: Importa nella Dashboard

1. Vai su **Admin Trading Room** > **Import** tab
2. Carica il file `my-setups.yml`
3. Verifica l'anteprima
4. Click "Confirm Import"

✅ **FATTO!** Il tuo setup è live nella Trading Room!

---

## 📝 FORMATO DETTAGLIATO - Tutti i Campi Disponibili

### Campi OBBLIGATORI ⚠️

```yaml
category: FOREX              # FOREX | INDICES | COMMODITIES | BITCOIN
symbol: EURUSD               # Simbolo strumento
direction: BUY               # BUY | SELL | NEUTRAL
timeframe: 4h                # "1h", "4h", "8h", "1D", "1W"
entryPrice: 1.0850           # Prezzo di entrata
stopLoss: 1.0800             # Stop Loss
analysisDate: "2025-10-26"   # Data analisi (YYYY-MM-DD)
```

### Campi OPZIONALI (ma consigliati) 💡

```yaml
# Elliott Wave Info
wavePattern: "Wave 3 Impulse"        # Es: "ABC Correction", "Impulse 5"
waveCount: "3 of (5)"                # Es: "(C) of (Y)", "5 of 3"

# Take Profit Levels (puoi averne fino a 3)
takeProfit1: 1.0900                  # Primo target
takeProfit2: 1.0950                  # Secondo target (opzionale)
takeProfit3: 1.1000                  # Terzo target (opzionale)

# Invalidation & Expiry
invalidation: 1.0750                 # Prezzo di invalidazione setup
expiresAt: "2025-11-26"              # Scadenza setup (YYYY-MM-DD)

# Note Estese
notes: |
  Qui puoi scrivere note su più righe.
  Spiega il contesto del setup, i livelli chiave,
  i motivi per cui pensi che questo setup abbia alta probabilità.

# Link PDF (opzionale)
pdfUrl: "https://your-storage.com/analysis.pdf"

# Controllo Visibilità
isPremium: true                      # true | false (default: true)
requiredPlan: PRO                    # FREE | STARTER | PRO | ENTERPRISE
isActive: true                       # true | false (default: true)
```

---

## 🔢 ESEMPI PRATICI - Copia & Incolla

### Esempio 1: Setup FOREX Completo (con TP multipli)

```yaml
setups:
  - category: FOREX
    symbol: GBPUSD
    direction: BUY
    timeframe: 8h
    wavePattern: "Impulse Wave 3"
    waveCount: "3 of (5)"

    entryPrice: 1.27500
    stopLoss: 1.26200
    takeProfit1: 1.28500      # +100 pips
    takeProfit2: 1.29500      # +200 pips
    takeProfit3: 1.31000      # +350 pips
    invalidation: 1.26000

    analysisDate: "2025-10-26"
    expiresAt: "2025-11-26"

    notes: |
      Setup bullish dopo completamento Wave 2 (ABC correction).
      Attendiamo breakout di 1.27500 per confermare inizio Wave 3.
      Risk/Reward: 1:3 (ottimo rapporto).

    isPremium: true
    requiredPlan: PRO
```

### Esempio 2: Setup GOLD (XAU/USD)

```yaml
setups:
  - category: COMMODITIES
    symbol: XAUUSD
    direction: SELL
    timeframe: 4h
    wavePattern: "ABC Correction"
    waveCount: "C of (B)"

    entryPrice: 2050.00
    stopLoss: 2075.00
    takeProfit1: 2000.00
    takeProfit2: 1950.00
    invalidation: 2080.00

    analysisDate: "2025-10-26"
    notes: "Correzione ABC in atto, attendiamo onda C verso il basso."
```

### Esempio 3: Setup BITCOIN

```yaml
setups:
  - category: BITCOIN
    symbol: BTCUSD
    direction: BUY
    timeframe: 1D
    wavePattern: "Wave 5 of (5)"

    entryPrice: 65000
    stopLoss: 62000
    takeProfit1: 70000
    takeProfit2: 75000
    takeProfit3: 80000

    analysisDate: "2025-10-26"
    notes: "Ultimo impulso rialzista Wave 5 atteso."
```

### Esempio 4: Setup US30 (Dow Jones)

```yaml
setups:
  - category: INDICES
    symbol: US30
    direction: SELL
    timeframe: 1D
    wavePattern: "Double Top"

    entryPrice: 38500
    stopLoss: 39000
    takeProfit1: 37500
    takeProfit2: 36500

    analysisDate: "2025-10-26"
    notes: "Double top formation vicino a massimi storici."
```

---

## 🎨 SETUP MULTIPLI - Come importare più setup in un unico file

```yaml
metadata:
  version: "1.0"
  author: "Il Tuo Nome"
  importDate: "2025-10-26"
  source: "Elliott Wave Analysis - Ottobre 2025"

setups:
  # Setup 1: EUR/USD
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h
    entryPrice: 1.0850
    stopLoss: 1.0800
    takeProfit1: 1.0900
    analysisDate: "2025-10-26"
    notes: "Breakout atteso dopo consolidamento."

  # Setup 2: GBP/USD
  - category: FOREX
    symbol: GBPUSD
    direction: SELL
    timeframe: 8h
    entryPrice: 1.27000
    stopLoss: 1.28000
    takeProfit1: 1.25500
    takeProfit2: 1.24000
    analysisDate: "2025-10-26"
    notes: "Correzione ABC in corso, entry su breakout."

  # Setup 3: Gold
  - category: COMMODITIES
    symbol: XAUUSD
    direction: BUY
    timeframe: 1D
    entryPrice: 2000.00
    stopLoss: 1980.00
    takeProfit1: 2050.00
    takeProfit2: 2100.00
    takeProfit3: 2150.00
    analysisDate: "2025-10-26"
    wavePattern: "Wave 3 Impulse"
    notes: "Forte setup bullish su Gold."
```

---

## 🛠️ FORMATO ALTERNATIVO - TXT (Key-Value)

Se preferisci un formato più semplice:

```txt
=== SETUP 1 ===
category=FOREX
symbol=EURUSD
direction=BUY
timeframe=4h
entryPrice=1.0850
stopLoss=1.0800
takeProfit1=1.0900
analysisDate=2025-10-26

=== SETUP 2 ===
category=FOREX
symbol=GBPUSD
direction=SELL
timeframe=8h
entryPrice=1.27000
stopLoss=1.28000
takeProfit1=1.25500
analysisDate=2025-10-26
```

**Nota**: Il formato TXT è meno flessibile (no commenti, no note multi-line).

---

## ⚙️ VALIDAZIONE - Cosa controlla AEGIS

Quando importi un file, AEGIS valida automaticamente:

✅ **Campi obbligatori presenti**
- category, symbol, direction, timeframe
- entryPrice, stopLoss, analysisDate

✅ **Valori validi**
- category: solo FOREX, INDICES, COMMODITIES, BITCOIN
- direction: solo BUY, SELL, NEUTRAL
- Prezzi: numeri decimali positivi
- Date: formato YYYY-MM-DD

✅ **Logica prezzi**
- Per BUY: stopLoss < entryPrice < takeProfit
- Per SELL: stopLoss > entryPrice > takeProfit

❌ **Errori comuni da evitare**:
- Date nel formato sbagliato (usa YYYY-MM-DD, non DD/MM/YYYY)
- Prezzi con virgola invece di punto (usa 1.0850, non 1,0850)
- Indentazione YAML sbagliata (usa 2 spazi, non tab)
- Simboli con spazi (usa EURUSD, non EUR USD)

---

## 🎯 BEST PRACTICES

### ✅ DO (Fai così):
1. **Usa nomi simboli standard**: EURUSD, GBPUSD, XAUUSD, BTCUSD, US30
2. **Inserisci sempre le note**: Spiega il "perché" del setup
3. **Imposta invalidation price**: Livello dove il setup decade
4. **Usa multipli TP**: Prendi profitti parziali (TP1, TP2, TP3)
5. **Aggiungi expiresAt**: Setups vecchi diventano automaticamente inattivi
6. **Testa con 1 setup**: Importa prima 1 solo setup per testare

### ❌ DON'T (Non fare):
1. **Non usare simboli inventati**: Stick ai simboli standard MT5
2. **Non lasciare note vuote**: Spiega sempre la logica del setup
3. **Non mettere TP before SL**: Rispetta la logica BUY/SELL
4. **Non dimenticare analysisDate**: AEGIS la usa per ordinare i setups
5. **Non importare setups scaduti**: Imposta expiresAt per quelli vecchi

---

## 🔍 TROUBLESHOOTING

### Errore: "Invalid YAML syntax"
**Soluzione**: Controlla l'indentazione. Usa esattamente 2 spazi (non tab).

```yaml
# ❌ SBAGLIATO (tabs o spazi sbagliati)
setups:
- category: FOREX
  symbol:EURUSD

# ✅ GIUSTO (2 spazi per ogni livello)
setups:
  - category: FOREX
    symbol: EURUSD
```

### Errore: "Invalid date format"
**Soluzione**: Usa YYYY-MM-DD con le virgolette.

```yaml
# ❌ SBAGLIATO
analysisDate: 26/10/2025

# ✅ GIUSTO
analysisDate: "2025-10-26"
```

### Errore: "stopLoss must be lower than entryPrice for BUY"
**Soluzione**: Per setup BUY, lo stop loss deve essere SOTTO l'entry.

```yaml
# ❌ SBAGLIATO
direction: BUY
entryPrice: 1.0850
stopLoss: 1.0900  # Stop SOPRA entry!

# ✅ GIUSTO
direction: BUY
entryPrice: 1.0850
stopLoss: 1.0800  # Stop SOTTO entry
```

### Import fallisce senza errori
**Soluzione**:
1. Verifica che il file sia UTF-8 encoded
2. Controlla che non ci siano caratteri speciali strani
3. Prova a importare un setup minimal per testare

---

## 📦 TEMPLATE PRONTI - Download & Go

### Template Minimal (solo campi obbligatori)
```yaml
setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h
    entryPrice: 1.0850
    stopLoss: 1.0800
    analysisDate: "2025-10-26"
```

### Template Standard (consigliato)
```yaml
setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h
    wavePattern: "Impulse Wave 3"

    entryPrice: 1.0850
    stopLoss: 1.0800
    takeProfit1: 1.0900
    takeProfit2: 1.0950
    invalidation: 1.0750

    analysisDate: "2025-10-26"
    expiresAt: "2025-11-26"

    notes: |
      Spiega qui il contesto del setup.

    isPremium: true
```

### Template Completo (tutti i campi)
```yaml
metadata:
  version: "1.0"
  author: "Il Tuo Nome"
  importDate: "2025-10-26"
  source: "Elliott Wave Analysis"

setups:
  - category: FOREX
    symbol: EURUSD
    direction: BUY
    timeframe: 4h

    wavePattern: "Impulse Wave 3"
    waveCount: "3 of (5)"

    entryPrice: 1.0850
    stopLoss: 1.0800
    takeProfit1: 1.0900
    takeProfit2: 1.0950
    takeProfit3: 1.1000
    invalidation: 1.0750

    analysisDate: "2025-10-26"
    expiresAt: "2025-11-26"

    notes: |
      Setup bullish dopo completamento Wave 2.
      Attendiamo breakout di resistance 1.0850.
      Risk/Reward ottimo 1:3.

    pdfUrl: "https://your-storage.com/eurusd-analysis.pdf"

    isPremium: true
    requiredPlan: PRO
    isActive: true
```

---

## 🚀 WORKFLOW CONSIGLIATO

1. **Analisi** → Fai la tua Elliott Wave analysis su TradingView/MT5
2. **Template** → Copia uno dei template sopra
3. **Compila** → Riempi i dati del tuo setup
4. **Salva** → Salva come `setups-[data].yml` (es. `setups-2025-10-26.yml`)
5. **Import** → Vai su Admin Trading Room > Import
6. **Preview** → Verifica l'anteprima dei setups
7. **Confirm** → Click "Confirm Import"
8. **Live** → Setup visibile nella Trading Room! 🎉

---

## 🎓 SKILL CLAUDE - Automazione Import

Puoi creare una **Claude Skill** per generare automaticamente i file YAML:

**Prompt Skill:**
```
Sei un assistente AEGIS Trading Coach.
Quando l'utente ti fornisce i dati di un trading setup,
genera un file YAML completo e valido seguendo il formato:

[inserisci qui il Template Completo]

Chiedi sempre:
- Symbol (es. EURUSD)
- Direction (BUY/SELL)
- Entry Price
- Stop Loss
- Take Profit levels
- Timeframe
- Note/Context

Genera il file YAML pronto per l'import.
```

---

## 📞 SUPPORT

Per problemi con l'import:
1. Verifica la sintassi su [YAML Validator](https://www.yamllint.com/)
2. Testa con un setup minimal first
3. Controlla i log di import nella dashboard
4. Contatta support se l'errore persiste

---

## 🔗 REFERENCE LINKS

- **YAML Specification**: https://yaml.org/spec/1.2/spec.html
- **YAML Validator**: https://www.yamllint.com/
- **Date Format (ISO 8601)**: https://www.iso.org/iso-8601-date-and-time-format.html
- **AEGIS Docs**: [Link to your docs]

---

**Ultimo aggiornamento:** 26 Ottobre 2025
**Versione:** 1.0
**Compatibile con:** AEGIS Trading Coach v1.0+
