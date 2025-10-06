# 🗄️ Database Setup - Guida Rapida

## TL;DR - Setup Database in 2 Minuti

### **Il Database È Manuale (per ora)**

Vercel **NON** include database automatico nel tier gratuito. Devi crearlo separatamente.

**MA** ho creato uno **Setup Wizard** che rende tutto semplicissimo!

---

## ⚡ Opzione 1: Setup Wizard Interattivo (CONSIGLIATO)

### Esegui questo comando:

**Windows:**
```powershell
.\scripts\setup-wizard.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-wizard.sh
./scripts/setup-wizard.sh
```

### Cosa fa lo wizard:
1. ✅ Apre browser su Prisma Cloud
2. ✅ Ti guida passo-passo
3. ✅ Configura .env.local automaticamente
4. ✅ Inizializza database
5. ✅ Crea utente admin
6. ✅ Avvia dev server

**Tempo totale: 3-4 minuti** (incluso creare account Prisma)

---

## 🛠️ Opzione 2: Setup Manuale

### Step 1: Crea Database su Prisma Cloud (2 minuti)

1. **Vai su:** https://cloud.prisma.io
2. **Crea account** (o fai login)
3. **Click:** "New Project"
4. **Seleziona:** PostgreSQL
5. **Regione:** Europe (o la più vicina)
6. **Click:** "Create"
7. **Click:** "Enable Accelerate"
8. **Copia:** L'URL che inizia con `prisma+postgres://...`

**Screenshot del processo:**
```
Prisma Cloud Dashboard
  ↓
+ New Project
  ↓
Select PostgreSQL
  ↓
Choose Region → Europe
  ↓
Create Database
  ↓
Enable Accelerate
  ↓
Copy Connection URL
```

---

### Step 2: Configura Environment Variables (30 secondi)

```bash
# Copia template
cp .env.example .env.local

# Genera secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Modifica `.env.local`:
```env
PRISMA_ACCELERATE_URL="prisma+postgres://...IL-TUO-URL..."
NEXTAUTH_SECRET="...IL-SECRET-GENERATO..."
NEXTAUTH_URL="http://localhost:3000"
```

---

### Step 3: Inizializza Database (30 secondi)

```bash
npm run setup:db
```

Questo comando:
- ✅ Genera Prisma Client
- ✅ Crea tutte le tabelle
- ✅ Configura relazioni
- ✅ Crea indici

---

### Step 4: Crea Utente Admin (30 secondi)

```bash
ADMIN_EMAIL="tua@email.com" ADMIN_PASSWORD="Password123!" npm run create-admin
```

---

## 📊 Perché Prisma Cloud?

### ✅ **Vantaggi:**
- **Gratis** - Tier gratuito generoso
- **Accelerate** - Connection pooling per serverless (essenziale per Vercel)
- **Gestito** - No setup server, backup automatici
- **Veloce** - CDN globale
- **Monitoring** - Dashboard con metriche

### ❌ **Alternative** (più complicate):

**Supabase:**
- Gratis ma richiede configurazione extra
- Bisogna configurare connection pooling manualmente

**Railway:**
- Gratis per $5/mese di crediti
- Poi a pagamento

**Neon:**
- Gratis ma con limiti più stringenti
- Richiede configurazione Prisma Accelerate separata

**Vercel Postgres:**
- A pagamento ($20/mese)
- Non disponibile nel free tier

---

## 🔐 Sicurezza Database

### ✅ Cosa è GIÀ configurato:

- ✅ `.env.local` nel `.gitignore` (credenziali NON vanno su git)
- ✅ Prisma Accelerate con encryption
- ✅ Password bcrypt hashing (12 rounds)
- ✅ Connection pooling sicuro
- ✅ Soft delete (no data loss)

### ⚠️ DA FARE su Vercel:

Quando deployi, aggiungi le stesse variabili su Vercel:
1. Vai su Vercel Dashboard
2. Progetto → Settings → Environment Variables
3. Aggiungi:
   - `PRISMA_ACCELERATE_URL` (stesso di .env.local)
   - `NEXTAUTH_SECRET` (stesso di .env.local)
   - `NEXTAUTH_URL` (https://tuo-app.vercel.app)

---

## 🚨 Troubleshooting

### "Can't reach database server"

**Causa:** URL sbagliato o database non attivo

**Fix:**
1. Verifica che l'URL inizi con `prisma+postgres://`
2. Controlla su Prisma Cloud che il database sia "Active"
3. Riprova il setup

---

### "Invalid API key"

**Causa:** API key scaduta o errata

**Fix:**
1. Vai su Prisma Cloud
2. Vai su Accelerate
3. Rigenera API key
4. Aggiorna `.env.local`

---

### "Table does not exist"

**Causa:** Schema non pushato

**Fix:**
```bash
npm run setup:db
```

---

### "Connection pool timeout"

**Causa:** Troppe connessioni (comune in development)

**Fix:**
```bash
# Riavvia il server
# Ctrl+C e poi
npm run dev
```

---

## 📈 Database Schema

Il database include queste tabelle:

```
users                 ← Utenti e autenticazione
  ├── accounts        ← OAuth accounts (NextAuth)
  └── sessions        ← User sessions

trading_accounts      ← Account di trading
  ├── trades          ← Storico trade
  └── account_metrics ← Metriche performance

journal_entries       ← Trading journal (future)
```

### Visualizza con Prisma Studio:

```bash
npm run db:studio
```

Apre una GUI web per esplorare il database!

---

## 🎯 Recap: Cosa Fare

### Setup Locale (Prima Volta):
1. ✅ Crea database su Prisma Cloud
2. ✅ Configura `.env.local`
3. ✅ Esegui `npm run setup:db`
4. ✅ Esegui `npm run create-admin`
5. ✅ Testa con `npm run dev`

### Deploy Vercel (Dopo il locale):
1. ✅ Aggiungi env variables su Vercel
2. ✅ Deploy con `vercel --prod`
3. ✅ Fatto! 🎉

---

## ⚡ Quick Commands

```bash
# Setup completo (dopo aver creato Prisma DB)
npm run setup:db
npm run create-admin
npm run dev

# Gestione database
npm run db:studio      # GUI database
npm run db:push        # Push schema changes

# Verifica
npm run deploy:check   # Check deployment readiness
```

---

## 🎁 Bonus: Setup Wizard

**Non vuoi fare tutto manualmente?**

```powershell
.\scripts\setup-wizard.ps1
```

Lo wizard fa TUTTO automaticamente tranne creare l'account Prisma (quello lo apre nel browser per te)!

---

## 💡 Pro Tips

### Tip 1: Salva le Credenziali
Dopo il setup, salva in un password manager:
- Email/Password Prisma Cloud
- PRISMA_ACCELERATE_URL
- NEXTAUTH_SECRET
- Admin email/password

### Tip 2: Backup
Prisma Cloud fa backup automatici, ma puoi esportare con:
```bash
npm run db:studio
# Export → Download as SQL
```

### Tip 3: Monitoring
Dashboard Prisma Cloud mostra:
- Query count
- Response times
- Connection pool usage
- Errors

---

## ✅ Checklist Setup

- [ ] Account Prisma Cloud creato
- [ ] Database PostgreSQL creato
- [ ] Accelerate abilitato
- [ ] URL copiato e salvato
- [ ] `.env.local` configurato
- [ ] `npm run setup:db` eseguito
- [ ] Utente admin creato
- [ ] `npm run dev` funziona
- [ ] Login funziona
- [ ] Dashboard carica dati

---

## 🚀 Pronto!

Una volta completato il setup del database, puoi:
- ✅ Sviluppare in locale
- ✅ Testare l'app
- ✅ Deployare su Vercel

**Il database è la parte "manuale", ma con lo wizard è super veloce!**

---

**Domande? Controlla [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) per info dettagliate!**
