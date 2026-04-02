# SP1: Datamodel & Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migreer het Supabase datamodel naar het order-gedreven redesign: nieuwe statussets, inventory_movements tabel, bestelvenster vereenvoudigd, powerbank als rma_category, organization_contacts, schema-uitbreidingen op orders/order_lines/products/organizations/donation_batches, en verwijder repair-routes uit de frontend.

**Architecture:** Alle wijzigingen verlopen via één Supabase migratiefile. Na toepassen worden TypeScript types geregenereerd. Daarna worden repair-pagina's en routes verwijderd uit de frontend.

**Tech Stack:** PostgreSQL (Supabase), Supabase CLI (`supabase db push`), TypeScript, React Router v7

---

## File Structure

| Actie | Pad |
|---|---|
| CREATE | `supabase/migrations/20260402200000_portal_redesign_schema.sql` |
| MODIFY | `portal/src/App.tsx` |
| MODIFY | `portal/src/components/Layout.tsx` |
| DELETE | `portal/src/pages/Repairs.tsx` |
| DELETE | `portal/src/pages/RepairDetail.tsx` |
| REGENERATE | `portal/src/types/database.ts` |

---

### Task 1: Schrijf migratie — enum herdefiniëring

**Files:**
- Create: `supabase/migrations/20260402200000_portal_redesign_schema.sql`

- [ ] **Stap 1: Maak migratiebestand aan en schrijf enum-sectie**

```sql
-- ============================================================
-- Portal Redesign Schema — SP1
-- Enum herdefiniëring, schema-uitbreidingen, nieuwe tabellen
-- ============================================================

-- 1. order_status vervangen (data is gereset, USING 'concept' is veilig)
ALTER TABLE public.orders ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM (
  'concept',
  'ingediend',
  'te_accorderen',
  'geaccordeerd',
  'in_voorbereiding',
  'geleverd',
  'afgesloten',
  'afgewezen'
);
ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status
  USING 'concept'::public.order_status;

-- 2. donation_status vervangen
ALTER TABLE public.donation_batches ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS public.donation_status CASCADE;
CREATE TYPE public.donation_status AS ENUM (
  'concept',
  'aangemeld',
  'pickup_gepland',
  'ontvangen',
  'in_verwerking',
  'verwerkt',
  'geannuleerd'
);
ALTER TABLE public.donation_batches
  ALTER COLUMN status TYPE public.donation_status
  USING 'aangemeld'::public.donation_status;

-- 3. organization_type uitbreiden met 'donor'
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'donor';

-- 4. rma_category constraint uitbreiden met 'powerbank'
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur', 'powerbank')
  );
```

- [ ] **Stap 2: Voeg approval_status enum toe aan bestand**

Voeg onderaan de enum-sectie toe:

```sql
-- 5. approval_status (los van workflow status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM (
      'in_afwachting',
      'goedgekeurd',
      'afgewezen'
    );
  END IF;
END $$;
```

---

### Task 2: Schrijf migratie — orders en order_lines uitbreidingen

**Files:**
- Modify: `supabase/migrations/20260402200000_portal_redesign_schema.sql` (append)

- [ ] **Stap 1: Voeg orders-uitbreidingen toe aan migratiebestand**

```sql
-- ============================================================
-- Orders uitbreidingen
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status
    NOT NULL DEFAULT 'in_afwachting',
  ADD COLUMN IF NOT EXISTS archive_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date_source TEXT
    CHECK (delivery_date_source IN ('manual', 'integration')),
  ADD COLUMN IF NOT EXISTS delivery_date_set_by TEXT
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_date_changed_at TIMESTAMPTZ;

-- Trigger: sync approval_status bij statusovergang naar geaccordeerd/afgewezen
CREATE OR REPLACE FUNCTION public.orders_sync_approval_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'geaccordeerd' THEN
    NEW.approval_status := 'goedgekeurd';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  ELSIF NEW.status = 'afgewezen' THEN
    NEW.approval_status := 'afgewezen';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_approval ON public.orders;
CREATE TRIGGER trg_orders_sync_approval
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_sync_approval_status();

-- Trigger: log delivery_date wijziging
CREATE OR REPLACE FUNCTION public.orders_track_delivery_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
    NEW.delivery_date_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_delivery_date ON public.orders;
CREATE TRIGGER trg_orders_delivery_date
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_track_delivery_date();
```

- [ ] **Stap 2: Voeg order_lines-uitbreidingen toe**

```sql
-- ============================================================
-- Order lines uitbreidingen
-- ============================================================
ALTER TABLE public.order_lines
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT,
  ADD COLUMN IF NOT EXISTS attachment_document_ids TEXT[] DEFAULT '{}';

-- Uitbreiden: powerbank validatie in bestaande trigger
CREATE OR REPLACE FUNCTION public.order_lines_validate_rma()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.line_type = 'rma_defect' THEN
    IF NEW.rma_category = 'laptop' THEN
      IF NEW.serial_number IS NULL OR NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Laptop defect vereist serial_number en defect_description';
      END IF;
    ELSIF NEW.rma_category = 'voedingskabel' THEN
      IF NEW.serial_number IS NULL THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist serial_number';
      END IF;
      IF NOT (
        (NEW.connector_type IS NOT NULL AND NEW.connector_wattage IS NOT NULL)
        OR array_length(NEW.defect_photo_urls, 1) >= 2
      ) THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist (connector_type + connector_wattage) of minimaal 2 defect_photo_urls';
      END IF;
    ELSIF NEW.rma_category = 'powerbank' THEN
      IF NEW.serial_number IS NULL OR NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Powerbank defect vereist serial_number en defect_description';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

---

### Task 3: Schrijf migratie — products en organizations uitbreidingen

**Files:**
- Modify: `supabase/migrations/20260402200000_portal_redesign_schema.sql` (append)

- [ ] **Stap 1: Products uitbreidingen**

```sql
-- ============================================================
-- Products uitbreidingen
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_scenario TEXT NOT NULL DEFAULT 'new_request'
    CHECK (order_scenario IN ('new_request', 'replacement', 'accessory')),
  ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_replacement_product BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_managed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'stuk';

-- Seed: powerbank als product (als nog niet bestaat)
INSERT INTO public.products (id, sku, name, category, order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES (
  'prod-powerbank',
  'PB-001',
  'Powerbank',
  'accessory',
  'replacement',
  true,
  true,
  true,
  'stuk'
) ON CONFLICT (id) DO NOTHING;
```

- [ ] **Stap 2: Organizations uitbreidingen**

```sql
-- ============================================================
-- Organizations uitbreidingen
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donor_since DATE,
  ADD COLUMN IF NOT EXISTS preferred_pickup_day TEXT
    CHECK (preferred_pickup_day IN ('maandag','dinsdag','woensdag','donderdag','vrijdag') OR preferred_pickup_day IS NULL);
```

- [ ] **Stap 3: Organization contacts tabel**

```sql
-- ============================================================
-- Organization contacts (nieuwe tabel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_org_contacts_org
  ON public.organization_contacts(organization_id);

ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read org_contacts" ON public.organization_contacts;
CREATE POLICY "staff read org_contacts"
  ON public.organization_contacts FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff manage org_contacts" ON public.organization_contacts;
CREATE POLICY "staff manage org_contacts"
  ON public.organization_contacts FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "help_org read own contacts" ON public.organization_contacts;
CREATE POLICY "help_org read own contacts"
  ON public.organization_contacts FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'help_org'
    AND organization_id = public.current_organization_id()
  );
```

---

### Task 4: Schrijf migratie — inventory_movements en donation_batches

**Files:**
- Modify: `supabase/migrations/20260402200000_portal_redesign_schema.sql` (append)

- [ ] **Stap 1: inventory_movements tabel**

```sql
-- ============================================================
-- Inventory movements (nieuwe tabel)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM (
      'order_fulfillment',
      'donation_receipt',
      'adjustment',
      'return',
      'repair_consumption'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  stock_location_id TEXT REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity_delta INTEGER NOT NULL,
  movement_type public.movement_type NOT NULL,
  source_case_id TEXT,
  source_case_type TEXT CHECK (source_case_type IN ('order', 'donation')),
  note TEXT,
  created_by TEXT REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product
  ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_case
  ON public.inventory_movements(source_case_id, source_case_type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created
  ON public.inventory_movements(created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read movements" ON public.inventory_movements;
CREATE POLICY "staff read movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff manage movements" ON public.inventory_movements;
CREATE POLICY "staff manage movements"
  ON public.inventory_movements FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "service_partner read movements" ON public.inventory_movements;
CREATE POLICY "service_partner read movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.current_app_role() = 'service_partner');
```

- [ ] **Stap 2: donation_batches uitbreidingen**

```sql
-- ============================================================
-- Donation batches uitbreidingen
-- ============================================================
ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS processing_result JSONB,
  ADD COLUMN IF NOT EXISTS certificate_required_at TIMESTAMPTZ;

-- Trigger: zet certificate_required_at bij overgang naar in_verwerking
CREATE OR REPLACE FUNCTION public.donation_set_certificate_required()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'in_verwerking' AND OLD.status <> 'in_verwerking'
     AND NEW.certificate_required_at IS NULL THEN
    NEW.certificate_required_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_cert_required ON public.donation_batches;
CREATE TRIGGER trg_donation_cert_required
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_set_certificate_required();

-- Guard: donatie naar 'verwerkt' vereist certificaat
CREATE OR REPLACE FUNCTION public.donation_check_certificate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'verwerkt' AND OLD.status <> 'verwerkt' THEN
    IF NEW.data_wipe_certificate_url IS NULL THEN
      RAISE EXCEPTION 'Donatie kan niet naar verwerkt zonder data_wipe_certificate_url';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_check_cert ON public.donation_batches;
CREATE TRIGGER trg_donation_check_cert
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_check_certificate();
```

---

### Task 5: Schrijf migratie — bestelvenster vereenvoudigen en portal_config update

**Files:**
- Modify: `supabase/migrations/20260402200000_portal_redesign_schema.sql` (append)

- [ ] **Stap 1: Vereenvoudig bestelvenster-functie**

```sql
-- ============================================================
-- Bestelvenster — vereenvoudigde functie (dag X t/m dag Y van de maand)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_ordering_window_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  open_day int;
  close_day int;
  today_day int;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  IF cfg IS NULL THEN RETURN true; END IF;

  open_day  := (cfg->>'open_day')::int;
  close_day := (cfg->>'close_day')::int;
  today_day := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;

  RETURN today_day BETWEEN open_day AND close_day;
END;
$$;

-- Update portal_config: nieuw eenvoudiger formaat
INSERT INTO public.portal_config (key, value) VALUES (
  'ordering_windows',
  '{
    "open_day": 1,
    "close_day": 7,
    "timezone": "Europe/Amsterdam",
    "admin_bypass": true
  }'::jsonb
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- RPC wrapper zodat frontend zonder service_role key kan controleren
DROP FUNCTION IF EXISTS public.check_ordering_window();
CREATE OR REPLACE FUNCTION public.check_ordering_window()
RETURNS TABLE(is_open boolean, open_day int, close_day int, today_day int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  o int;
  c int;
  t int;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  o := (cfg->>'open_day')::int;
  c := (cfg->>'close_day')::int;
  t := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;
  RETURN QUERY SELECT (t BETWEEN o AND c), o, c, t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ordering_window() TO authenticated;
```

---

### Task 6: Pas migratie toe op Supabase

**Files:**
- No file changes — Supabase CLI commando

- [ ] **Stap 1: Controleer migratie lokaal**

```bash
cd /Users/joris/Documents/Code\ projecten/Werk/Digidromen
supabase db lint supabase/migrations/20260402200000_portal_redesign_schema.sql
```

Verwacht: geen errors. Warnings over policies zijn OK.

- [ ] **Stap 2: Push migratie naar Supabase**

```bash
supabase db push --project-ref oyxcwfozoxlgdclchden
```

Verwacht output: `Applying migration 20260402200000_portal_redesign_schema.sql... done`

Bij fout met enum: controleer of de tabel al data heeft met de oude enum-waarden:
```bash
supabase db execute --project-ref oyxcwfozoxlgdclchden \
  "SELECT status, count(*) FROM orders GROUP BY status;"
```
Als er rijen zijn met oude UPPERCASE statussen: data handmatig resetten of UPDATE uitvoeren.

---

### Task 7: Regenereer TypeScript types

**Files:**
- Regenerate: `portal/src/types/database.ts`

- [ ] **Stap 1: Genereer types**

```bash
cd /Users/joris/Documents/Code\ projecten/Werk/Digidromen
supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```

- [ ] **Stap 2: Controleer gegenereerde types**

Open `portal/src/types/database.ts` en verifieer:
- `order_status` enum bevat: `'concept' | 'ingediend' | 'te_accorderen' | 'geaccordeerd' | 'in_voorbereiding' | 'geleverd' | 'afgesloten' | 'afgewezen'`
- `donation_status` enum bevat: `'concept' | 'aangemeld' | 'pickup_gepland' | 'ontvangen' | 'in_verwerking' | 'verwerkt' | 'geannuleerd'`
- `inventory_movements` tabel aanwezig
- `organization_contacts` tabel aanwezig

- [ ] **Stap 3: Commit**

```bash
cd /Users/joris/Documents/Code\ projecten/Werk/Digidromen
git add supabase/migrations/20260402200000_portal_redesign_schema.sql
git add portal/src/types/database.ts
git commit -m "feat(schema): portal redesign — nieuwe statussen, inventory_movements, org_contacts, powerbank"
```

---

### Task 8: Verwijder repair-routes uit App.tsx

**Files:**
- Modify: `portal/src/App.tsx`

- [ ] **Stap 1: Verwijder repair imports en routes**

In `portal/src/App.tsx`:

Verwijder deze regels (importstatements):
```tsx
const Repairs = lazy(() => import("./pages/Repairs"));
const RepairDetail = lazy(() => import("./pages/RepairDetail"));
```

Verwijder deze routes:
```tsx
<Route path="/repairs" element={<Repairs />} />
<Route path="/repairs/:id" element={<RepairDetail />} />
```

Voeg een redirect toe zodat bestaande bookmarks niet breken:
```tsx
// Na de bestaande routes, voor de catch-all:
<Route path="/repairs" element={<Navigate to="/orders" replace />} />
<Route path="/repairs/:id" element={<Navigate to="/orders" replace />} />
```

- [ ] **Stap 2: Voeg /planning route toe**

Voeg bovenaan bij de lazy imports toe:
```tsx
const Planning = lazy(() => import("./pages/Planning"));
```

Voeg in de routes toe (na `/donations/:id`):
```tsx
<Route path="/planning" element={<Planning />} />
```

---

### Task 9: Verwijder repair-navigatie uit Layout.tsx en voeg Planning toe

**Files:**
- Modify: `portal/src/components/Layout.tsx`

- [ ] **Stap 1: Verwijder Reparaties uit sidebarLinks**

In `portal/src/components/Layout.tsx`, verwijder het volgende object uit de `sidebarLinks` array:
```tsx
{
  name: "Reparaties",
  path: "/repairs",
  icon: Wrench,
  roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
},
```

- [ ] **Stap 2: Voeg Planning toe aan sidebarLinks**

Voeg na het Donaties-item toe:
```tsx
{
  name: "Planning",
  path: "/planning",
  icon: Calendar,
  roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
},
```

- [ ] **Stap 3: Update Lucide imports**

Voeg `Calendar` toe aan de Lucide import en verwijder `Wrench`:
```tsx
import {
  BarChart3,
  Bell,
  Box,
  Building2,
  Calendar,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
```

---

### Task 10: Verwijder repair-paginabestanden en commit

**Files:**
- Delete: `portal/src/pages/Repairs.tsx`
- Delete: `portal/src/pages/RepairDetail.tsx`

- [ ] **Stap 1: Verwijder bestanden**

```bash
rm "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Repairs.tsx"
rm "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/RepairDetail.tsx"
```

- [ ] **Stap 2: Controleer build**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal"
npm run build 2>&1 | tail -20
```

Verwacht: `✓ built in X.XXs` zonder TypeScript-errors over repairs.

Bij TypeScript-error: zoek referenties naar `Repairs` of `repair` in andere bestanden:
```bash
grep -r "repair\|Repair" portal/src --include="*.tsx" --include="*.ts" -l
```

Verwijder eventuele overblijvende referenties (bijv. in `lib/portal.ts`, `lib/portal-remote.ts`, `lib/realtime.ts`, `lib/queryKeys.ts`).

- [ ] **Stap 3: Commit**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add portal/src/App.tsx portal/src/components/Layout.tsx
git rm portal/src/pages/Repairs.tsx portal/src/pages/RepairDetail.tsx
git commit -m "feat(frontend): verwijder repair-routes en -pagina's, voeg Planning route toe"
```

---

## Verificatie SP1

Na voltooiing van alle taken:

- [ ] `npm run build` slaagt zonder errors
- [ ] Supabase dashboard: tabel `inventory_movements` bestaat
- [ ] Supabase dashboard: tabel `organization_contacts` bestaat
- [ ] `orders.status` type is `order_status` met nieuwe lowercase waarden
- [ ] `donation_batches.status` type is `donation_status` met nieuwe waarden
- [ ] `products` heeft kolom `order_scenario`
- [ ] `portal_config` key `ordering_windows` heeft `open_day: 1, close_day: 7`
- [ ] RPC `check_ordering_window()` werkt: `SELECT * FROM check_ordering_window();`
- [ ] `/repairs` route redirectt naar `/orders` in de browser
- [ ] `/planning` route geeft geen 404 (geeft lege pagina totdat SP3 klaar is)
