# SP4: UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg skeleton loading en knopfeedback toe aan alle pagina's, herontwerp de navigatiestructuur per rol, en pas alle pagina's aan met een consistente en moderne lay-out op basis van de bestaande Digidromen-stijl.

**Architecture:** Twee nieuwe shared components (`Skeleton`, `LoadingButton`) worden door alle pagina's gebruikt. Layout.tsx krijgt de rol-specifieke navigatiestructuur. Alle pagina's krijgen skeleton-placeholders bij laden en button-feedback bij acties.

**Tech Stack:** React 18, Tailwind 4.2, Lucide icons, TypeScript

**Vereiste:** SP1, SP2 en SP3 zijn volledig uitgevoerd.

---

## File Structure

| Actie | Pad |
|---|---|
| CREATE | `portal/src/components/Skeleton.tsx` |
| CREATE | `portal/src/components/LoadingButton.tsx` |
| MODIFY | `portal/src/components/Layout.tsx` |
| MODIFY | `portal/src/pages/Dashboard.tsx` |
| MODIFY | `portal/src/pages/Orders.tsx` |
| MODIFY | `portal/src/pages/OrderDetail.tsx` |
| MODIFY | `portal/src/pages/Donations.tsx` |
| MODIFY | `portal/src/pages/DonationDetail.tsx` |
| MODIFY | `portal/src/pages/Inventory.tsx` |
| MODIFY | `portal/src/pages/Organizations.tsx` |
| MODIFY | `portal/src/pages/Users.tsx` |
| MODIFY | `portal/src/pages/Reports.tsx` |
| MODIFY | `portal/src/pages/Settings.tsx` |

---

### Task 1: Skeleton component

**Files:**
- Create: `portal/src/components/Skeleton.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// portal/src/components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Basis skeleton blok */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

/** Skeleton rij voor een tabel */
export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

/** Skeleton voor een KPI-kaart */
export const SkeletonKpiCard: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

/** Skeleton voor een detailpagina sectie */
export const SkeletonDetailSection: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <Skeleton className="h-4 w-32" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    ))}
  </div>
);

/** Skeleton voor een lijst-item kaart */
export const SkeletonListItem: React.FC = () => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <Skeleton className="h-8 w-8 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
    <Skeleton className="h-6 w-20 rounded-full" />
  </div>
);
```

---

### Task 2: LoadingButton component

**Files:**
- Create: `portal/src/components/LoadingButton.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// portal/src/components/LoadingButton.tsx
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

const VARIANT_CLASSES: Record<NonNullable<LoadingButtonProps['variant']>, string> = {
  primary: 'bg-digidromen-primary text-digidromen-dark hover:opacity-90',
  secondary: 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  isSuccess = false,
  loadingLabel,
  successLabel,
  variant = 'primary',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClass =
    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClass} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {isLoading && (
        <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {isSuccess && !isLoading && (
        <CheckCircle2 size={14} className="shrink-0 text-green-600" />
      )}
      <span>
        {isLoading && loadingLabel ? loadingLabel : isSuccess && successLabel ? successLabel : children}
      </span>
    </button>
  );
};
```

---

### Task 3: Update Layout.tsx — rol-specifieke navigatiestructuur

**Files:**
- Modify: `portal/src/components/Layout.tsx`

- [ ] **Stap 1: Vervang sidebarLinks met rol-specifieke structuur**

Vervang de `sidebarLinks` array in `portal/src/components/Layout.tsx` volledig:

```tsx
const sidebarLinks = [
  // — Alle rollen
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["help_org", "digidromen_staff", "digidromen_admin", "service_partner"],
  },
  // — Bestellingen
  {
    name: "Bestellingen",
    path: "/orders",
    icon: ShoppingCart,
    roles: ["help_org", "digidromen_staff", "digidromen_admin", "service_partner"],
  },
  // — Donaties
  {
    name: "Donaties",
    path: "/donations",
    icon: HeartHandshake,
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  // — Voorraad
  {
    name: "Voorraad",
    path: "/inventory",
    icon: Box,
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  // — Planning (servicepartner + staff)
  {
    name: "Planning",
    path: "/planning",
    icon: Calendar,
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  // — Beheer (staff/admin)
  {
    name: "Organisaties",
    path: "/organizations",
    icon: Building2,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    name: "Gebruikers",
    path: "/users",
    icon: Users,
    roles: ["digidromen_admin"],
  },
  {
    name: "Prognose",
    path: "/forecast",
    icon: TrendingUp,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    name: "Rapportages",
    path: "/reports",
    icon: BarChart3,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  // — Systeem
  {
    name: "CRM Sync",
    path: "/crm-sync",
    icon: RefreshCw,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    name: "Locaties",
    path: "/stock-locations",
    icon: MapPin,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    name: "Audit Log",
    path: "/audit-log",
    icon: ClipboardList,
    roles: ["digidromen_admin"],
  },
  {
    name: "Instellingen",
    path: "/settings",
    icon: Settings,
    roles: ["digidromen_admin"],
  },
];
```

- [ ] **Stap 2: Voeg `Calendar` toe aan Lucide imports en verwijder `Wrench`**

Update de import aan het begin van `Layout.tsx`:
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

- [ ] **Stap 3: Commit Layout**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add portal/src/components/Layout.tsx portal/src/components/Skeleton.tsx portal/src/components/LoadingButton.tsx
git commit -m "feat(ux): Skeleton en LoadingButton components, Layout navigatiestructuur herschreven"
```

---

### Task 4: Skeleton loading op Dashboard

**Files:**
- Modify: `portal/src/pages/Dashboard.tsx`

- [ ] **Stap 1: Lees de huidige Dashboard.tsx**

```bash
head -80 "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Dashboard.tsx"
```

- [ ] **Stap 2: Vervang spinner-loading door skeletons**

Zoek in Dashboard.tsx het loading-check pattern (bijv. `if (isLoading) return <Spinner />` of gelijksoortige loading state) en vervang door:

```tsx
import { SkeletonKpiCard, SkeletonListItem } from '../components/Skeleton';

// Vervang loading state:
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonKpiCard key={i} />)}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
      </div>
    </div>
  );
}
```

- [ ] **Stap 3: Voeg bestelvenster-banner toe op Dashboard voor help_org**

Voeg bovenaan de gerenderde JSX (voor de KPI-kaarten) toe:
```tsx
import { OrderingWindowBanner } from '../components/OrderingWindowBanner';

// In JSX:
<OrderingWindowBanner />
```

---

### Task 5: Skeleton loading op lijstpagina's

**Files:**
- Modify: `portal/src/pages/Orders.tsx`
- Modify: `portal/src/pages/Donations.tsx`
- Modify: `portal/src/pages/Inventory.tsx`
- Modify: `portal/src/pages/Organizations.tsx`
- Modify: `portal/src/pages/Users.tsx`

- [ ] **Stap 1: Orders.tsx — vervang loading state**

Zoek in `Orders.tsx` het loading-check block. Vervang of voeg toe:

```tsx
import { SkeletonTableRow } from '../components/Skeleton';

// In de tabel body, vervang de loading state:
{isLoading
  ? Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
  : orders?.map((order) => (
      // bestaande rij-render
    ))
}
```

- [ ] **Stap 2: Donations.tsx — vervang loading state**

```tsx
import { SkeletonListItem } from '../components/Skeleton';

{isLoading
  ? Array.from({ length: 4 }).map((_, i) => <SkeletonListItem key={i} />)
  : donations?.map((d) => (/* bestaande render */))
}
```

- [ ] **Stap 3: Inventory.tsx — vervang loading state**

```tsx
import { SkeletonTableRow } from '../components/Skeleton';

{isLoading
  ? Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
  : items?.map((item) => (/* bestaande render */))
}
```

- [ ] **Stap 4: Organizations.tsx — vervang loading state**

```tsx
import { SkeletonListItem } from '../components/Skeleton';

{isLoading
  ? Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)
  : organizations?.map((org) => (/* bestaande render */))
}
```

- [ ] **Stap 5: Users.tsx — vervang loading state**

```tsx
import { SkeletonTableRow } from '../components/Skeleton';

{isLoading
  ? Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)
  : users?.map((u) => (/* bestaande render */))
}
```

---

### Task 6: Skeleton loading op detailpagina's

**Files:**
- Modify: `portal/src/pages/OrderDetail.tsx`
- Modify: `portal/src/pages/DonationDetail.tsx`

- [ ] **Stap 1: OrderDetail.tsx — vervang loading state**

```tsx
import { SkeletonDetailSection } from '../components/Skeleton';

// Vervang loading state:
if (isLoading) {
  return (
    <div className="space-y-4">
      <SkeletonDetailSection rows={6} />
      <SkeletonDetailSection rows={3} />
    </div>
  );
}
```

- [ ] **Stap 2: DonationDetail.tsx — vervang loading state**

```tsx
import { SkeletonDetailSection } from '../components/Skeleton';

if (isLoading) {
  return (
    <div className="space-y-4">
      <SkeletonDetailSection rows={5} />
      <SkeletonDetailSection rows={3} />
    </div>
  );
}
```

---

### Task 7: LoadingButton op acties in Settings en Reports

**Files:**
- Modify: `portal/src/pages/Settings.tsx`
- Modify: `portal/src/pages/Reports.tsx`

- [ ] **Stap 1: Lees Settings.tsx**

```bash
head -60 "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Settings.tsx"
```

- [ ] **Stap 2: Vervang alle plain `<button>` opslaan-acties in Settings.tsx**

Voor elk formulier-opslaanknop, vervang:
```tsx
<button type="submit" disabled={isSaving} className="...">
  {isSaving ? 'Opslaan...' : 'Opslaan'}
</button>
```
Door:
```tsx
import { LoadingButton } from '../components/LoadingButton';

<LoadingButton
  type="submit"
  isLoading={isSaving}
  loadingLabel="Opslaan…"
  variant="primary"
>
  Opslaan
</LoadingButton>
```

- [ ] **Stap 3: Vervang export-knoppen in Reports.tsx met LoadingButton**

Zoek alle download/export-knoppen in `Reports.tsx` en vervang door:
```tsx
<LoadingButton
  isLoading={isExporting}
  loadingLabel="Exporteren…"
  variant="secondary"
  onClick={handleExport}
>
  Exporteer CSV
</LoadingButton>
```

---

### Task 8: Repair-vermeldingen opruimen in resterende bestanden

**Files:**
- Modify: `portal/src/lib/portal-remote.ts` (als repair-functies aanwezig zijn)
- Modify: `portal/src/lib/queryKeys.ts` (als repair-keys aanwezig zijn)
- Modify: `portal/src/lib/realtime.ts` (als repair-subscriptions aanwezig zijn)

- [ ] **Stap 1: Check en verwijder repair-verwijzingen in lib-bestanden**

```bash
grep -n "repair\|Repair\|repair_case" \
  "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/lib/portal-remote.ts" \
  "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/lib/queryKeys.ts" \
  "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/lib/realtime.ts" \
  "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/lib/portal.ts"
```

Voor elk gevonden bestand: verwijder repair-gerelateerde functies, keys en subscriptions. De `repair_cases` tabel blijft in de DB maar mag niet meer via de frontend worden aangesproken.

Richtlijn voor `portal/src/lib/realtime.ts`: verwijder de Realtime-subscription op `repair_cases` als die bestaat.

Richtlijn voor `portal/src/lib/queryKeys.ts`: verwijder `repairs` uit het queryKeys object als dat bestaat.

Richtlijn voor `portal/src/lib/portal-remote.ts`: verwijder functies die `repair_cases` selecten voor UI-gebruik. Functies voor `workflow_events` en `messages` met `case_type = 'repair'` mogen blijven voor historische audittrail.

- [ ] **Stap 2: Verwijder repair-vermeldingen uit Dashboard.tsx**

```bash
grep -n "repair\|Repair" "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Dashboard.tsx"
```

Verwijder de repair-teller, repair-sectie of repair-KPI als die aanwezig zijn in Dashboard.tsx.

---

### Task 9: Build validatie en commit

**Files:**
- No file changes — validatiestap

- [ ] **Stap 1: Volledige build draaien**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal"
npm run build 2>&1
```

Verwacht: `✓ built in X.XXs` — nul TypeScript-errors.

Veelvoorkomende issues en fixes:
- `Cannot find module '../components/Skeleton'` → controleer of het bestand is aangemaakt op het juiste pad
- `Property 'delivery_date' does not exist` → types zijn niet geregenereerd na SP1. Draai opnieuw: `supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts`
- `Wrench is not exported from lucide-react` → verwijder de Wrench-import uit Layout.tsx als die er nog staat

- [ ] **Stap 2: Commit SP4**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add portal/src/
git commit -m "feat(ux): skeleton loading, LoadingButton, navigatie herschreven, repair-vermeldingen verwijderd"
```

---

### Task 10: Smoke test in browser

- [ ] **Stap 1: Start lokale dev server**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal"
npm run dev
```

Open browser op `http://localhost:5173`

- [ ] **Stap 2: Verifieer per rol**

Login als **help_org**:
- [ ] Dashboard toont bestelvenster-banner
- [ ] Sidebar toont: Dashboard, Bestellingen (geen Reparaties, geen Planning)
- [ ] "Bestelling toevoegen" opent wizard
- [ ] Bij laden van bestellingen: skeletons zichtbaar (even throttle netwerk in DevTools)

Login als **digidromen_admin**:
- [ ] Sidebar toont alle links inclusief Planning
- [ ] Geen "Reparaties" link in sidebar
- [ ] `/repairs` redirect naar `/orders`
- [ ] Planning pagina toont events (of lege state als geen data)
- [ ] Settings-pagina: opslaanknoppen tonen spinner bij klikken

Login als **service_partner**:
- [ ] OrderDetail toont "Bezorgdatum invullen" knop
- [ ] Bezorgdatum opslaan toont spinner, dan datum

- [ ] **Stap 3: Final commit als alles werkt**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add -A
git commit -m "chore: SP4 smoke test passes — portal redesign volledig"
```

---

## Verificatie SP4 (volledig project)

Na voltooiing van SP1 t/m SP4:

- [ ] Build slaagt zonder errors
- [ ] Geen repair-links in sidebar voor welke rol dan ook
- [ ] `/repairs` → redirect naar `/orders`
- [ ] Skeleton placeholders zichtbaar bij trage verbinding
- [ ] Alle actieknoppen tonen spinner bij async acties
- [ ] OrderWizard valideert alle producttypen correct
- [ ] Bestelvenster geblokkeerd buiten dag 1-7
- [ ] Bezorgdatum invulbaar door service_partner, read-only voor help_org
- [ ] Donatie naar Verwerkt geblokkeerd zonder certificaat
- [ ] Planning pagina toont bezorgingen en ophaals
- [ ] inventory_movements aangemaakt bij orderstatus → geleverd
- [ ] TypeScript types actueel en passend bij schema
