# SP2: Order-flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw de volledige order-flow opnieuw: server-side drafts, wizard per producttype met stapvalidatie, bestelvenstervalidatie, servicepartner-invoer van bezorgdatum en rolgebonden statusacties.

**Architecture:** Twee nieuwe hooks (`useOrderingWindow`, `useOrderDraft`) leveren data aan wizard-componenten. De wizard is opgesplitst in 4 stappen als losse componenten. `Orders.tsx` toont de lijst met bestelvenster-banner. `OrderDetail.tsx` toont statusacties per rol.

**Tech Stack:** React 18, TanStack Query v5, Supabase JS client, React Router v7, TypeScript, Tailwind 4.2

**Vereiste:** SP1 is volledig uitgevoerd (nieuwe statussen, schema-uitbreidingen, RPC `check_ordering_window`).

---

## File Structure

| Actie | Pad |
|---|---|
| CREATE | `portal/src/hooks/useOrderingWindow.ts` |
| CREATE | `portal/src/hooks/useOrderDraft.ts` |
| CREATE | `portal/src/components/OrderingWindowBanner.tsx` |
| CREATE | `portal/src/components/wizard/OrderWizard.tsx` |
| CREATE | `portal/src/components/wizard/StepProductType.tsx` |
| CREATE | `portal/src/components/wizard/StepProductFields.tsx` |
| CREATE | `portal/src/components/wizard/StepDelivery.tsx` |
| CREATE | `portal/src/components/wizard/StepConfirm.tsx` |
| MODIFY | `portal/src/pages/Orders.tsx` |
| MODIFY | `portal/src/pages/OrderDetail.tsx` |
| MODIFY | `portal/src/lib/queryKeys.ts` |

---

### Task 1: useOrderingWindow hook

**Files:**
- Create: `portal/src/hooks/useOrderingWindow.ts`

- [ ] **Stap 1: Schrijf de hook**

```typescript
// portal/src/hooks/useOrderingWindow.ts
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface OrderingWindowStatus {
  isOpen: boolean;
  openDay: number;
  closeDay: number;
  todayDay: number;
  /** Admin mag altijd bestellen */
  bypassActive: boolean;
  /** Dag waarop venster opent (huidige maand) */
  nextOpenDate: string;
}

export function useOrderingWindow(): {
  data: OrderingWindowStatus | undefined;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const isAdmin = user?.role === 'digidromen_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['ordering-window'],
    queryFn: async (): Promise<OrderingWindowStatus> => {
      const { data, error } = await getSupabaseClient()
        .rpc('check_ordering_window');
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const { is_open, open_day, close_day, today_day } = row as {
        is_open: boolean;
        open_day: number;
        close_day: number;
        today_day: number;
      };

      // Bereken wanneer het venster volgende keer opent
      const now = new Date();
      let nextOpen = new Date(now.getFullYear(), now.getMonth(), open_day);
      if (now.getDate() > close_day) {
        // Venster is al voorbij deze maand — volgende maand
        nextOpen = new Date(now.getFullYear(), now.getMonth() + 1, open_day);
      }
      const nextOpenDate = nextOpen.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
      });

      return {
        isOpen: is_open,
        openDay: open_day,
        closeDay: close_day,
        todayDay: today_day,
        bypassActive: isAdmin,
        nextOpenDate,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return { data, isLoading };
}
```

- [ ] **Stap 2: Voeg queryKey toe aan queryKeys.ts**

Open `portal/src/lib/queryKeys.ts` en voeg toe aan het exports-object:
```typescript
orderingWindow: () => ['ordering-window'] as const,
```

---

### Task 2: OrderingWindowBanner component

**Files:**
- Create: `portal/src/components/OrderingWindowBanner.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// portal/src/components/OrderingWindowBanner.tsx
import React from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { useOrderingWindow } from '../hooks/useOrderingWindow';
import { useAuth } from '../context/AuthContext';

export const OrderingWindowBanner: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading } = useOrderingWindow();

  // Alleen tonen voor help_org
  if (user?.role !== 'help_org') return null;
  if (isLoading || !data) return null;

  if (data.bypassActive) return null;

  if (data.isOpen) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>
          <strong>Bestelvenster is open</strong> — je kunt bestellen tot en met dag {data.closeDay} van deze maand.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <CalendarClock size={16} className="shrink-0" />
      <span>
        <strong>Bestellen is momenteel niet mogelijk.</strong>{' '}
        Het bestelvenster opent op {data.nextOpenDate} (dag {data.openDay} t/m {data.closeDay} van de maand).
      </span>
    </div>
  );
};
```

---

### Task 3: useOrderDraft hook (server-side concept opslaan)

**Files:**
- Create: `portal/src/hooks/useOrderDraft.ts`

- [ ] **Stap 1: Schrijf de hook**

```typescript
// portal/src/hooks/useOrderDraft.ts
import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface OrderDraftData {
  organization_id: string;
  motivation: string;
  delivery_address: string;
  preferred_delivery_date: string | null;
  lines: Array<{
    product_id: string;
    quantity: number;
    line_type: 'new_request' | 'rma_defect';
    rma_category?: string;
    serial_number?: string;
    defect_description?: string;
    replacement_reason?: string;
    connector_type?: string;
    connector_wattage?: string;
    defect_photo_urls?: string[];
  }>;
}

const DRAFT_KEY = 'order_draft_id';

export function useOrderDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(
    () => localStorage.getItem(DRAFT_KEY)
  );
  const [isSaving, setIsSaving] = useState(false);

  const saveDraft = useCallback(
    async (data: Partial<OrderDraftData>) => {
      if (!user) return;

      setIsSaving(true);
      try {
        const supabase = getSupabaseClient();
        const payload = {
          organization_id: user.organization_id,
          requester_user_id: user.id,
          status: 'concept' as const,
          motivation: data.motivation ?? '',
          delivery_address: data.delivery_address ?? '',
          preferred_delivery_date: data.preferred_delivery_date ?? null,
          requested_at: new Date().toISOString(),
          stock_badge: '',
          ordering_window_ref: null,
          target_month: null,
        };

        if (draftId) {
          const { error } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', draftId)
            .eq('status', 'concept');
          if (error) throw error;
        } else {
          const id = `ord-draft-${Date.now()}`;
          const { error } = await supabase
            .from('orders')
            .insert({ ...payload, id });
          if (error) throw error;
          setDraftId(id);
          localStorage.setItem(DRAFT_KEY, id);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [draftId, user]
  );

  const scheduleSave = useCallback(
    (data: Partial<OrderDraftData>) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => saveDraft(data), 30_000);
    },
    [saveDraft]
  );

  const discardDraft = useCallback(async () => {
    if (!draftId) return;
    await getSupabaseClient()
      .from('orders')
      .delete()
      .eq('id', draftId)
      .eq('status', 'concept');
    localStorage.removeItem(DRAFT_KEY);
    setDraftId(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [draftId, queryClient]);

  const submitDraft = useCallback(
    async (lines: OrderDraftData['lines']) => {
      if (!draftId) throw new Error('Geen concept order aanwezig');

      const supabase = getSupabaseClient();

      // Insert order lines
      const lineRows = lines.map((l, i) => ({
        id: `${draftId}-line-${i}`,
        order_id: draftId,
        product_id: l.product_id,
        quantity: l.quantity,
        line_type: l.line_type,
        rma_category: l.rma_category ?? null,
        serial_number: l.serial_number ?? null,
        defect_description: l.defect_description ?? null,
        replacement_reason: l.replacement_reason ?? null,
        connector_type: l.connector_type ?? null,
        connector_wattage: l.connector_wattage ?? null,
        defect_photo_urls: l.defect_photo_urls ?? [],
      }));

      const { error: lineError } = await supabase
        .from('order_lines')
        .insert(lineRows);
      if (lineError) throw lineError;

      // Status naar ingediend
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'ingediend',
          requested_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('status', 'concept');
      if (error) throw error;

      localStorage.removeItem(DRAFT_KEY);
      setDraftId(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      return draftId;
    },
    [draftId, queryClient]
  );

  return { draftId, isSaving, saveDraft, scheduleSave, discardDraft, submitDraft };
}
```

---

### Task 4: OrderWizard — stap 1 (producttype kiezen)

**Files:**
- Create: `portal/src/components/wizard/StepProductType.tsx`

- [ ] **Stap 1: Maak wizard-map aan**

```bash
mkdir -p "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/components/wizard"
```

- [ ] **Stap 2: Schrijf StepProductType**

```tsx
// portal/src/components/wizard/StepProductType.tsx
import React from 'react';
import { Laptop, Cable, Battery, Package } from 'lucide-react';

export type ProductScenario = 'new_request' | 'laptop_replacement' | 'cable_replacement' | 'powerbank_replacement' | 'accessory_replacement';

interface Props {
  selected: ProductScenario | null;
  onSelect: (scenario: ProductScenario) => void;
}

const OPTIONS: Array<{
  scenario: ProductScenario;
  label: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  roles?: string[];
}> = [
  {
    scenario: 'new_request',
    label: 'Nieuwe aanvraag',
    description: 'Laptop + accessoirepakket voor een kind',
    icon: Package,
  },
  {
    scenario: 'laptop_replacement',
    label: 'Vervanging laptop',
    description: 'Defecte laptop vervangen (SRN + klachtomschrijving verplicht)',
    icon: Laptop,
  },
  {
    scenario: 'cable_replacement',
    label: 'Vervanging voedingskabel',
    description: 'Defecte kabel vervangen',
    icon: Cable,
  },
  {
    scenario: 'powerbank_replacement',
    label: 'Vervanging powerbank',
    description: 'Defecte powerbank vervangen (SRN verplicht)',
    icon: Battery,
  },
];

export const StepProductType: React.FC<Props> = ({ selected, onSelect }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold text-slate-800">Wat wil je bestellen?</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map(({ scenario, label, description, icon: Icon }) => (
        <button
          key={scenario}
          type="button"
          onClick={() => onSelect(scenario)}
          className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
            selected === scenario
              ? 'border-digidromen-primary bg-digidromen-primary/5'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Icon size={20} className={selected === scenario ? 'text-digidromen-primary mt-0.5' : 'text-slate-400 mt-0.5'} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);
```

---

### Task 5: OrderWizard — stap 2 (productspecifieke velden)

**Files:**
- Create: `portal/src/components/wizard/StepProductFields.tsx`

- [ ] **Stap 1: Schrijf StepProductFields**

```tsx
// portal/src/components/wizard/StepProductFields.tsx
import React from 'react';
import type { ProductScenario } from './StepProductType';

export interface ProductFieldValues {
  motivation: string;
  serial_number: string;
  defect_description: string;
  replacement_reason: string;
  connector_type: string;
  connector_wattage: string;
  defect_photo_urls: string[];
  quantity: number;
}

interface Props {
  scenario: ProductScenario;
  values: ProductFieldValues;
  onChange: (field: keyof ProductFieldValues, value: string | number | string[]) => void;
  errors: Partial<Record<keyof ProductFieldValues, string>>;
}

export const StepProductFields: React.FC<Props> = ({ scenario, values, onChange, errors }) => {
  const field = (
    label: string,
    key: keyof ProductFieldValues,
    type: 'text' | 'textarea' = 'text',
    required = false
  ) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={values[key] as string}
          onChange={(e) => onChange(key, e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40 ${
            errors[key] ? 'border-red-400' : 'border-slate-300'
          }`}
        />
      ) : (
        <input
          type="text"
          value={values[key] as string}
          onChange={(e) => onChange(key, e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40 ${
            errors[key] ? 'border-red-400' : 'border-slate-300'
          }`}
        />
      )}
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  );

  if (scenario === 'new_request') {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Beschrijf de aanvraag</h2>
        {field('Doelgroepomschrijving (voor wie is dit pakket?)', 'motivation', 'textarea', true)}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Aantal pakketten<span className="ml-1 text-red-500">*</span></label>
          <input
            type="number"
            min={1}
            max={50}
            value={values.quantity}
            onChange={(e) => onChange('quantity', parseInt(e.target.value, 10))}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
          />
        </div>
      </div>
    );
  }

  if (scenario === 'laptop_replacement') {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Gegevens defecte laptop</h2>
        {field('Serienummer (SRN)', 'serial_number', 'text', true)}
        {field('Klachtomschrijving', 'defect_description', 'textarea', true)}
        {field('Reden voor vervanging (optioneel)', 'replacement_reason', 'textarea')}
      </div>
    );
  }

  if (scenario === 'cable_replacement') {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Gegevens defecte voedingskabel</h2>
        {field('Serienummer / ordernummer', 'serial_number', 'text', true)}
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Vul <strong>connector type + wattage</strong> in, of upload minimaal 2 foto's van het defect.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('Connector type (bijv. USB-C, barrel)', 'connector_type')}
          {field('Wattage (bijv. 45W)', 'connector_wattage')}
        </div>
        {errors.connector_type && (
          <p className="text-xs text-red-500">{errors.connector_type}</p>
        )}
      </div>
    );
  }

  if (scenario === 'powerbank_replacement') {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Gegevens defecte powerbank</h2>
        {field('Serienummer', 'serial_number', 'text', true)}
        {field('Klachtomschrijving', 'defect_description', 'textarea', true)}
      </div>
    );
  }

  return null;
};

export function validateProductFields(
  scenario: ProductScenario,
  values: ProductFieldValues
): Partial<Record<keyof ProductFieldValues, string>> {
  const errs: Partial<Record<keyof ProductFieldValues, string>> = {};

  if (scenario === 'new_request') {
    if (!values.motivation.trim()) errs.motivation = 'Verplicht veld';
    if (!values.quantity || values.quantity < 1) errs.quantity = 'Minimaal 1';
  }
  if (scenario === 'laptop_replacement') {
    if (!values.serial_number.trim()) errs.serial_number = 'SRN is verplicht';
    if (!values.defect_description.trim()) errs.defect_description = 'Klachtomschrijving is verplicht';
  }
  if (scenario === 'cable_replacement') {
    if (!values.serial_number.trim()) errs.serial_number = 'Serienummer is verplicht';
    const hasSpecs = values.connector_type.trim() && values.connector_wattage.trim();
    const hasPhotos = values.defect_photo_urls.length >= 2;
    if (!hasSpecs && !hasPhotos) {
      errs.connector_type = 'Vul connector type + wattage in, of upload minimaal 2 foto\'s';
    }
  }
  if (scenario === 'powerbank_replacement') {
    if (!values.serial_number.trim()) errs.serial_number = 'Serienummer is verplicht';
    if (!values.defect_description.trim()) errs.defect_description = 'Klachtomschrijving is verplicht';
  }

  return errs;
}
```

---

### Task 6: OrderWizard — stap 3 en 4 (levering en bevestiging)

**Files:**
- Create: `portal/src/components/wizard/StepDelivery.tsx`
- Create: `portal/src/components/wizard/StepConfirm.tsx`

- [ ] **Stap 1: Schrijf StepDelivery**

```tsx
// portal/src/components/wizard/StepDelivery.tsx
import React from 'react';

export interface DeliveryValues {
  delivery_address: string;
  postal_code: string;
  city: string;
  preferred_delivery_date: string;
}

interface Props {
  values: DeliveryValues;
  onChange: (field: keyof DeliveryValues, value: string) => void;
  errors: Partial<Record<keyof DeliveryValues, string>>;
}

export const StepDelivery: React.FC<Props> = ({ values, onChange, errors }) => {
  const field = (label: string, key: keyof DeliveryValues, required = false, type = 'text') => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40 ${
          errors[key] ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Aflevergegevens</h2>
      {field('Straat + huisnummer', 'delivery_address', true)}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('Postcode', 'postal_code', true)}
        {field('Stad', 'city', true)}
      </div>
      {field('Gewenste leveringsdatum (optioneel)', 'preferred_delivery_date', false, 'date')}
      <p className="text-xs text-slate-500">
        De exacte bezorgdatum wordt later door Aces Direct ingevuld en is zichtbaar in je bestelling.
      </p>
    </div>
  );
};

export function validateDelivery(values: DeliveryValues): Partial<Record<keyof DeliveryValues, string>> {
  const errs: Partial<Record<keyof DeliveryValues, string>> = {};
  if (!values.delivery_address.trim()) errs.delivery_address = 'Verplicht';
  if (!values.postal_code.trim()) errs.postal_code = 'Verplicht';
  if (!/^\d{4}\s?[A-Z]{2}$/i.test(values.postal_code.trim())) errs.postal_code = 'Ongeldig NL postcodeformaat (bijv. 1234 AB)';
  if (!values.city.trim()) errs.city = 'Verplicht';
  return errs;
}
```

- [ ] **Stap 2: Schrijf StepConfirm**

```tsx
// portal/src/components/wizard/StepConfirm.tsx
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ProductScenario } from './StepProductType';
import type { ProductFieldValues } from './StepProductFields';
import type { DeliveryValues } from './StepDelivery';
import { useOrderingWindow } from '../../hooks/useOrderingWindow';

const SCENARIO_LABELS: Record<ProductScenario, string> = {
  new_request: 'Nieuwe aanvraag',
  laptop_replacement: 'Vervanging laptop',
  cable_replacement: 'Vervanging voedingskabel',
  powerbank_replacement: 'Vervanging powerbank',
  accessory_replacement: 'Vervanging accessoire',
};

interface Props {
  scenario: ProductScenario;
  productFields: ProductFieldValues;
  delivery: DeliveryValues;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const StepConfirm: React.FC<Props> = ({
  scenario,
  productFields,
  delivery,
  isSubmitting,
  onSubmit,
}) => {
  const { data: window } = useOrderingWindow();
  const canSubmit = !window || window.isOpen || window.bypassActive;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-800">Overzicht</h2>

      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
        <Row label="Type" value={SCENARIO_LABELS[scenario]} />
        {productFields.quantity > 1 && <Row label="Aantal" value={String(productFields.quantity)} />}
        {productFields.serial_number && <Row label="Serienummer" value={productFields.serial_number} />}
        {productFields.defect_description && <Row label="Klacht" value={productFields.defect_description} />}
        {productFields.connector_type && <Row label="Connector" value={`${productFields.connector_type} ${productFields.connector_wattage}`} />}
        <Row label="Adres" value={`${delivery.delivery_address}, ${delivery.postal_code} ${delivery.city}`} />
        {delivery.preferred_delivery_date && <Row label="Gewenste datum" value={delivery.preferred_delivery_date} />}
      </div>

      {!canSubmit && window && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Bestellen is niet mogelijk buiten het bestelvenster.
            Het venster opent op {window.nextOpenDate}.
          </span>
        </div>
      )}

      {canSubmit && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Bestelling is gereed om in te dienen.</span>
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
        className="w-full rounded-xl bg-digidromen-primary px-6 py-3 text-sm font-semibold text-digidromen-dark transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Bezig met indienen…
          </span>
        ) : (
          'Bestelling indienen'
        )}
      </button>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between px-4 py-2.5 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-800 max-w-[60%]">{value}</span>
  </div>
);
```

---

### Task 7: OrderWizard — hoofdcomponent

**Files:**
- Create: `portal/src/components/wizard/OrderWizard.tsx`

- [ ] **Stap 1: Schrijf OrderWizard**

```tsx
// portal/src/components/wizard/OrderWizard.tsx
import React, { useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepProductType, type ProductScenario } from './StepProductType';
import { StepProductFields, validateProductFields, type ProductFieldValues } from './StepProductFields';
import { StepDelivery, validateDelivery, type DeliveryValues } from './StepDelivery';
import { StepConfirm } from './StepConfirm';
import { useOrderDraft } from '../../hooks/useOrderDraft';
import { useAuth } from '../../context/AuthContext';

const STEP_LABELS = ['Type', 'Gegevens', 'Levering', 'Bevestigen'];

const EMPTY_PRODUCT_FIELDS: ProductFieldValues = {
  motivation: '',
  serial_number: '',
  defect_description: '',
  replacement_reason: '',
  connector_type: '',
  connector_wattage: '',
  defect_photo_urls: [],
  quantity: 1,
};

const EMPTY_DELIVERY: DeliveryValues = {
  delivery_address: '',
  postal_code: '',
  city: '',
  preferred_delivery_date: '',
};

interface Props {
  onClose: () => void;
}

export const OrderWizard: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveDraft, submitDraft, scheduleSave } = useOrderDraft();

  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<ProductScenario | null>(null);
  const [productFields, setProductFields] = useState<ProductFieldValues>(EMPTY_PRODUCT_FIELDS);
  const [delivery, setDelivery] = useState<DeliveryValues>(EMPTY_DELIVERY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateProductField = (field: keyof ProductFieldValues, value: string | number | string[]) => {
    const updated = { ...productFields, [field]: value };
    setProductFields(updated);
    scheduleSave({ motivation: updated.motivation, delivery_address: delivery.delivery_address });
  };

  const updateDelivery = (field: keyof DeliveryValues, value: string) => {
    const updated = { ...delivery, [field]: value };
    setDelivery(updated);
    scheduleSave({ delivery_address: `${updated.delivery_address}, ${updated.postal_code} ${updated.city}` });
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!scenario) {
        setErrors({ scenario: 'Kies een type bestelling' });
        return;
      }
      setErrors({});
      // Sla concept op als draft-id nog niet bestaat
      await saveDraft({
        motivation: '',
        delivery_address: '',
        preferred_delivery_date: null,
        organization_id: user?.organization_id ?? '',
        lines: [],
      });
      setStep(1);
      return;
    }

    if (step === 1) {
      const errs = validateProductFields(scenario!, productFields);
      if (Object.keys(errs).length) { setErrors(errs as Record<string, string>); return; }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const errs = validateDelivery(delivery);
      if (Object.keys(errs).length) { setErrors(errs as Record<string, string>); return; }
      setErrors({});
      setStep(3);
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        setSubmitError(null);
        const rmaCategory = scenario === 'laptop_replacement' ? 'laptop'
          : scenario === 'cable_replacement' ? 'voedingskabel'
          : scenario === 'powerbank_replacement' ? 'powerbank'
          : undefined;

        const lines = [{
          product_id: rmaCategory === 'laptop' ? 'prod-laptop'
            : rmaCategory === 'voedingskabel' ? 'prod-cable'
            : rmaCategory === 'powerbank' ? 'prod-powerbank'
            : 'prod-laptop-pakket',
          quantity: productFields.quantity,
          line_type: scenario === 'new_request' ? 'new_request' as const : 'rma_defect' as const,
          rma_category: rmaCategory,
          serial_number: productFields.serial_number || undefined,
          defect_description: productFields.defect_description || undefined,
          replacement_reason: productFields.replacement_reason || undefined,
          connector_type: productFields.connector_type || undefined,
          connector_wattage: productFields.connector_wattage || undefined,
          defect_photo_urls: productFields.defect_photo_urls,
        }];

        await saveDraft({
          motivation: productFields.motivation,
          delivery_address: `${delivery.delivery_address}, ${delivery.postal_code} ${delivery.city}`,
          preferred_delivery_date: delivery.preferred_delivery_date || null,
          lines,
        });

        const orderId = await submitDraft(lines);
        navigate(`/orders/${orderId}`);
        onClose();
      } catch (e: unknown) {
        setSubmitError(e instanceof Error ? e.message : 'Er is een fout opgetreden. Probeer opnieuw.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs text-slate-500">Nieuwe bestelling</p>
            <p className="text-sm font-semibold text-slate-800">{STEP_LABELS[step]}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stappen indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-digidromen-primary' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === 0 && (
            <StepProductType selected={scenario} onSelect={(s) => { setScenario(s); setErrors({}); }} />
          )}
          {step === 1 && scenario && (
            <StepProductFields
              scenario={scenario}
              values={productFields}
              onChange={updateProductField}
              errors={errors as Partial<Record<keyof ProductFieldValues, string>>}
            />
          )}
          {step === 2 && (
            <StepDelivery
              values={delivery}
              onChange={updateDelivery}
              errors={errors as Partial<Record<keyof DeliveryValues, string>>}
            />
          )}
          {step === 3 && scenario && (
            <StepConfirm
              scenario={scenario}
              productFields={productFields}
              delivery={delivery}
              isSubmitting={isPending}
              onSubmit={handleSubmit}
            />
          )}

          {submitError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}
        </div>

        {/* Footer navigatie */}
        {step < 3 && (
          <div className="flex justify-between border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={step === 0 ? onClose : () => setStep(step - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {step === 0 ? 'Annuleren' : 'Vorige'}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-digidromen-primary px-5 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90"
            >
              Volgende
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### Task 8: Update Orders.tsx — lijstpagina met wizard en banner

**Files:**
- Modify: `portal/src/pages/Orders.tsx`

- [ ] **Stap 1: Lees de huidige Orders.tsx**

```bash
cat "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Orders.tsx"
```

- [ ] **Stap 2: Voeg OrderWizard en OrderingWindowBanner toe aan de pagina**

Voeg bovenaan de imports toe:
```tsx
import { useState } from 'react';
import { OrderWizard } from '../components/wizard/OrderWizard';
import { OrderingWindowBanner } from '../components/OrderingWindowBanner';
import { useOrderingWindow } from '../hooks/useOrderingWindow';
```

Voeg state toe in het Orders component:
```tsx
const [showWizard, setShowWizard] = useState(false);
const { data: window } = useOrderingWindow();
const canOrder = user?.role !== 'help_org' || !window || window.isOpen || window.bypassActive;
```

Voeg de banner toe boven de tabel (vlak na de pageheader):
```tsx
<OrderingWindowBanner />
```

Wijzig de "Bestelling toevoegen" knop om wizard te openen én te disablen buiten venster:
```tsx
<button
  type="button"
  disabled={!canOrder}
  onClick={() => setShowWizard(true)}
  className="flex items-center gap-2 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
>
  <Plus size={16} />
  Bestelling toevoegen
</button>
```

Voeg wizard modal toe aan het einde van de JSX (voor de afsluitende fragment tag):
```tsx
{showWizard && <OrderWizard onClose={() => setShowWizard(false)} />}
```

---

### Task 9: Update OrderDetail.tsx — bezorgdatum servicepartner + statusacties

**Files:**
- Modify: `portal/src/pages/OrderDetail.tsx`

- [ ] **Stap 1: Lees de huidige OrderDetail.tsx**

```bash
head -50 "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/OrderDetail.tsx"
```

- [ ] **Stap 2: Voeg bezorgdatum-sectie toe voor service_partner**

Voeg de volgende helper-component toe aan `OrderDetail.tsx` (buiten het hoofdcomponent, geen inline definitie):

```tsx
// Buiten het OrderDetail component — niet inline definiëren
const DeliveryDateSection: React.FC<{
  orderId: string;
  deliveryDate: string | null;
  deliverySetBy: string | null;
  role: string;
  onSaved: () => void;
}> = ({ orderId, deliveryDate, role, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(deliveryDate ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const canEdit = role === 'service_partner' || role === 'digidromen_admin' || role === 'digidromen_staff';

  const handleSave = () => {
    startTransition(async () => {
      setError(null);
      const { error: err } = await getSupabaseClient()
        .from('orders')
        .update({
          delivery_date: date,
          delivery_date_set_by: user?.id,
          delivery_date_source: 'manual',
        })
        .eq('id', orderId);
      if (err) { setError(err.message); return; }
      setEditing(false);
      onSaved();
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bezorgdatum</p>
      {editing && canEdit ? (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-digidromen-primary px-3 py-1.5 text-xs font-semibold text-digidromen-dark disabled:opacity-50"
          >
            {isPending && <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Opslaan
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700">Annuleren</button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">
            {deliveryDate
              ? new Date(deliveryDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
              : <span className="text-slate-400 italic">Nog niet ingevuld</span>}
          </p>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-digidromen-primary hover:underline"
            >
              {deliveryDate ? 'Wijzigen' : 'Invullen'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

Gebruik dit component in `OrderDetail.tsx` op een logische plek in de detailweergave:
```tsx
<DeliveryDateSection
  orderId={order.id}
  deliveryDate={order.delivery_date ?? null}
  deliverySetBy={order.delivery_date_set_by ?? null}
  role={user?.role ?? ''}
  onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id!) })}
/>
```

- [ ] **Stap 3: Commit SP2**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add portal/src/hooks/ portal/src/components/wizard/ portal/src/components/OrderingWindowBanner.tsx
git add portal/src/pages/Orders.tsx portal/src/pages/OrderDetail.tsx portal/src/lib/queryKeys.ts
git commit -m "feat(orders): wizard, bestelvenster-validatie, concept-drafts, bezorgdatum servicepartner"
```

---

## Verificatie SP2

- [ ] Hulporganisatie klikt "Bestelling toevoegen" → wizard opent
- [ ] Stap 1: kies type → Volgende
- [ ] Stap 2 (laptop vervanging): submit zonder SRN → inline foutmelding
- [ ] Stap 2 (laptop vervanging): vul SRN + klacht in → Volgende
- [ ] Stap 2 (powerbank): vul SRN + klacht in → Volgende
- [ ] Stap 3: postcode zonder spatie/letters → foutmelding
- [ ] Stap 4: buiten bestelvenster (simuleer door temp. close_day=1 in DB) → knop disabled + melding
- [ ] Stap 4: binnen bestelvenster → indienen → redirect naar orderpagina
- [ ] OrderDetail: service_partner ziet "Bezorgdatum invullen" knop
- [ ] OrderDetail: hulporganisatie ziet datum maar geen knop
- [ ] Bezorgdatum opslaan → spinner in knop → datum verschijnt
