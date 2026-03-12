# Digidromen Portal — Van Demo naar Productie

## Human Tasks (wat jij moet doen voordat de agents aan de slag kunnen)

### Vooraf: Supabase Project aanmaken

1. **Maak een Supabase project aan** op https://supabase.com/dashboard
   - Kies een regio dichtbij (bijv. `eu-west-1` Frankfurt)
   - Bewaar het database wachtwoord

2. **Installeer Supabase CLI lokaal**
   ```bash
   brew install supabase/tap/supabase
   ```

3. **Init Supabase in het project**
   ```bash
   cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
   supabase init
   supabase link --project-ref <jouw-project-ref>
   ```

4. **Maak een `.env.local` aan** in `/portal/` met:
   ```env
   VITE_SUPABASE_URL=https://<jouw-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<jouw-anon-key>
   ```
   (Keys vind je in Supabase Dashboard → Settings → API)

5. **Maak testgebruikers aan** in Supabase Dashboard → Authentication → Users:
   - Eén admin account (bijv. `admin@digidromen.nl`)
   - Eén staff account (bijv. `medewerker@digidromen.nl`)
   - Eén hulporganisatie account
   - Eén servicepartner account
   - Simpele wachtwoorden voor nu (intern team only)

### Vooraf: CRM voorbereiding

6. **Kies een CRM en maak een trial/sandbox aan** bij één van:
   - HubSpot (gratis developer account + private app)
   - Odoo (trial of community edition)
   - Zoho CRM (developer account + API credentials)
   - Xapti (neem contact op voor sandbox toegang)

7. **Noteer de API credentials** van het gekozen CRM:
   - API key / OAuth client ID + secret
   - Base URL / instance URL
   - Eventuele webhook endpoint configuratie

8. **Voeg CRM credentials toe aan Supabase**:
   ```bash
   supabase secrets set CRM_API_KEY=<key> CRM_BASE_URL=<url>
   ```

9. **Richt de CRM-entiteiten in** (handmatig of via import):
   - **Contacts/Organisaties**: Veld voor `portal_id` (extern ID)
   - **Deals/Cases**: Custom velden voor `portal_order_id`, `status`, `case_type`
   - **Custom object of module** voor reparaties en donaties (indien het CRM dit ondersteunt)
   - Zet een webhook in die naar `https://<jouw-ref>.supabase.co/functions/v1/crm-webhook` POST bij wijzigingen

### Na Task 1 (backend klaar)

10. **Seed de database** — Task 1 levert een seed-script op, run:
    ```bash
    supabase db reset
    ```

11. **Test of de portal werkt** met de nieuwe backend door in te loggen met de testaccounts

### Na Task 2 (CRM klaar)

12. **Test de two-way sync**:
    - Maak een order aan in het portal → check of het in het CRM verschijnt
    - Wijzig een record in het CRM → check of het portal het oppikt
    - Check de CRM Sync pagina voor health status

---

## Task 1 — Backend & Database (Supabase)

### Prompt

```
Je bent een senior full-stack developer. Je gaat een bestaand React demo-portal migreren van localStorage naar Supabase (PostgreSQL + Auth + Edge Functions).

## Context

Dit is het Digidromen Supply & Service Portal — een beheerportaal voor het herverdelen van refurbished laptops aan hulporganisaties. Het portal beheert:
- Orders (aanvragen van hulporganisaties)
- Reparaties (servicepartner workflow)
- Donaties (intake van sponsors)
- Voorraad (warehouse management)
- CRM-sync queue (wordt in een volgende task gekoppeld)

De huidige demo draait volledig client-side met localStorage. De domain types, workflows en store-contracten zijn al goed gedefinieerd in `src/contracts/`.

## Wat er moet gebeuren

### 1. Supabase database schema
Maak migraties aan (`supabase/migrations/`) die het volledige datamodel uit `src/contracts/domain.ts` omzetten naar PostgreSQL tabellen:
- `organizations`, `users`, `products`, `inventory_items`
- `orders` met `order_lines` (geneste array → aparte tabel)
- `repair_cases`, `donation_batches`
- `workflow_events`, `messages`, `documents`, `notifications`
- `crm_sync_jobs` (queue tabel voor toekomstige CRM-integratie)
- Gebruik snake_case voor kolommen. Bewaar de Nederlandse status-enums (INGEDIEND, BEOORDEELD, etc.)
- Foreign keys waar nodig, created_at/updated_at timestamps
- Voeg een `user_profiles` tabel toe die linkt aan `auth.users` met role, organization_id, name, etc.

### 2. Row Level Security (RLS)
- Simpele policies: ingelogde gebruikers kunnen alles lezen
- Schrijfrechten op basis van role (uit `user_profiles`):
  - `help_org`: kan orders en reparaties aanmaken voor eigen organisatie
  - `digidromen_staff`/`digidromen_admin`: volledige toegang
  - `service_partner`: kan status updates doen op toegewezen cases
- Admin-only: settings, user management

### 3. Supabase Auth integratie
- Installeer `@supabase/supabase-js` in `/portal`
- Maak een Supabase client aan die `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` uit `.env.local` leest
- Vervang de huidige `AuthContext.tsx` (mock role-switcher) door echte auth:
  - Login pagina met email/password
  - Session management via Supabase
  - Role wordt opgehaald uit `user_profiles` tabel
  - Behoud de bestaande `Role` type en routing logica
- De role-switcher in de header mag weg (users hebben nu een vaste role)

### 4. Data layer migratie
- Maak een `src/lib/supabase.ts` met de typed Supabase client
- Vervang de localStorage store (`src/store/portal-store.ts`) door Supabase queries:
  - Lees-operaties: direct via Supabase client met `.select()`
  - Schrijf-operaties: via Supabase client `.insert()`, `.update()`
  - Behoud de bestaande `PortalStoreContract` interface waar mogelijk als abstractie
- Pas alle pagina's aan om data uit Supabase te lezen in plaats van de lokale store
- Workflow transitions: valideer server-side dat de transitie is toegestaan (check `src/contracts/workflows.ts` regels)

### 5. Seed data
- Converteer `src/data/seed-data.ts` naar een SQL seed script (`supabase/seed.sql`)
- Zorg dat de seed data werkt met de nieuwe tabelstructuur

### 6. File storage (documenten)
- Maak een Supabase Storage bucket `documents` aan
- Vervang de huidige metadata-only documenten door echte file uploads
- Pas de document upload UI aan om files naar Supabase Storage te uploaden

## Belangrijke richtlijnen
- Houd de bestaande UI zoveel mogelijk intact — dit is een backend-migratie, geen redesign
- Bewaar de TypeScript types uit `src/contracts/domain.ts` als source of truth
- De CRM sync queue tabel moet aangemaakt worden maar hoeft nog niet functioneel te zijn (dat is Task 2)
- Gebruik Supabase Realtime voor live updates waar dat logisch is (bijv. notifications)
- Test elke migratie-stap: schema → RLS → auth → data layer → seed
- Maak geen nieuwe UI componenten tenzij strikt noodzakelijk (bijv. login form)

## Bestanden om te lezen (in volgorde)
1. `src/contracts/domain.ts` — alle entity types
2. `src/contracts/adapters.ts` — store contract en input types
3. `src/contracts/workflows.ts` — status transitions en role-based permissions
4. `src/store/portal-store.ts` — huidige store implementatie (te vervangen)
5. `src/data/seed-data.ts` — demo data (om te converteren naar SQL seed)
6. `portal/src/context/AuthContext.tsx` — huidige auth (te vervangen)
7. `portal/src/pages/` — alle pagina's die data ophalen uit de store
```

---

## Task 2 — CRM Integratie (Adapter Pattern + Two-Way Sync)

### Prompt

```
Je bent een senior backend/integratie developer. Je gaat een CRM-integratie bouwen voor het Digidromen portal dat draait op Supabase. De integratie moet CRM-agnostisch zijn via een adapter pattern, met two-way sync.

## Context

Het Digidromen portal is een beheerportaal voor refurbished laptops. Task 1 (al afgerond) heeft de app gemigreerd van localStorage naar Supabase met:
- PostgreSQL database met tabellen voor organizations, orders, repair_cases, donation_batches, etc.
- Een `crm_sync_jobs` queue tabel die al bestaat maar nog niet functioneel is
- Supabase Auth met user_profiles (role-based)
- Supabase Edge Functions

De opdrachtgever twijfelt tussen HubSpot, Odoo, Zoho en Xapti als CRM. We bouwen daarom een adapter pattern zodat het CRM verwisselbaar is.

## Wat er moet gebeuren

### 1. CRM Adapter Interface
Maak een abstracte adapter interface in `supabase/functions/_shared/crm/`:

```typescript
// types.ts
interface CrmAdapter {
  // Organisaties
  upsertOrganization(org: PortalOrganization): Promise<CrmReference>;
  getOrganization(crmId: string): Promise<PortalOrganization | null>;

  // Cases (orders, reparaties, donaties)
  upsertCase(caseData: PortalCase): Promise<CrmReference>;
  getCase(crmId: string): Promise<PortalCase | null>;
  updateCaseStatus(crmId: string, status: string): Promise<void>;

  // Documenten
  attachDocument(crmCaseId: string, doc: PortalDocument): Promise<string>;

  // Webhooks
  parseWebhookPayload(payload: unknown): CrmWebhookEvent;

  // Health
  healthCheck(): Promise<boolean>;
}

interface CrmReference {
  crmId: string;
  crmUrl?: string;
}

interface CrmWebhookEvent {
  entityType: 'organization' | 'case' | 'document';
  action: 'created' | 'updated' | 'deleted';
  crmId: string;
  changes: Record<string, unknown>;
}
```

### 2. Mock Adapter (voor development)
Maak `supabase/functions/_shared/crm/adapters/mock.ts`:
- Implementeert `CrmAdapter` met in-memory opslag
- Logt alle calls voor debugging
- Simuleert latency en random failures (configurable)
- Dit is de default adapter tijdens development

### 3. Starter adapters
Maak skeleton adapters voor de vier CRM-kandidaten:
- `adapters/hubspot.ts` — HubSpot API v3 (contacts, deals, custom objects)
- `adapters/odoo.ts` — Odoo XML-RPC / JSON-RPC API
- `adapters/zoho.ts` — Zoho CRM API v2 (leads, deals, custom modules)
- `adapters/xapti.ts` — Xapti API (placeholder, vul aan zodra API docs beschikbaar)

Elk skeleton moet:
- De interface implementeren met `throw new Error('Not implemented')` per method
- Commentaar bevatten over welke API endpoints nodig zijn
- Auth setup (OAuth flow of API key) als utility method

### 4. Portal → CRM sync (outbound)
Maak een Supabase Edge Function `supabase/functions/crm-sync-worker/`:
- Draait als cron job (elke 30 seconden) OF wordt getriggerd door database webhook
- Leest pending jobs uit `crm_sync_jobs` tabel (state = 'queued' of 'retrying')
- Roept de juiste `CrmAdapter` method aan op basis van `entity_name` en `buffered_changes`
- Update job state naar 'synced' of 'failed' met retry logic (max 5 retries, exponential backoff)
- Slaat het `crm_id` op in de portal tabel (bijv. `orders.crm_case_id`)

Maak database triggers die automatisch sync jobs aanmaken:
- `AFTER INSERT OR UPDATE` op `orders`, `repair_cases`, `donation_batches`, `organizations`
- De trigger maakt een rij aan in `crm_sync_jobs` met de relevante changes

### 5. CRM → Portal sync (inbound)
Maak een Supabase Edge Function `supabase/functions/crm-webhook/`:
- Ontvangt POST requests van het CRM (webhook)
- Valideert de webhook signature (CRM-specifiek, via adapter)
- Parst de payload via `adapter.parseWebhookPayload()`
- Mapped CRM changes terug naar portal entiteiten
- Update de portal database
- Voorkom sync loops: markeer updates die van het CRM komen zodat ze niet opnieuw naar het CRM worden gestuurd

### 6. Adapter registry & configuratie
Maak `supabase/functions/_shared/crm/registry.ts`:
- Leest `CRM_ADAPTER` uit environment/secrets om te bepalen welke adapter actief is
- Factory function: `getAdapter(): CrmAdapter`
- Fallback naar mock adapter als er geen CRM geconfigureerd is

### 7. CRM Sync dashboard updates
Pas de bestaande CRM Sync pagina (`portal/src/pages/CrmSync.tsx`) aan:
- Lees sync jobs uit Supabase in plaats van localStorage
- Toon echte sync status, timestamps, retry counts
- Voeg "force sync" knop toe die de edge function triggert
- Toon CRM health check status
- Link naar CRM record (als crmUrl beschikbaar is)

### 8. Conflict resolution
Bij two-way sync kunnen conflicten ontstaan. Implementeer een simpele strategie:
- **Last-write-wins** op basis van `updated_at` timestamp
- Log conflicten in een `crm_sync_conflicts` tabel voor audit
- Toon conflicten in de CRM Sync pagina met optie om handmatig te resolven

## Belangrijke richtlijnen
- De adapter interface is het contract — alle CRM-specifieke logica zit IN de adapter
- Gebruik Supabase secrets voor API keys (`supabase secrets set`)
- Edge Functions in Deno/TypeScript
- Bouw eerst de mock adapter volledig werkend, dan pas de echte adapters
- De `crm_sync_jobs` tabel uit Task 1 is de basis — pas het schema aan als nodig
- Bewaar de bestaande entity types uit `src/contracts/domain.ts`
- Test de volledige flow met de mock adapter voordat je een echte CRM koppelt

## Bestanden om te lezen (in volgorde)
1. `src/contracts/domain.ts` — entity types, CrmSyncJob, CrmReference
2. `src/contracts/adapters.ts` — bestaande CrmMockAdapterContract (ter referentie)
3. De database migraties in `supabase/migrations/` (aangemaakt door Task 1)
4. `portal/src/pages/CrmSync.tsx` — huidige sync UI (aan te passen)
5. `supabase/functions/` — bestaande edge functions (indien aanwezig na Task 1)
```

---

## Volgorde & afhankelijkheden

```
Human Tasks (Supabase + CRM setup)
        ↓
   Task 1: Backend & Database
        ↓
   Human Task: Test + seed
        ↓
   Task 2: CRM Integratie
        ↓
   Human Task: Test two-way sync
```
