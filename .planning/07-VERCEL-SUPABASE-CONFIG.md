# Vercel & Supabase Configuratie

## Vercel Project

### Project Details
- **Project ID**: `prj_LBxwTADV6A0COItPTCubcwF4XJVe`
- **Team ID**: `team_7f5GvqVpnIcRnHDJgsuPSr6s`
- **Framework**: Vite
- **Git**: GitHub account `joriszwanenburg95-maker`
- **Productie URL**: `digidromen.vercel.app`

### vercel.json (huidig + uitbreidingen)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm install --prefix portal",
  "buildCommand": "npm run build --prefix portal",
  "outputDirectory": "portal/dist",
  "rewrites": [
    { "source": "/auth/callback", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

De `/auth/callback` rewrite zorgt ervoor dat Supabase magic link redirects correct door de SPA afgehandeld worden. De catch-all rewrite is al aanwezig en vangt dit eigenlijk ook al op, maar de expliciete regel maakt de intent duidelijk.

### Environment Variables (Vercel Dashboard)

| Variable | Scope | Waarde |
|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview, Dev | `https://oyxcwfozoxlgdclchden.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Dev | Supabase anon/public key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Dev | Zelfde als anon key (Vercel Marketplace naam) |

**Let op**: Alle `VITE_*` variabelen worden in de client-side bundle opgenomen. Zet hier **nooit** de `service_role` key.

### Build & Deploy
- **Node version**: 20.x (Vercel default)
- **Install**: `npm install --prefix portal`
- **Build**: `npm run build --prefix portal` (= `vite build`)
- **Output**: `portal/dist/`
- **Deploy trigger**: Push naar `main` branch

### Preview Deployments
Elke PR krijgt automatisch een preview URL. Handig voor het testen van frontend wijzigingen.

## Repo-local context guard

Deze repository gebruikt een repo-local guard zodat gevoelige CLI-acties hard falen als de map niet aan de juiste GitHub-, Vercel- en Supabase-context hangt.

### Verwachte context

| Systeem | Verwachte context |
|---|---|
| GitHub | `joriszwanenburg95-maker/Digidromen` |
| Vercel | `digidromen` / `prj_LBxwTADV6A0COItPTCubcwF4XJVe` / `team_7f5GvqVpnIcRnHDJgsuPSr6s` |
| Supabase | `oyxcwfozoxlgdclchden` |

### Gebruik vanuit deze repo

```bash
npm run context:check
npm run gh -- <gh-subcommand>
npm run vercel -- <vercel-subcommand>
npm run supabase -- <supabase-subcommand>
```

Voorbeelden:

```bash
npm run gh -- auth status
npm run vercel -- pull
npm run supabase -- db push
```

### Push-protectie

Activeer een repo-local pre-push hook:

```bash
npm run setup:hooks
```

Dit zet `core.hooksPath=.githooks` alleen voor deze repo. Pushes worden dan ook geblokkeerd als de context niet klopt.

## Supabase Project

### Project Details
- **Project Ref**: `oyxcwfozoxlgdclchden`
- **API URL**: `https://oyxcwfozoxlgdclchden.supabase.co`
- **Region**: EU (vermoedelijk `eu-central-1`)

### Supabase CLI Setup
```bash
# Login (eenmalig)
npx supabase login

# Link project (eenmalig)
npx supabase link --project-ref oyxcwfozoxlgdclchden

# Migraties uitvoeren
npx supabase db push

# Edge Functions deployen
npx supabase functions deploy

# Lokaal development
npx supabase start  # Start lokale Supabase (Docker)
npx supabase db reset  # Reset lokale DB en run migraties
```

### Supabase Dashboard Configuratie

#### Authentication Settings
- **Site URL**: `https://digidromen.vercel.app`
- **Redirect URLs**:
  - `https://digidromen.vercel.app/**`
  - `http://localhost:5173/**` (dev)
  - `https://digidromen-*.vercel.app/**` (preview deploys)
- **Email provider**: Ingebouwd (Supabase SMTP) of custom SMTP
- **Magic Link**: Ingeschakeld
- **Email OTP**: Ingeschakeld
- **Password login**: Uitschakelen na migratie naar magic link
- **Email templates**: Aanpassen met Digidromen branding (zie 03-AUTH)

#### Storage
- **Bucket**: `documents` (bestaand, private)
- **Policies**: RLS-based (bestaand)
- **Max file size**: 50MB
- **Toegestane types**: PDF, JPG, PNG, XLSX, CSV

#### Edge Function Secrets
| Secret | Beschrijving |
|---|---|
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token |
| `HUBSPOT_WEBHOOK_SECRET` | Webhook signature verificatie |

*`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` zijn automatisch beschikbaar in Edge Functions.*

### HubSpot wrapper (optioneel)

Als de HubSpot wrapper gebruikt wordt voor read-only matching of inspectie:

- sla de HubSpot private app token ook op in Supabase Vault
- gebruik een stabiele secret name, bijvoorbeeld `hubspot`
- configureer de wrapper via `api_key_name`, zodat dezelfde SQL-config over omgevingen herbruikbaar blijft

De wrapper is ondersteunend en vervangt de `hubspot-sync` Edge Function niet.

### Database Connectie
- **Direct**: `postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
- **Pooler (Transaction)**: `postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
- Gebruik pooler voor Edge Functions (connection pooling)

## Lokale Development Setup

### Eerste keer
```bash
# Clone repo
git clone <repo-url>
cd Digidromen

# Install portal dependencies
cd portal && npm install

# Maak .env.local aan
cp .env.example .env.local
# Vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in

# Start dev server
npm run dev
```

### Met lokale Supabase (optioneel)
```bash
# Vanuit project root
npx supabase start
# Output geeft lokale URL + keys

# Update portal/.env.local met lokale URLs
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<lokale anon key>

# Start portal
cd portal && npm run dev
```

### Zonder Supabase (demo mode)
De app valt automatisch terug op localStorage-gebaseerde demo mode als er geen Supabase env vars zijn geconfigureerd. Dit werkt voor frontend development.

## Domein Setup (Toekomstig)
Wanneer een eigen domein wordt gekoppeld (bijv. `portal.digidromen.nl`):
1. Vercel Dashboard → Domains → Add
2. DNS: CNAME `portal` → `cname.vercel-dns.com`
3. Supabase Dashboard → Authentication → Site URL aanpassen
4. Redirect URLs bijwerken
