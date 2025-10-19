# 🚀 Quick AI Prompt - Elliott Wave to YAML

## 📋 Prompt Veloce (Copy & Paste)

Usa questo prompt quando hai poco tempo. Incolla insieme al tuo PDF/PNG:

---

```
Analizza questo documento Elliott Wave e genera un file YAML per AEGIS Trading Coach.

FORMATO RICHIESTO:

metadata:
  version: "1.0"
  author: "AI Generated"
  importDate: "2025-10-19"
  source: "Descrivi la fonte"

setups:
  - category: [FOREX|INDICES|COMMODITIES|BITCOIN]
    symbol: [SIMBOLO MAIUSCOLO, no slash]
    direction: [BUY|SELL|NEUTRAL]
    timeframe: "[1h|4h|8h|1D|1W]"
    wavePattern: "[Pattern Elliott Wave]"
    waveCount: "[Conteggio onde]"
    entryPrice: [numero senza virgolette]
    stopLoss: [numero senza virgolette]
    takeProfit1: [numero]
    takeProfit2: [numero - opzionale]
    takeProfit3: [numero - opzionale]
    invalidation: [numero - opzionale]
    analysisDate: "YYYY-MM-DD"
    notes: |
      [Analisi dettagliata con:
      - Reasoning Elliott Wave
      - Market context e sentiment
      - Risk factors
      - News rilevanti della settimana]

REGOLE:
1. Prezzi FOREX: 5 decimali (es: 1.08500)
2. Prezzi Indices/Commodities: 2 decimali (es: 35500.00)
3. Symbol format: EURUSD, GBPUSD, US30, XAUUSD, BTCUSD
4. Date format: "2025-10-19"
5. NO virgolette sui numeri
6. Campi obbligatori: category, symbol, direction, timeframe, entryPrice, stopLoss, analysisDate

VERIFICA SENTIMENT:
Prima di generare, considera:
- News economiche recenti (ultimi 3 giorni)
- Eventi in calendario questa settimana
- Sentiment generale del mercato
- Rischi geopolitici o macro

INCLUDI nelle notes:
- Valutazione sentiment (Bullish/Bearish/Neutral)
- Eventi chiave da monitorare
- Risk level (Low/Medium/High)

OUTPUT: Solo YAML valido, nessun altro testo.
```

---

## 🎯 Esempi Pratici

### **Esempio 1: Singolo Setup FOREX**

**Input:** Screenshot EUR/USD con pattern Wave 3

**Prompt:**
```
Analizza questo grafico EURUSD e genera setup YAML.

Identifica:
- Pattern Elliott Wave
- Entry, SL, TP levels
- Verifica sentiment EUR (BCE) e USD (FED)
- News rilevanti questa settimana

Output: YAML formato AEGIS
```

### **Esempio 2: Multi-Asset PDF**

**Input:** PDF con analisi settimanale 5-6 pair

**Prompt:**
```
Analizza questo PDF settimanale e genera YAML con tutti i setup.

Per ogni asset:
- Estrai livelli chiave
- Identifica pattern Elliott Wave
- Verifica sentiment e calendario economico
- Filtra solo setup con alta probabilità

Organizza per categoria (FOREX, INDICES, COMMODITIES).
Output: YAML completo.
```

### **Esempio 3: Update Setup Esistente**

**Input:** Grafico aggiornato con nuovi livelli

**Prompt:**
```
Questo setup GBPUSD è stato aggiornato.

Setup originale aveva:
- Entry: 1.30000
- SL: 1.29000

Nuovo grafico mostra:
- Entry modificato a 1.30500
- Nuovo TP3 aggiunto

Genera YAML aggiornato mantenendo stessa struttura.
Aggiorna analysisDate a oggi.
```

---

## ⚡ Super Quick (Una Riga)

Per analisi velocissime:

```
Analizza questo grafico Elliott Wave → genera YAML formato AEGIS con tutti i setup identificati, verifica sentiment e news, output solo YAML valido.
```

---

## 🔧 Troubleshooting Rapido

### **Errore: "Invalid YAML"**
→ Chiedi: "Fix YAML syntax errors: [incolla YAML]"

### **Prezzi Sbagliati**
→ Chiedi: "Verify current market prices for [SYMBOL] and correct YAML"

### **Note Vaghe**
→ Chiedi: "Expand notes section with detailed Elliott Wave reasoning and market context"

### **Campi Mancanti**
→ Chiedi: "Add missing required fields: [lista campi] to this YAML"

---

## 📊 Checklist Pre-Import (30 secondi)

Controlla velocemente:
- [ ] Symbol formato corretto (EURUSD non EUR/USD)
- [ ] Prezzi hanno decimali giusti (5 per FX, 2 per altri)
- [ ] Entry tra SL e TP
- [ ] Date in formato YYYY-MM-DD
- [ ] Note non vuote

✅ OK → Upload su AEGIS!

---

## 🎯 Workflow Ottimizzato

```
1. Upload PDF/PNG all'AI → 10 sec
2. Paste prompt veloce → 5 sec
3. AI genera YAML → 30 sec
4. Quick check → 20 sec
5. Upload AEGIS → 10 sec
6. Preview → 10 sec
7. Confirm → 5 sec

TOTALE: ~90 secondi ⚡
```

---

## 💡 Pro Tips

### **Copia Veloce:**
Crea uno snippet tool (Alfred, TextExpander) con il prompt base.
Keyword: `aegis` → Incolla prompt completo

### **Multi-Monitor:**
- Monitor 1: AI chat
- Monitor 2: AEGIS Trading Room
- Drag & drop YAML direttamente

### **Batch Processing:**
Raccogli PDF della settimana → Processa tutti insieme in un'unica sessione

### **Review Smart:**
Focus su:
1. Prezzi realistici?
2. Note hanno sentiment?
3. Risk factors presenti?

Ignora formattazione dettagli (l'AI è precisa)

---

## 🔗 Link Utili

- **YAML Validator:** https://www.yamllint.com
- **Template Completo:** Vedi `data/trading-setups.example.yml`
- **Documentazione Estesa:** Vedi `AI_ANALYSIS_PROMPT.md`
- **AEGIS Import:** `/dashboard/admin/trading-room` → Tab Import

---

## 📱 Mobile Workflow

Anche da mobile:

1. Foto grafico con smartphone
2. Upload ad AI (Claude/ChatGPT app)
3. Paste quick prompt
4. Copia YAML generato
5. Paste in note app
6. Sync con desktop
7. Import quando al PC

---

**Ultimo aggiornamento:** 2025-10-19
**Versione:** 1.0 Quick Reference

---

*⚡ Quick, Simple, Effective*
