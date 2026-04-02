# Digidromen Portal — Actuele Context

Dit bestand bevat de actuele projectcontext voor vervolgwerk. Lees dit aan het begin van een sessie.

## Wat is dit project?

**Digidromen** verstrekt refurbished laptops aan kinderen uit gezinnen met beperkte middelen. Dit portal is het centrale knooppunt voor:
- **Hulporganisaties** (help_org) — bestellen laptops voor hun doelgroep
- **Digidromen medewerkers** (digidromen_admin, digidromen_staff) — regie, accordering, beheer
- **Aces Direct** (service_partner) — warehouse: ontvangst donaties, refurbishing, reparaties, logistiek

## Stack

| Laag | Tech |
|---|---|
| Frontend | Vite 6 + React 18 SPA, React Router v7, Tailwind 4.2, Lucide icons |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) |
| Deployment | Vercel (framework: vite, niet Next.js) |
| CRM | HubSpot (outbound-only, outbox pattern) |

**Belangrijk**: Dit is een Vite SPA, geen Next.js. Geen server-side rendering, geen route handlers.

## Projectidentifiers

- **Supabase project**: `oyxcwfozoxlgdclchden`
- **Vercel project**: `digidromen` (`prj_LBxwTADV6A0COItPTCubcwF4XJVe`)
- **GitHub**: `joriszwanenburg95-maker`
- **Publieke portal URL**: `https://digidromenportal.vercel.app`

## Huidige status

- Demo mode is verwijderd uit `portal/src`. De app draait live-only op Supabase.
- Magic link login is actief via Supabase Auth.
- `joris.zwanenburg@eyeti.nl` is expliciet geborgd als `digidromen_admin`.
- Detailpagina's voor orders, reparaties en donaties zijn Supabase-only.
- `admin-users`, `hubspot-sync` en `reminder-cron` zijn live gedeployed.
- De operationele en voorraaddata zijn bewust gereset. Users en organisaties zijn behouden.

## Belangrijke recente wijzigingen

- Security hardening live:
  - vaste `search_path` op advisor-gemelde functies
  - strengere insert policies op `messages` en `documents`
- Migratiehistorie tussen repo en live project is uitgelijnd met placeholders voor remote-only timestamps.
- Orderflow gerepareerd:
  - `Bestelling toevoegen` zichtbaar voor `help_org`, `digidromen_staff`, `digidromen_admin`
  - `line_type` gebruikt nu `new_request`
  - config key gebruikt nu `ordering_windows`
  - nette lege-state als er nog geen actief laptopproduct bestaat
- User admin gerepareerd:
  - uitnodigen gebruikt magic-link invite flow
  - verwijderen vanuit UI toegevoegd
  - users zonder gekoppelde dossiers worden verwijderd
  - users met gekoppelde orders/reparaties worden gedeactiveerd

## Wat is nu expliciet niet meer relevant

- Demo mode / persona switching in `portal/src`
- Oude aannames dat Vercel env-vars ontbreken in live build
- Oude faseplanning als leidend document voor “wat moet nog”
- `src/contracts/navigation.ts` als runtime-bron voor de portal navigatie
- Handmatige demo-seedflows als testbasis

## Architectuurprincipes

### Data fetching
- **Voorkeur**: TanStack Query met gerichte Supabase calls per pagina
- `usePortalContext()` bestaat nog als legacy bridge, maar niet meer als demo runtimepad in de UI
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

GitHub en het gebruikte lokale werkaccount lopen via `joriszwanenburg95-maker`.

Let op:
- de huidige Vercel CLI login in deze sessie had geen toegang tot het echte `digidromen` project
- de publieke URL `https://digidromenportal.vercel.app` serveert wel de juiste app
- redirectproblemen bij magic link zaten aan Supabase Auth URL-configuratie, niet aan de frontend build

## Communicatie

- Joris werkt in het **Nederlands** — antwoord in het Nederlands tenzij code/technische termen
- Directe actie voorkeur — geen uitleg tenzij gevraagd
- Begin met implementatie, niet met vragen stellen

## Volgende logische stappen

- Richt minimaal één actief laptopproduct en eventueel voorraad opnieuw in, zodat de orderflow end-to-end testbaar is.
- Doorloop de hoofdflows met live data:
  - order aanmaken
  - repair aanmaken
  - donation aanmaken
  - user invite en user delete/deactivate
- Controleer Vercel projecttoegang met het juiste account/team, zodat env-vars en deployments ook vanuit CLI beheerbaar zijn.
- Werk legacy documentatie in `.planning/` alleen bij als die weer als bron van waarheid moet dienen.
