# Digidromen Portal — Actuele Context

Laatste update: 2026-05-04

Lees dit aan het begin van een sessie.

## Project

Digidromen verstrekt refurbished laptops aan kinderen uit gezinnen met beperkte middelen. De portal ondersteunt:

- `help_org`: hulporganisaties/klanten die laptops of vervangingen aanvragen.
- `service_partner`: Aces Direct / serviceorganisatie voor warehouse, donaties, voorraad en uitlevering.
- `digidromen_staff`: Digidromen operatie/regie.
- `digidromen_admin`: volledig beheer inclusief gebruikers, audit en technische beheerfuncties.

## Stack

| Laag | Tech |
|---|---|
| Frontend | Vite 6 + React 18 SPA, React Router v7, Tailwind 4.2, Lucide |
| Data fetching | TanStack Query v5 |
| Backend | Supabase Postgres/Auth/Storage/Edge Functions/Realtime |
| Deployment | Vercel, framework `vite` |
| CRM | HubSpot outbound-only via outbox pattern |

Belangrijk: dit is geen Next.js app. Geen SSR, geen route handlers.

## Projectidentifiers

- Supabase project: `oyxcwfozoxlgdclchden`
- Vercel project: `digidromen`
- GitHub account/repo-eigenaar: `joriszwanenburg95-maker`
- Publieke portal: `https://digidromenportal.vercel.app`

## Huidige architectuur

- Demo mode is verwijderd uit `portal/src`; de app is live-only op Supabase.
- Magic link auth is actief via Supabase Auth.
- `joris.zwanenburg@eyeti.nl` is geborgd als `digidromen_admin`.
- Edge functions: `admin-users`, `hubspot-sync`, `reminder-cron`.
- HubSpot is v1 outbound-only; geen inbound webhooks.

Belangrijke frontend modules:
- `portal/src/lib/workflow.ts` — statuslabels/transities voor orders, donaties, repairs.
- `portal/src/lib/productRules.ts` — bestel/RMA-scenario’s, validatie, product matching.
- `portal/src/lib/errors.ts` — Nederlandse foutvertaling.
- `portal/src/lib/data/orders.ts`
- `portal/src/lib/data/donations.ts`
- `portal/src/lib/data/organizations.ts`
- `portal/src/lib/realtime.ts`
- `portal/src/lib/queryKeys.ts`

## Rollen en surfaces

| Rol | Surface | Kern |
|---|---|---|
| `help_org` | klant/webshop | Eigen aanvragen plaatsen en volgen. |
| `service_partner` | warehouse/werkvoorraad | Toegewezen donaties/orders, voorraad, locaties. |
| `digidromen_staff` | operations cockpit | Accordering, planning, beheer, rapportage. |
| `digidromen_admin` | admin + operations | Staff plus gebruikers, audit, technische beheerfuncties. |

De rolgerichte UI/UX-specificatie staat in:

`docs/2026-05-04-ui-ux-role-spec.md`

## RLS en Supabase waarschuwing

`user_profiles` wordt gelezen tijdens auth bootstrap. Gebruik in de SELECT-policy van `user_profiles` geen helperfuncties die zelf `user_profiles` lezen, zoals `current_app_role()` of `is_staff_or_admin()`.

Als de portal op `Portal laden...` blijft hangen na RLS-wijzigingen, herstel eerst:

```sql
DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;
CREATE POLICY "users read profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);
```

De privacygrens voor hulporganisaties hoort primair op orders, order_lines, workflow_events, messages en documents te liggen.

## Lokale ontwikkeling

```bash
cd portal
npm run dev
```

Verificatie:

```bash
cd portal
npx tsc --noEmit
npm run build
```

Types regenereren:

```bash
npx supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```

`portal/src/types/database.ts` is gegenereerd en wordt niet handmatig aangepast.

## Niet meer relevant

- Demo/runtime persona-flows.
- Oude faseplannen als leidend document.
- `src/contracts/navigation.ts` als runtime-bron.
- Handmatige demo-seedflows als testbasis.

## Communicatie

Joris werkt in het Nederlands. Antwoord in het Nederlands, tenzij code/technische termen duidelijker Engels blijven.
