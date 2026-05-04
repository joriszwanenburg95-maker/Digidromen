# Digidromen Portal — Data Model Architecture

Laatste update: 2026-05-04
Status: actuele bron voor het datamodel en de belangrijkste RLS/rolafspraken.

## Kern

Digidromen verstrekt refurbished laptops aan kinderen uit gezinnen met beperkte middelen. De portal ondersteunt drie operationele surfaces:

- `help_org`: hulporganisatie/klant; plaatst aanvragen en ziet alleen eigen bestelcontext.
- `service_partner`: serviceorganisatie; verwerkt toegewezen donaties, voorraad, locaties en uitleveringen.
- `digidromen_staff` / `digidromen_admin`: Digidromen regie; accordering, beheer, planning, rapportage en integraties.

## Belangrijke tabellen

### `organizations`

Organisaties kunnen hulporganisatie, servicepartner, sponsor of Digidromen zelf zijn.

Belangrijke velden:
- `id`
- `name`
- `type`
- `address`, `postal_code`, `city`
- `contact_name`, `contact_email`
- `target_group_description`
- `is_orderable`
- `active`
- HubSpot velden voor outbound CRM sync

Gebruik:
- `help_org` gebruikt eigen organisatiegegevens als defaults in bestelwizard.
- `service_partner` wordt gebruikt als toegewezen warehouse/logistieke partner.
- Sponsors kunnen bron zijn van `donation_batches`.

### `user_profiles`

Koppelt Supabase Auth aan portalrollen.

Belangrijke velden:
- `auth_user_id`
- `organization_id`
- `role`: `help_org`, `service_partner`, `digidromen_staff`, `digidromen_admin`
- `name`, `email`

Belangrijk voor RLS:
- `current_app_role()` en `current_organization_id()` lezen `user_profiles`.
- Maak `user_profiles` SELECT policies daarom niet afhankelijk van helperfuncties die zelf `user_profiles` lezen. Dat veroorzaakt recursie/traagheid bij login.

### `products`

Productcatalogus voor laptopaanvragen en RMA/vervangingen.

Belangrijke velden:
- `category`: laptop, accessory, service
- `is_package`
- `is_orderable`
- `is_replacement_product`
- `inventory_managed`
- `active`

Productregels in de frontend staan centraal in:

`portal/src/lib/productRules.ts`

Ondersteunde scenario's:
- `new_request`
- `laptop_replacement`
- `cable_replacement`
- `powerbank_replacement`
- `mouse_replacement`
- `backpack_replacement`
- `headset_replacement`

### `orders`

Aanvragen/bestellingen van hulporganisaties.

Belangrijke velden:
- `organization_id`: hulporganisatie waarvoor de aanvraag is.
- `requester_user_id`
- `status`
- `motivation`
- `delivery_address`, `postal_code`, `city`
- `preferred_delivery_date`
- `delivery_date`
- `assigned_service_partner_id`

Actuele statusflow:

```text
concept
→ ingediend
→ te_accorderen
→ geaccordeerd
→ in_voorbereiding
→ geleverd
→ afgesloten
```

Alternatief:

```text
ingediend / te_accorderen / geaccordeerd → afgewezen
```

Frontend workflowregels staan in:

`portal/src/lib/workflow.ts`

### `order_lines`

Regels binnen een order.

Belangrijke velden:
- `order_id`
- `product_id`
- `quantity`
- `line_type`: `new_request` of `rma_defect`
- `rma_category`: `laptop`, `voedingskabel`, `powerbank`, `muis`, `rugzak`, `headset`
- RMA details zoals `serial_number`, `defect_description`, `connector_type`, `connector_wattage`

### `donation_batches`

Donatiebatch van sponsor/donor naar verwerking/voorraad.

Actuele statusflow:

```text
aangemeld
→ pickup_gepland
→ ontvangen
→ in_verwerking
→ verwerkt
```

Belangrijke velden:
- `sponsor_organization_id`
- `assigned_service_partner_id`
- `assigned_stock_location_id`
- `device_count_promised`
- `pickup_date`
- `processed_at`

### `inventory_items`

Voorraad per product/locatie/conditie.

Belangrijke velden:
- `product_id`
- `stock_location_id`
- `condition`
- `quantity`
- `available_quantity`
- `reserved_quantity`
- `incoming_quantity`

### `stock_locations`

Voorraadlocaties, gekoppeld aan organisatie/servicepartner.

Belangrijke velden:
- `organization_id`
- `name`
- `city`
- `active`

### `workflow_events`

Zakelijke tijdlijn per case.

Belangrijke velden:
- `case_type`: `order`, `donation`, `repair`
- `case_id`
- `status`
- `title`
- `description`
- `actor_name`, `actor_role`

Gebruik:
- Detailpagina's tonen workflow-events als status/tijdlijn.
- Dashboard gebruikt events alleen voor operationele rollen; `help_org` hoort geen algemene events te zien.

### `messages` en `documents`

Berichten/documentmetadata per case.

Belangrijk:
- Inserts zijn strenger gemaakt via `case_write_allowed`.
- `help_org` mag alleen schrijven/lezen binnen eigen ordercontext.

### `crm_sync_jobs`

HubSpot outbox.

Status:
- v1 is outbound-only.
- Inbound webhooks zijn bewust buiten scope.
- Er is infra, maar orderflow schrijft nog niet automatisch jobs totdat HubSpot-scope definitief is.

## RLS-afspraken

### Belangrijkste regel

`help_org` is klant en mag alleen eigen bestelcontext zien.

`service_partner`, `digidromen_staff` en `digidromen_admin` mogen operationeel breder zien, omdat zij met de data moeten werken.

### Login/bootstrap waarschuwing

Gebruik geen helperfuncties zoals `current_app_role()`, `current_organization_id()` of `is_staff_or_admin()` in de SELECT-policy van `user_profiles`, omdat deze functies zelf `user_profiles` lezen.

Veilige baseline:

```sql
DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;
CREATE POLICY "users read profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);
```

Ook `organizations` mag vooralsnog breed leesbaar blijven voor authenticated users als dat nodig is voor app-context. De privacygrens hoort vooral op orders, order_lines, workflow_events, messages en documents te liggen.

## Frontend data-laag

Nieuwe of centrale modules:
- `portal/src/lib/data/orders.ts`
- `portal/src/lib/data/donations.ts`
- `portal/src/lib/data/organizations.ts`
- `portal/src/lib/workflow.ts`
- `portal/src/lib/productRules.ts`
- `portal/src/lib/errors.ts`
- `portal/src/lib/realtime.ts`

Principes:
- Lijstqueries gaan bij voorkeur via `lib/data/*`.
- Detailqueries mogen nog inline staan zolang ze pagina-specifiek zijn.
- `translateError()` is de centrale foutvertaling voor UI-meldingen.
- `queryKeys.ts` blijft de centrale TanStack Query key factory.

## Secrets

Nooit service role keys, anon keys of DB passwords in docs of commits opnemen.

Lokale `.env.local`:

```bash
VITE_SUPABASE_URL=https://oyxcwfozoxlgdclchden.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<alleen lokaal, nooit committen>
```

Als er ooit een echte key in documentatie of git terecht is gekomen: beschouw die key als gelekt en roteer hem in Supabase.
