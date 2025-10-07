# 🚀 Deploy AEGIS Trading Coach su Vercel

Guida completa per il deploy in 5 minuti.

---

## 📋 Prerequisiti

- Account GitHub (gratuito)
- Account Vercel (gratuito) → https://vercel.com
- Account Prisma Cloud (gratuito) → https://cloud.prisma.io

---

## ⚡ Procedura Rapida

### **Step 1: Setup Database (2 minuti)**

1. Vai su **https://cloud.prisma.io**
2. Crea account o fai login
3. Click **"New Project"**
4. Seleziona **PostgreSQL**
5. Scegli regione: **Europe** (o la più vicina)
6. Click **"Create"**
7. Click **"Enable Accelerate"**
8. **Copia l'URL** che inizia con `prisma+postgres://...`
   - ⚠️ **SALVALO** - ti servirà dopo!

---

### **Step 2: Prepara il Codice (1 minuto)**

```bash
# Genera NextAuth Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Salva** il secret generato - ti servirà dopo!

---

### **Step 3: Push su GitHub (1 minuto)**

```bash
# Inizializza git (se non l'hai già fatto)
git init

# Aggiungi tutti i file
git add .

# Commit
git commit -m "Deploy AEGIS Trading Coach"

# Crea branch main
git branch -M main

# Aggiungi repository GitHub (sostituisci TUO-USERNAME)
git remote add origin https://github.com/TUO-USERNAME/aegis-trading-coach.git

# Push
git push -u origin main
```

---

### **Step 4: Deploy su Vercel (2 minuti)**

#### 4.1 Importa Progetto

1. Vai su **https://vercel.com/new**
2. Click **"Import Project"**
3. Seleziona il tuo repository GitHub
4. Click **"Import"**

#### 4.2 Configura Progetto

Vercel rileverà automaticamente Next.js. **NON modificare** queste impostazioni:
- Framework: Next.js ✅
- Build Command: `npm run build` ✅
- Output Directory: `.next` ✅

#### 4.3 Aggiungi Environment Variables

Click su **"Environment Variables"** e aggiungi:

| Nome | Valore |
|------|--------|
| `PRISMA_ACCELERATE_URL` | L'URL Prisma copiato allo Step 1 |
| `NEXTAUTH_SECRET` | Il secret generato allo Step 2 |
| `NEXTAUTH_URL` | `https://tuo-app.vercel.app` |

⚠️ **IMPORTANTE**: Per `NEXTAUTH_URL`, usa temporaneamente `https://tuo-app.vercel.app`. Lo aggiorneremo dopo il primo deploy.

#### 4.4 Deploy!

1. Click **"Deploy"**
2. Aspetta 2-3 minuti
3. ✅ **Deployment completato!**

#### 4.5 Aggiorna NEXTAUTH_URL

1. Vercel ti mostrerà l'URL del tuo sito (es: `https://aegis-trading-coach-abc123.vercel.app`)
2. Vai su **Settings** → **Environment Variables**
3. Modifica `NEXTAUTH_URL` con l'URL reale del tuo sito
4. Click **"Save"**
5. Vai su **Deployments** e fai **"Redeploy"**

---

## 🎯 Post-Deploy: Crea Admin

### Opzione 1: Da Locale (Consigliato)

```bash
# Configura .env.local con l'URL di produzione
echo PRISMA_ACCELERATE_URL="il-tuo-prisma-url" > .env.local
echo NEXTAUTH_SECRET="il-tuo-secret" >> .env.local
echo NEXTAUTH_URL="https://tuo-app.vercel.app" >> .env.local

# Setup database
npm run setup:db

# Crea admin
ADMIN_EMAIL="tua@email.com" ADMIN_PASSWORD="Password123!" npm run create-admin
```

### Opzione 2: Da Vercel (Alternativa)

1. Crea file `app/api/setup-admin/route.ts`:

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  const { secret, email, password, name } = await request.json()

  // Usa un secret temporaneo
  if (secret !== "SETUP_SECRET_123_DELETE_AFTER") {
    return NextResponse.json({ error: "Invalid" }, { status: 403 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  })

  return NextResponse.json({ success: true, userId: user.id })
}
```

2. Fai commit e push:

```bash
git add .
git commit -m "Add setup admin endpoint"
git push
```

3. Aspetta il deploy automatico (1-2 minuti)

4. Chiama l'API:

```bash
curl -X POST https://tuo-app.vercel.app/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "SETUP_SECRET_123_DELETE_AFTER",
    "email": "tua@email.com",
    "password": "Password123!",
    "name": "Admin"
  }'
```

5. **ELIMINA** il file `app/api/setup-admin/route.ts`:

```bash
git rm app/api/setup-admin/route.ts
git commit -m "Remove setup endpoint"
git push
```

---

## ✅ Verifica Deployment

### Test 1: Health Check

```bash
curl https://tuo-app.vercel.app/api/health
```

Risposta attesa:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "AEGIS Trading Coach API"
}
```

### Test 2: Accedi all'App

1. Apri: `https://tuo-app.vercel.app`
2. Vai su `/auth/signin`
3. Login con credenziali admin
4. Dovresti vedere la dashboard ✅

---

## 🔄 Deploy Automatici (CI/CD)

Vercel deploya automaticamente ad ogni push su `main`!

Per deployare:
```bash
git add .
git commit -m "Le tue modifiche"
git push
```

Vercel:
1. Rileva il push
2. Esegue build automaticamente
3. Deploya la nuova versione
4. Ti notifica via email ✅

---

## 🔧 Comandi Utili

```bash
# Sviluppo locale
npm run dev

# Setup database
npm run setup:db

# Crea admin
npm run create-admin

# Controlla se pronto per deploy
npm run deploy:check

# Build locale (per testare)
npm run build

# Visualizza database
npm run db:studio
```

---

## 🎨 Personalizzazioni

### Custom Domain (Opzionale)

1. Compra dominio (es: GoDaddy, Namecheap)
2. Vai su Vercel → **Settings** → **Domains**
3. Aggiungi il tuo dominio
4. Segui le istruzioni DNS
5. Aggiorna `NEXTAUTH_URL` con il nuovo dominio

### Analytics Vercel

1. Vai su Vercel Dashboard
2. **Analytics** → **Enable**
3. Monitora traffico, performance, errori

---

## 🚨 Troubleshooting

### Build Fallisce

**Errore: "Prisma Client not generated"**
```bash
# Soluzione: già risolto in package.json
# "build": "prisma generate && next build"
```

**Errore: "Environment variables missing"**
- Controlla che tutte le env vars siano su Vercel
- Settings → Environment Variables

### Database Non Connette

**Errore: "Can't reach database"**
- Verifica `PRISMA_ACCELERATE_URL` su Vercel
- Controlla che inizi con `prisma+postgres://`
- Verifica database attivo su Prisma Cloud

### Login Non Funziona

**Errore: "NextAuth configuration error"**
- Verifica `NEXTAUTH_URL` corrisponda all'URL Vercel
- Verifica `NEXTAUTH_SECRET` sia impostato
- Fai redeploy dopo aver modificato env vars

### MT5 Non Sincronizza

**Errore: "403 Forbidden"**
- Aggiungi URL Vercel a MT5 WebRequest settings
- Verifica `/api/ingest/mt5` non richieda auth
- Controlla `middleware.ts` public routes

---

## 📊 Monitoring

### Vercel Dashboard
- **Deployments**: Storico deploy
- **Logs**: Runtime logs
- **Analytics**: Traffico e performance
- **Functions**: Usage API routes

### Prisma Cloud
- **Metrics**: Query count, latency
- **Accelerate**: Connection pool status
- **Logs**: Query logs

---

## 📱 Configura MT5

Dopo il deploy, configura Expert Advisor:

1. Apri `PropControlExporter.mq5`
2. Modifica:
   ```cpp
   string API_URL = "https://tuo-app.vercel.app";
   ```
3. Compila e carica su MT5
4. Abilita WebRequest in MT5:
   - Tools → Options → Expert Advisors
   - Aggiungi: `https://tuo-app.vercel.app`
5. Avvia EA sul grafico

---

## ✨ Checklist Finale

- [ ] Database Prisma creato e attivo
- [ ] Codice pushato su GitHub
- [ ] Deploy Vercel completato
- [ ] Environment variables configurate
- [ ] `NEXTAUTH_URL` aggiornato con URL reale
- [ ] Admin user creato
- [ ] Login funzionante
- [ ] Dashboard carica correttamente
- [ ] API health check risponde
- [ ] (Opzionale) MT5 sincronizza

---

## 🎉 Fatto!

**La tua app è LIVE su:**
👉 `https://tuo-app.vercel.app`

### Prossimi Passi:

1. 📊 Configura MT5 Expert Advisor
2. 👥 Crea account utenti
3. 📈 Inizia a trackare i trade
4. 🔍 Monitora performance

---

## 📚 Link Utili

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Prisma Cloud**: https://cloud.prisma.io
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://next-auth.js.org

---

## 💡 Tips

1. **Backup**: Esporta database da Prisma Studio periodicamente
2. **Secrets**: Salva tutte le credenziali in un password manager
3. **Logs**: Controlla logs Vercel per errori
4. **Updates**: `git push` deploya automaticamente

---

**Domande?** Apri un issue su GitHub o controlla la documentazione!

Happy Trading! 📈
