# Data Model Architecture

**Laatste update:** 2026-04-09  
**Status:** Live (implementatie v1)

## Overzicht

Dit document beschrijft de conceptuele en fysieke data model van de Digidromen portal, inclusief kernbeslissingen, relaties, en edge cases.

---

## 1. Conceptueel Model

### Entiteiten en relaties

```
organizations (1)
├─→ (many) user_profiles
│           ├─→ auth_user_id (Supabase Auth)
│           └─→ role: help_org | digidromen_staff | digidromen_admin | service_partner
│
├─→ (many) orders
│           ├─→ organization_id (requester org)
│           ├─→ assigned_service_partner_id (optional FK → organizations)
│           └─→ (many) order_lines
│                       ├─→ product_id
│                       ├─→ line_type: new_request | rma_defect
│                       └─→ rma_category: laptop | voedingskabel | powerbank | muis | rugzak
│
├─→ (many) donation_batches
│           └─→ (many) inventory_items
│
└─→ (many) repair_cases
            └─→ repair_logs (status history)

products
├─→ category: laptop | accessory | service
├─→ is_package: true | false
│   ├─ package_components: [{product_id, qty}]
│   └─ age_group: [6-12, 12-18, 6-18]
├─→ is_replacement_product: true | false
├─→ is_orderable: true | false
├─→ order_scenario: new_request | replacement | accessory
└─→ (many) inventory_items (stock tracking)

inventory_items
├─→ product_id
├─→ condition: new | refurbished | damaged | reserved | in_repair
├─→ quantity, available_quantity
└─→ stock_location_id → stock_locations
    └─→ organization_id (warehouse location)
```

---

## 2. Kerntabellen & Velden

### `organizations`

| Veld | Type | Doel |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | Display name |
| `type` | enum | help_org \| service_partner \| digidromen \| sponsor |
| `city` | text | Locatie |
| `address` | text? | **Afleveradres default** (new: pre-fill in orders) |
| `postal_code` | text? | Postcode afleveradres |
| `contact_name` | text | Contact persoon |
| `contact_email` | text | Contact email |
| `target_group_description` | text? | **NEW (v1)**: Doelgroepomschrijving — wordt pre-filled in orders.motivation |
| `is_orderable` | bool | Can create orders? |
| `active` | bool | Actief/inactief |
| `crm_hubspot_id` | text? | CRM sync |
| `preferred_pickup_day` | text? | Voor sponsors |
| `donor_since` | date? | Voor donors |

**Pre-fill behavior:**
- Wanneer hulporganisatie bestelling indient, worden `address`, `postal_code`, `city` als defaults gebruikt
- Gebruiker kan deze overschrijven per bestelling
- `target_group_description` vult automatisch het `motivation` veld in StepProductFields (alleen new_request)

---

### `user_profiles`

| Veld | Type | Doel |
|---|---|---|
| `id` | UUID | PK |
| `auth_user_id` | UUID FK | Link naar Supabase Auth |
| `organization_id` | UUID FK | Werkgever org |
| `role` | enum | help_org \| digidromen_staff \| digidromen_admin \| service_partner |
| `name` | text | Display name |
| `email` | text | Email address |
| `title` | text? | Job title |
| `phone` | text? | Phone number |

**Auth flow:**
- Magic link: Email → OTP → Supabase Auth
- Password: Email + wachtwoord → Supabase Auth (dev login)
- Na auth: Profile gesynced via `auth_user_id`

---

### `products`

| Veld | Type | Doel |
|---|---|---|
| `id` | UUID | PK (prod-muis, prod-headset, pkg-6-12, etc.) |
| `sku` | text | Inventory code |
| `name` | text | Display name |
| `category` | enum | laptop \| accessory \| service |
| `description` | text | Long description |
| `order_scenario` | text | new_request \| replacement \| accessory |
| `is_package` | bool | Bundle met components? |
| `package_components` | jsonb | [{"product_id":"...", "qty":1}] |
| `is_orderable` | bool | **Kan direct besteld/vervangen?** |
| `is_replacement_product` | bool | **Kan als RMA gebruikt?** |
| `age_group` | text[] | [6-12, 12-18] targeting |
| `specification_summary` | text[] | ["Refurbished laptop", "USB muis"] |
| `inventory_managed` | bool | Stock tracking aan? |
| `active` | bool | In catalog? |

**Vervanging producten:**

| Scenario | Product | is_orderable | is_replacement | order_scenario |
|---|---|---|---|---|
| Nieuwe aanvraag | pkg-6-12 | true | false | new_request |
| Laptop vervanging | prod-laptop | true | true | replacement |
| Voedingskabel | prod-voedingskabel | true | true | replacement |
| Powerbank | prod-powerbank | true | true | replacement |
| **Muis** | **prod-muis** | **true** | **true** | **replacement** |
| **Rugzak** | **prod-rugzak** | **true** | **true** | **replacement** |
| Headset (in pakket) | prod-headset | false | false | accessory |

---

### `orders`

| Veld | Type | Doel |
|---|---|---|
| `id` | UUID | PK |
| `organization_id` | UUID FK | Besteller org (help_org) |
| `requester_user_id` | UUID FK | Wie heeft besteld |
| `status` | enum | ingediend \| beoordeeld \| in_behandeling \| in_voorbereiding \| verzonden \| geleverd \| afgesloten \| geannuleerd |
| `approval_status` | enum | in_afwachting \| goedgekeurd \| afgewezen |
| `approved_at` | timestamp? | Wanneer goedgekeurd |
| `approved_by_user_id` | UUID FK? | Staff/admin die goedkeurde |
| `motivation` | text | **Doelgroepomschrijving** — pre-filled van org.target_group_description, kan aangepast |
| `delivery_address` | text | **Pre-filled van org.address** |
| `postal_code` | text? | **Pre-filled van org.postal_code** |
| `city` | text? | **Pre-filled van org.city** |
| `preferred_delivery_date` | date? | Gewenste leveringsdatum |
| `scheduled_delivery_date` | date? | Geplande datum |
| `actual_delivery_date` | date? | Werkelijke datum |
| `assigned_service_partner_id` | UUID FK? | Wie voert uit |
| `stock_badge` | text? | Voorraadindicator |
| `target_month` | text? | Voorraadplanning |

**Status flow:**
1. `ingediend` — Net ingediend
2. `beoordeeld` — Staff keurt goed/af
3. `in_behandeling` → `in_voorbereiding` — Warehouse voorbereiding
4. `verzonden` — Shipment out
5. `geleverd` — Arrived
6. `afgesloten` — Done
7. `geannuleerd` — Cancelled

---

### `order_lines`

| Veld | Type | Doel |
|---|---|---|
| `id` | UUID | PK |
| `order_id` | UUID FK | Parent order |
| `product_id` | UUID FK | What to deliver/replace |
| `quantity` | int | How many (packages/units) |
| `line_type` | enum | new_request \| rma_defect |
| `rma_category` | text? | laptop \| voedingskabel \| powerbank \| muis \| rugzak (if rma_defect) |
| `serial_number` | text? | SRN (optional voor muis/rugzak, required voor laptop/powerbank) |
| `defect_description` | text? | Klacht of reden vervanging |
| `replacement_reason` | text? | Reden vervanging (optional) |
| `connector_type` | text? | Voor voedingskabel |
| `connector_wattage` | text? | Voor voedingskabel |
| `defect_photo_urls` | text[]? | Foto's defect |
| `rma_validation_status` | ? | RMA checklist status |

**RMA validatie per categorie:**

| Categorie | Serial# | Defect desc | Connector | Photo's | RMA Type |
|---|---|---|---|---|---|
| laptop | ✓ Req | ✓ Req | — | — | Hardware defect |
| voedingskabel | ✓ Req | — | ✓ Req OR ≥2 photos | — | Hardware spec |
| powerbank | ✓ Req | ✓ Req | — | — | Hardware defect |
| **muis** | ✗ Opt | **✓ Req** | — | — | **Eenvoudige vervanging** |
| **rugzak** | ✗ Opt | **✓ Req** | — | — | **Eenvoudige vervanging** |

---

## 3. Order Wizard Flow

### Stap-voor-stap pre-fill logica

```
Stap 1: Organisatie selectie
├─ Staff kiest org (dropdown)
└─ Help_org = fixed op hun eigen org
   └─ Query org met: id, name, city, address, postal_code, target_group_description

Stap 2: Type scenario
├─ new_request → pkg-6-12 / pkg-12-18 / pkg-universal
├─ laptop_replacement → prod-laptop
├─ cable_replacement → prod-voedingskabel
├─ powerbank_replacement → prod-powerbank
├─ mouse_replacement → prod-muis         [NEW]
└─ backpack_replacement → prod-rugzak    [NEW]

Stap 3: Product velden
├─ new_request:
│  ├─ motivation (textarea)
│  │  └─ PRE-FILL: org.target_group_description (als beschikbaar)
│  └─ quantity (number)
│
└─ replacement_*:
   ├─ serial_number (text, opt voor muis/rugzak)
   └─ defect_description (textarea, REQUIRED)

Stap 4: Aflevergegevens
├─ delivery_address
│  └─ PRE-FILL: org.address
├─ postal_code
│  └─ PRE-FILL: org.postal_code
├─ city
│  └─ PRE-FILL: org.city
└─ preferred_delivery_date (date, optional)

Stap 5: Bevestigen & indienen
└─ Order opgeslagen, status = ingediend
```

**Pre-fill regels:**
- Leeg veld → vult van org data
- Veld al ingevuld → wordt niet overschreven
- Gebruiker kan alles aanpassen

---

## 4. Architectuurkeuzes

### 4.1 Aflevergegevens: Per profiel vs. per bestelling?

**Gekozen: Pre-fill vanuit organisatie + per-bestelling override**

| Benadering | Voordelen | Nadelen |
|---|---|---|
| **Pre-fill org** (gekozen) | Sneller, minder herhaald werk | Moet per bestelling controleren |
| Aparte delivery profiles | Flexibiliteit voor meerdere adressen | Overkill voor huidige use case, additionele komplexiteit |
| Hardcoded per org | Simpel | Geen override mogelijk |

**Implementatie:** `organizations.address/postal_code/city` → `orders.delivery_address` (StepDelivery)

---

### 4.2 Doelgroepomschrijving: Per bestelling of per organisatie?

**Gekozen: Per organisatie (default), overschrijfbaar per bestelling**

| Benadering | Voordelen | Nadelen |
|---|---|---|
| **Per organisatie** (gekozen) | Konsistent, geen duplicatie, GDPR-friendly | Kan niet per bestelling afwijken |
| Per bestelling | Flexibel | Dubbel werk, opslag bloat |

**Implementatie:** `organizations.target_group_description` → `orders.motivation` (StepProductFields)

---

### 4.3 Muis/headset/rugzak: Categorisering?

**Gekozen: Product flags + scenario-based routing**

| Benadering | Voordelen | Nadelen |
|---|---|---|
| **Flags model** (gekozen) | Eenvoudig, flexibel | Niet uit te breiden |
| Tagging system | Volledige flexibiliteit | Over-engineered nu |
| Product families | Hiërarchie | Overkill |

**Model:**
```sql
-- Accessories in pakket (niet orderable)
products: {id: prod-headset, is_orderable: false, is_replacement_product: false}

-- Losse vervangingen (orderable RMA)
products: {id: prod-muis, is_orderable: true, is_replacement_product: true, order_scenario: replacement}
products: {id: prod-rugzak, is_orderable: true, is_replacement_product: true, order_scenario: replacement}
```

---

### 4.4 Meerdere afleveradressen per organisatie?

**Gekozen: Niet (v1). Eén adres per organisatie.**

| Benadering | Voordelen | Nadelen |
|---|---|---|
| **Eén adres** (gekozen) | Simpel, konsistent | Geen multi-location support |
| `delivery_addresses` tabel | Flexibel | Extra komplexiteit |

**Toekomstpad:** Indien nodig:
```sql
CREATE TABLE delivery_addresses (
  id UUID PRIMARY KEY,
  organization_id UUID FK REFERENCES organizations,
  label TEXT,  -- "Hoofd", "Filiaal Noord", etc.
  address TEXT,
  postal_code TEXT,
  city TEXT,
  is_default BOOLEAN
);

ALTER TABLE orders ADD delivery_address_id UUID FK;
```

---

## 5. Edge Cases & Risico's

### 5.1 Organisatie zonder adres

**Scenario:** Help_org heeft geen adres ingevuld

**Behavior:**
- Pre-fill leest NULL
- Delivery velden blijven leeg
- Validatie: verplicht → Error "Adres vereist"
- Gebruiker vult handmatig in

**Mitigation:** UI hint: "Organisatie-adres ontbreekt. Vul het hieronder in."

---

### 5.2 Organisatie zonder doelgroepomschrijving

**Scenario:** Nieuwe help_org, target_group_description = NULL

**Behavior:**
- Pre-fill leest NULL
- `motivation` veld start leeg
- Validatie: verplicht (new_request) → Error
- Gebruiker moet invullen

**Mitigation:**
- Onboarding: organisatie setup vraagt naar doelgroepomschrijving
- Placeholder in org form

---

### 5.3 Gebruiker past pre-fill gedeeltelijk aan

**Scenario:** Org.address = "Straat 1", gebruiker wijzigt naar "Straat 2" in step 4, dan gaat terug naar step 2 en forward naar step 4

**Behavior:**
- State `delivery` wordt gehouden (nicht overschreven door pre-fill)
- Gebruiker's wijziging blijft behouden

**Implementation:** useEffect met `prev` check:
```typescript
setDelivery((prev) => ({
  delivery_address: prev.delivery_address || org.address || "",
  // ...
}));
```

---

### 5.4 RMA muis/rugzak: Serial number optioneel?

**Scenario:** Gebruiker weet SRN niet van muis

**Decision:** Serial number optioneel (unlike laptop/powerbank)
- Muis/rugzak zijn goedkoop vervangingen, geen behoefte voor tracking
- Reden vervanging voldoende

**Validation (trigger):**
```sql
IF NEW.rma_category IN ('muis', 'rugzak') THEN
  IF NEW.defect_description IS NULL THEN
    RAISE EXCEPTION 'Muis/rugzak: defect_description (reden) verplicht';
  END IF;
END IF;
```

---

### 5.5 Inventory management: Muis/rugzak tracked?

**Scenario:** Is `prod-muis` geinventariseerd?

**Decision:** Ja, `inventory_managed = true`
- Stock-on-hand tracking
- Voorkomen overbooking
- Reorder thresholds

**Note:** Headset (accessory, niet orderable) heeft ook `inventory_managed = true` omdat het in pakketten zit.

---

## 6. Future Improvements

### Laag prioriteit, Niet in v1:

1. **Multiple delivery addresses per org**
   - Filialen, magazijnen
   - Selectie per bestelling
   - Trigger: >3 locaties per org type

2. **Accessory bundling customization**
   - Gebruiker kiest muis kleur, rugzak type, etc.
   - Product variants in UI
   - Trigger: Customer complaints over bundel samenstelling

3. **Delivery address history per org**
   - Audit trail
   - Auto-suggest (select van vorige adressen)
   - Trigger: Adreswijzigingen opvolgen

4. **RMA defect photo upload**
   - Momenteel: defect_photo_urls als tekst
   - Trigger: Repair center vraagt foto's

5. **Dynamic doelgroepomschrijving per bestelling**
   - Override met custom omschrijving
   - Fallback naar org default
   - Trigger: Diverse doelgroepen in één org

---

## 7. TypeScript Types

Gegenereerd uit `portal/src/types/database.ts`:

```typescript
// Organizations Row
type Organization = {
  id: string;
  name: string;
  type: "help_org" | "service_partner" | "digidromen" | "sponsor";
  city: string;
  address: string | null;
  postal_code: string | null;
  target_group_description: string | null;  // NEW
  is_orderable: boolean;
  active: boolean;
  // ... rest velden
};

// Order Row
type Order = {
  id: string;
  organization_id: string;
  motivation: string;  // doelgroepomschrijving
  delivery_address: string;
  postal_code: string | null;
  city: string | null;
  status: OrderStatus;
  approval_status: ApprovalStatus;
  // ... rest velden
};

// Order Line Row
type OrderLine = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  line_type: "new_request" | "rma_defect";
  rma_category: "laptop" | "voedingskabel" | "powerbank" | "muis" | "rugzak" | null;
  serial_number: string | null;
  defect_description: string | null;
  // ... rest velden
};
```

---

## 8. Deployment Checklist

- [x] Migration `20260409100000_test_users_and_model_improvements.sql`
  - Organizations schema: target_group_description
  - Products update: muis/rugzak orderable
  - rma_category constraint + trigger
  - Test orgs + user profiles
  
- [x] Frontend changes
  - AuthContext: signInWithPassword()
  - Login.tsx: password mode toggle
  - StepProductType.tsx: mouse_replacement, backpack_replacement
  - StepProductFields.tsx: muis/rugzak form fields
  - OrderWizard.tsx: pre-fill logic + ORG_SELECT expand
  - StepConfirm.tsx: SCENARIO_LABELS update
  - database.ts: target_group_description type
  
- [ ] Run migration op live Supabase
- [ ] Run `create-test-users.mjs` met service role key
- [ ] Test login: beide test users + magic link
- [ ] Test order flow:
  - [ ] new_request → pak pre-filled
  - [ ] muis_replacement → pre-filled address
  - [ ] rugzak_replacement → pre-filled address
- [ ] Verify RMA validation (serial_number optional voor muis/rugzak)
