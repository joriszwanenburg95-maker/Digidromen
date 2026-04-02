# Uitvoeringsvolgorde (Herzien)

## Voortgang (bijgewerkt 2026-04-02)

| Fase | Status | Notities |
|---|---|---|
| 1. Database + Types | ✅ KLAAR | 9 migraties live, `database.ts` gegenereerd, `supabase.ts` getypt |
| 2. Auth Magic Link | ✅ KLAAR | `sendMagicLink()` in AuthContext, Login.tsx zonder wachtwoord |
| 3. TanStack Query + Componenten | ✅ DEELS | QueryClient setup, `queryKeys.ts`, `realtime.ts`, providers — UI-componenten nog niet |
| 4. Frontend Pagina's — Core | 🔲 VOLGENDE | Layout, Dashboard, Orders, Donations, Repairs, Inventory via TanStack Query |
| 5. Frontend Pagina's — Secundair | 🔲 TODO | Users, Organizations, AuditLog, Forecast, Reports, Settings |
| 6. Edge Functions (3) | 🔲 TODO | admin-users uitbreiden, hubspot-sync, reminder-cron |
| 7. HubSpot Outbound | 🔲 TODO | Outbox activeren, live sync |
| 8. Polish & Productie | 🔲 TODO | E2E testen, mobile, custom domein |

### Bekende afwijkingen
- Aces Direct organisatie heeft ID `org-0a2da529` (niet `org-aces-direct` zoals in migratie-plan stond)
- `portal-remote.ts` heeft `as any` casts op legacy status-types — wordt verwijderd in Fase 5

---

## Kernprincipes van dit plan

1. **Database eerst** — alle migraties zijn additief, geen breaking changes
2. **TanStack Query vervangt de portal store** — stapsgewijs per pagina, niet big-bang
3. **Edge Functions: 3, niet 7** — alles wat via RLS + DB kan, gaat via RLS + DB
4. **HubSpot v1: outbound only** — bi-directioneel pas als dat nodig blijkt
5. **Mobile-first voor warehouse flows** — donatie-ontvangst en repair-logs

---

### Fase 1: Database Migraties + Gegenereerde Types
**Doel**: Schema uitbreiden en TypeScript types synchroniseren.

**Taken**:
1. Alle migraties uit `02-DATABASE-MIGRATIONS.md` schrijven naar `supabase/migrations/`
2. Lokaal testen met `supabase db reset`
3. Deploy naar productie: `supabase db push`
4. Gegenereerde types uitvoeren:
   ```bash
   supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
   ```
5. Verifieer: bestaande app werkt nog (geen breaking changes)

**Output**: Uitgebreid schema + `portal/src/types/database.ts` als single source of truth voor types.

**Risico**: Laag — alle migraties zijn additief.

---

### Fase 2: Auth → Magic Link
**Doel**: Password-based login vervangen door magic link.

**Taken**:
1. Supabase Dashboard: email templates aanpassen, redirect URLs configureren
2. `AuthContext.tsx`: `signInWithPassword` → `signInWithOtp`
3. `Login.tsx`: password-veld verwijderen, "link verstuurd" status tonen
4. `admin-users` Edge Function: `create` → `inviteUserByEmail` toevoegen
5. `vercel.json`: `/auth/callback` rewrite toevoegen
6. Testen: volledige flow (invite → email → klik → ingelogd)

**Output**: Passwordless authenticatie.

**Dependency**: Geen — onafhankelijk van schema-wijzigingen.

---

### Fase 3: TanStack Query + Gedeelde Componenten
**Doel**: Data-laag moderniseren en herbruikbare UI-bouwstenen bouwen.

**Taken — Data infrastructuur**:
1. `npm install @tanstack/react-query @tanstack/react-query-devtools`
2. `QueryClientProvider` instellen in `main.tsx`
3. `src/lib/queryKeys.ts` schrijven (query key factory)
4. `src/lib/realtime.ts` schrijven (Supabase Realtime → cache invalidatie)
5. Realtime listeners initialiseren in `App.tsx`

**Taken — UI Componenten**:
6. `StatusBadge.tsx` — Status badges met kleuren
7. `KpiCard.tsx` — KPI kaarten voor dashboard
8. `DataTable.tsx` — Generieke tabel met sort/filter/paginatie
9. `FileUpload.tsx` — Supabase Storage upload
10. `ConfirmDialog.tsx` — Bevestigingsdialoog
11. `EmptyState.tsx` — Lege-staat placeholders
12. `AlertBanner.tsx` — Systeem alerts
13. `RoleGuard.tsx` — Rol-gebaseerde rendering
14. `OrderForm.tsx` — Bestelformulier
15. `DonationReceiptForm.tsx` — Mobile-first wizard (stap 1: aantallen, stap 2: details, stap 3: bevestigen)

**Output**: Data-laag + component library. `usePortalContext()` blijft tijdelijk naast TanStack Query.

**Dependency**: Geen.

---

### Fase 4: Frontend Pagina's — Core (met TanStack Query migratie)
**Doel**: Hoofdpagina's herontwerpen én stapsgewijs `usePortalContext()` vervangen.

**Taken**:
1. `Layout.tsx` — Sidebar met rol-gebaseerde navigatie
2. `Dashboard.tsx` — KPI's per rol via TanStack Query (meest impactvol, minste data)
3. `Orders.tsx` — Bestelvenster-indicator, gepagineerd via TanStack Query
4. `OrderDetail.tsx` — Status flow, accordering, geplande bezorgdatum, optimistic updates
5. `Inventory.tsx` — Multi-locatie, low-stock alerts
6. `Donations.tsx` — Ontvangst-flow (mobile-first `DonationReceiptForm`) + donorselectie of nieuwe donor
7. `DonationDetail.tsx` — Batch details, pickupdatum/ladingnummer, certificaat upload
8. `Repairs.tsx` — Repair overzicht, bulk-acties
9. `RepairDetail.tsx` — Repair log toevoegen (mobile-friendly), kostenregistratie

**TanStack Query migratiestrategie** (per pagina):
- Voeg `useQuery` toe naast bestaande context
- Test of data overeenkomt
- Verwijder context gebruik op die pagina
- Herhaal voor volgende pagina

**Output**: Volledig werkende core pagina's via TanStack Query, geen `usePortalContext()` meer in deze pagina's.

**Dependency**: Fase 1 (schema), Fase 3 (componenten + Query setup).

---

### Fase 5: Frontend Pagina's — Secundair
**Doel**: Aanvullende pagina's en admin tools.

**Taken**:
1. `Users.tsx` — Gebruikersbeheer + magic link invite
2. `Organizations.tsx` + `OrganizationDetail.tsx` — Org beheer
3. `StockLocations.tsx` — Locatiebeheer
4. `AuditLog.tsx` — Audit trail viewer (admin)
5. `Forecast.tsx` — Prognose dashboard (leest `demand_forecast` view)
6. `Reports.tsx` — Client-side export met minimale maandrapportage uit huidige Excel-logica
7. `Settings.tsx` — Bestelvensters, thresholds en basis emailtemplates via `portal_config`
8. `portal-remote.ts` verwijderen zodra alle pagina's op TanStack Query zitten

**Output**: Volledige portal zonder legacy data-laag.

**Dependency**: Fase 4 (gedeelde patronen).

---

### Fase 6: Edge Functions — 3 functies
**Doel**: Backend logica voor admin-operaties, HubSpot sync, en herinneringen.

**Taken**:
1. `admin-users` uitbreiden met `inviteUserByEmail` (was al ingezet in Fase 2)
2. `hubspot-sync` — Outbound CRM sync (outbox queue verwerking)
   - Lees `crm_sync_jobs` outbox
   - HubSpot batch API calls
   - Retry logica
3. `reminder-cron` — Dagelijkse herinneringen + notificaties
   - Low-stock alerts
   - Bestelvenster notificaties
   - Openstaande orders > 14 dagen
   - statuswijzigingsmeldingen voor operationele cases
4. DB triggers voor outbox schrijven (orders, donations, organizations → crm_sync_jobs)
5. pg_cron configureren voor scheduled functions

**Wat GEEN Edge Function wordt** (directe DB calls):
- Order indienen → RLS policy checkt venster-status
- Donatie ontvangst → DB trigger verwerkt voorraad
- Rapporten → client-side xlsx export
- Prognose → PostgreSQL view

**Output**: 3 werkende Edge Functions.

**Dependency**: Fase 1 (schema: crm_sync_jobs, notifications tabellen).

---

## Expliciete v1-bottlenecks die deze planning moet afdekken

- Bestellingen moeten buiten het maandvenster hard geblokkeerd worden in backendlogica, niet alleen in de UI.
- Eén bestelling moet meerdere regels kunnen bevatten zodat reguliere uitgifte en defectvervangingen samen kunnen worden ingediend.
- Nieuwe donoren mogen niet afhankelijk zijn van vooraf bestaand CRM-record; staff moet ze direct in het portal kunnen aanmaken.
- Donatieafhandeling moet zonder Blancco-koppeling werkbaar zijn via verplichte documentupload door Aces.
- De eerste rapportage-oplevering moet gericht zijn op vervanging van de bestaande maandelijkse Excel, niet op een generiek reporting platform.

---

### Fase 7: HubSpot Integratie — v1 Outbound
**Doel**: Outbound CRM sync activeren.

**Taken**:
1. HubSpot Private App aanmaken + token configureren als Supabase secret
2. HubSpot object mapping bepalen (Company ↔ organization, Deal ↔ order)
3. `hubspot-sync` functie testen met live HubSpot sandbox
4. `CrmSync.tsx` uitbreiden — Sync status, pending/failed/dead_letter, retry knop, on-demand sync
5. Optioneel: HubSpot wrapper activeren voor read-only matching en inspectie
6. Initiële koppeling: match bestaande orgs met HubSpot Companies op naam/email
7. `reminder-cron` activeren en testen

**Wat NIET in v1**:
- Inbound webhooks (HubSpot → portal) — v2, pas als nodig
- Bi-directionele field-ownership logica
- HubSpot wrapper als write-path gebruiken

**Output**: Outbound CRM sync actief.

**Dependency**: Fase 6 (Edge Functions).

---

### Fase 8: Polish & Productie
**Doel**: Afwerking, testen, mobile validatie.

**Taken**:
1. End-to-end testen van alle flows per rol
2. Mobile test: donatie-ontvangst flow op telefoon/tablet
3. Mobile test: repair log toevoegen
4. Error handling review: Edge Functions + TanStack Query error states
5. Loading states: skeletons op alle pagina's
6. Supabase Dashboard: productie-instellingen reviewen (RLS, Auth)
7. Vercel: custom domein configureren
8. `supabase gen types` toevoegen aan CI/CD (of als pre-commit hook)
9. README.md: setup-instructies bijwerken

**Output**: Productie-klaar portal.

**Dependency**: Alle voorgaande fases.

---

## Dependency Graph

```
Fase 1 (DB + Types) ──────────────┐
                                   ├──→ Fase 4 (Core Pages) ──→ Fase 5 (Extra Pages)
Fase 3 (Query + Componenten) ─────┘         │
                                            ├──→ Fase 6 (3 Edge Fns) ──→ Fase 7 (HubSpot)
Fase 2 (Auth) ────────────────────────────┘                                    │
                                                                               ▼
                                                                       Fase 8 (Polish)
```

**Parallel mogelijk**:
- Fase 1 + Fase 2 + Fase 3 (volledig onafhankelijk)
- Fase 4 + Fase 6 (zodra Fase 1 + 3 klaar zijn)

---

## Complexiteitsoverzicht

| Fase | Complexiteit | Sessies | Risico |
|---|---|---|---|
| 1. Database + Types | Laag | 1 | Laag |
| 2. Auth Magic Link | Laag | 1 | Laag |
| 3. Query + Componenten | Medium | 1-2 | Laag |
| 4. Core Pages + Query migratie | Hoog | 3-4 | Medium |
| 5. Extra Pages | Medium | 2 | Laag |
| 6. Edge Functions (3) | Medium | 1-2 | Medium |
| 7. HubSpot Outbound | Medium | 1-2 | Medium |
| 8. Polish | Laag-Medium | 1 | Laag |
| **Totaal** | | **11-15 sessies** | |

*(Was 13-19 sessies met 7 Edge Functions en bi-directionele HubSpot sync)*
