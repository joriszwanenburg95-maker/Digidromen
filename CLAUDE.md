# Digidromen Portal — Claude Context

Dit bestand bevat projectcontext voor Claude (beide accounts). Altijd lezen aan het begin van een sessie.

## Wat is dit project?

**Digidromen** verstrekt refurbished laptops aan kinderen uit gezinnen met beperkte middelen. Dit portal is het centrale knooppunt voor:
- **Hulporganisaties** (help_org) — bestellen laptops voor hun doelgroep
- **Digidromen medewerkers** (digidromen_admin, digidromen_staff) — regie, accordering, beheer
- **Aces Direct** (service_partner) — warehouse: ontvangst donaties, refurbishing, reparaties, logistiek

## Stack

| Laag | Tech |
|---|---|
| Frontend | Vite 6 + React 18 SPA, React Router v7, Tailwind 4.2, Lucide icons |
| Data fetching | TanStack Query v5 (vervanger van custom portal context store) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) |
| Deployment | Vercel (framework: vite, niet Next.js) |
| CRM | HubSpot (outbound-only, outbox pattern) | INSTALLEER CLI VOOR HUBSPOT 

**Belangrijk**: Dit is een Vite SPA, geen Next.js. Geen server-side rendering, geen route handlers.

## Projectidentifiers

- **Supabase project**: `oyxcwfozoxlgdclchden`
- **Vercel project**: `digidromen` (`prj_LBxwTADV6A0COItPTCubcwF4XJVe`)
- **GitHub**: `joriszwanenburg95-maker`

## Planning Docs

Alles in `.planning/`:

| Bestand | Inhoud |
|---|---|
| `00-PROJECT.md` | Projectoverzicht, rolmapping, architectuurbeslissingen |
| `01-ARCHITECTURE.md` | Technische architectuur, TanStack Query setup, datamodel |
| `02-DATABASE-MIGRATIONS.md` | Alle SQL migraties in volgorde |
| `03-AUTH-MAGIC-LINK.md` | Magic Link auth implementatie |
| `04-EDGE-FUNCTIONS.md` | 3 Edge Functions (admin-users, hubspot-sync, reminder-cron) |
| `05-HUBSPOT-INTEGRATION.md` | HubSpot outbound-only sync via outbox |
| `06-FRONTEND-REDESIGN.md` | Pagina's, TanStack Query migratie, mobile-first warehouse |
| `07-VERCEL-SUPABASE-CONFIG.md` | Deployment, env vars, lokale setup |
| `08-EXECUTION-ORDER.md` | 8 fases, dependencies, complexiteit |

**Lees de relevante planning docs vóór je aan een fase begint.**

## Uitvoeringsstatus

Kijk in `08-EXECUTION-ORDER.md` voor de actuele fasering. Kort overzicht:

- **Fase 1**: DB migraties + `supabase gen types` → `portal/src/types/database.ts`
- **Fase 2**: Magic link auth (onafhankelijk van Fase 1)
- **Fase 3**: TanStack Query setup + gedeelde componenten (onafhankelijk)
- **Fase 4-5**: Frontend pagina's, stapsgewijs van `usePortalContext()` naar TanStack Query
- **Fase 6**: 3 Edge Functions (admin-users uitbreiden, hubspot-sync, reminder-cron)
- **Fase 7**: HubSpot outbound activeren
- **Fase 8**: Polish, mobile test, productie

Fases 1, 2 en 3 kunnen **parallel** worden uitgevoerd.

## Architectuurprincipes

### Data fetching
- **NIET** via `usePortalContext()` — dit laadt alles in één keer, schaalt slecht
- **WEL** via TanStack Query met gefilterde Supabase calls per pagina
- Query key factory staat in `src/lib/queryKeys.ts`
- Realtime updates via Supabase channel → `queryClient.invalidateQueries()`

### TypeScript types
- `portal/src/types/database.ts` is gegenereerd — niet handmatig aanpassen
- Regenereer na schema-wijziging: `supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts`
- Gebruik `Database['public']['Tables']['orders']['Row']` als basis

### Edge Functions
- Zo min mogelijk — alleen als `service_role` key nodig is, of voor externe API calls
- **3 functies**: `admin-users`, `hubspot-sync`, `reminder-cron`
- Order indienen, donatie verwerken, export: allemaal via directe Supabase client + RLS

### HubSpot
- **v1**: Outbound-only. Portal → HubSpot via outbox pattern (`crm_sync_jobs` tabel)
- **GEEN** inbound webhooks in v1 — te complex, bouwen pas als aantoonbaar nodig

### Mobile
- Algemene UI: desktop-first is OK
- Warehouse flows (donatie ontvangst, repair log): mobile-first, grote tap targets, wizard-stijl

## Rollen

| Rol | Beschrijving |
|---|---|
| `digidromen_admin` | Volledig beheer |
| `digidromen_staff` | Operationeel (geen gebruikersbeheer) |
| `service_partner` | Aces Direct — warehouse, reparaties, eigen voorraadlocatie |
| `help_org` | Hulporganisaties — alleen eigen bestellingen |

## Lokale ontwikkeling

```bash
cd portal
npm run dev
```

Supabase lokaal (optioneel):
```bash
supabase start
supabase db reset  # na migratie-wijzigingen
```

Types regenereren:
```bash
supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```

## Werkaccount context

Dit project wordt beheerd via `joriszwanenburg95-maker` GitHub account. De Vercel en Supabase dashboards zijn gekoppeld aan dit account, niet aan het primaire Joris-account.

## Communicatie

- Joris werkt in het **Nederlands** — antwoord in het Nederlands tenzij code/technische termen
- Directe actie voorkeur — geen uitleg tenzij gevraagd
- Begin met implementatie, niet met vragen stellen
