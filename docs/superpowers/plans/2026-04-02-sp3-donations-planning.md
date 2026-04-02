# SP3: Donaties & Planning Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Herontwerp de donatiepagina's met concept-opslag, certificaatverplicht bij statusovergang, en bouw een nieuwe Planning-pagina met weekoverzicht van pickups, bezorgingen en voorraadbinnenkomst. Voeg inventory_movements logging toe bij uitlevering.

**Architecture:** `useDonationDraft` hook voor concept-opslag. `Donations.tsx` toont lijst + aanmelden. `DonationDetail.tsx` bewaakt certifcaatgate. `Planning.tsx` is een nieuwe standalone pagina die orders en donaties per datum aggregeert.

**Tech Stack:** React 18, TanStack Query v5, Supabase JS, Tailwind 4.2, TypeScript

**Vereiste:** SP1 is volledig uitgevoerd (nieuwe donation_status, inventory_movements tabel, certificate trigger).

---

## File Structure

| Actie | Pad |
|---|---|
| CREATE | `portal/src/hooks/useDonationDraft.ts` |
| CREATE | `portal/src/pages/Planning.tsx` |
| MODIFY | `portal/src/pages/Donations.tsx` |
| MODIFY | `portal/src/pages/DonationDetail.tsx` |
| MODIFY | `portal/src/pages/OrderDetail.tsx` |

---

### Task 1: useDonationDraft hook

**Files:**
- Create: `portal/src/hooks/useDonationDraft.ts`

- [ ] **Stap 1: Schrijf de hook**

```typescript
// portal/src/hooks/useDonationDraft.ts
import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface DonationDraftData {
  sponsor_organization_id: string;
  device_count_promised: number;
  pickup_date: string | null;
  pickup_contact_name: string;
  pickup_address?: string;
}

const DRAFT_KEY = 'donation_draft_id';

export function useDonationDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(
    () => localStorage.getItem(DRAFT_KEY)
  );
  const [isSaving, setIsSaving] = useState(false);

  const saveDraft = useCallback(async (data: Partial<DonationDraftData>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const payload = {
        sponsor_organization_id: data.sponsor_organization_id ?? user.organization_id,
        assigned_service_partner_id: null,
        device_count_promised: data.device_count_promised ?? 0,
        status: 'concept' as const,
        pickup_date: data.pickup_date ?? null,
        pickup_contact_name: data.pickup_contact_name ?? '',
      };

      if (draftId) {
        const { error } = await supabase
          .from('donation_batches')
          .update(payload)
          .eq('id', draftId)
          .eq('status', 'concept');
        if (error) throw error;
      } else {
        const id = `don-draft-${Date.now()}`;
        const { error } = await supabase
          .from('donation_batches')
          .insert({ ...payload, id });
        if (error) throw error;
        setDraftId(id);
        localStorage.setItem(DRAFT_KEY, id);
      }
    } finally {
      setIsSaving(false);
    }
  }, [draftId, user]);

  const scheduleSave = useCallback((data: Partial<DonationDraftData>) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraft(data), 30_000);
  }, [saveDraft]);

  const submitDraft = useCallback(async (data: DonationDraftData) => {
    if (!draftId) throw new Error('Geen concept donatie aanwezig');
    const { error } = await getSupabaseClient()
      .from('donation_batches')
      .update({ ...data, status: 'aangemeld' })
      .eq('id', draftId)
      .eq('status', 'concept');
    if (error) throw error;
    localStorage.removeItem(DRAFT_KEY);
    setDraftId(null);
    queryClient.invalidateQueries({ queryKey: ['donations'] });
    return draftId;
  }, [draftId, queryClient]);

  const discardDraft = useCallback(async () => {
    if (!draftId) return;
    await getSupabaseClient()
      .from('donation_batches')
      .delete()
      .eq('id', draftId)
      .eq('status', 'concept');
    localStorage.removeItem(DRAFT_KEY);
    setDraftId(null);
    queryClient.invalidateQueries({ queryKey: ['donations'] });
  }, [draftId, queryClient]);

  return { draftId, isSaving, saveDraft, scheduleSave, submitDraft, discardDraft };
}
```

---

### Task 2: Update Donations.tsx — aanmeldformulier met concept-opslag

**Files:**
- Modify: `portal/src/pages/Donations.tsx`

- [ ] **Stap 1: Lees de huidige Donations.tsx**

```bash
cat "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/Donations.tsx"
```

- [ ] **Stap 2: Voeg aanmeldformulier modal toe**

Voeg bovenaan de imports toe:
```tsx
import { useState, useTransition } from 'react';
import { useDonationDraft } from '../hooks/useDonationDraft';
```

Voeg de volgende inline-vrije component toe boven het Donations export (niet inline definiëren):

```tsx
// NIET inline in Donations definiëren — apart component
const DonationAanmeldForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { saveDraft, submitDraft, scheduleSave } = useDonationDraft();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    device_count_promised: 1,
    pickup_date: '',
    pickup_contact_name: '',
    pickup_address: '',
    sponsor_organization_id: '',
  });

  const update = (key: string, value: string | number) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
    scheduleSave(updated as Parameters<typeof scheduleSave>[0]);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);
      try {
        if (!fields.pickup_contact_name.trim()) throw new Error('Naam contactpersoon is verplicht');
        if (!fields.device_count_promised || fields.device_count_promised < 1) throw new Error('Minimaal 1 apparaat');
        const id = await submitDraft({
          sponsor_organization_id: fields.sponsor_organization_id,
          device_count_promised: fields.device_count_promised,
          pickup_date: fields.pickup_date || null,
          pickup_contact_name: fields.pickup_contact_name,
          pickup_address: fields.pickup_address,
        });
        navigate(`/donations/${id}`);
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Fout bij indienen');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Donatie aanmelden</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Naam contactpersoon <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fields.pickup_contact_name}
              onChange={(e) => update('pickup_contact_name', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Aantal apparaten (schatting) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              value={fields.device_count_promised}
              onChange={(e) => update('device_count_promised', parseInt(e.target.value, 10))}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Ophaalafspraak (voorkeursdatum)</label>
            <input
              type="date"
              value={fields.pickup_date}
              onChange={(e) => update('pickup_date', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Ophaaladres</label>
            <input
              type="text"
              value={fields.pickup_address}
              onChange={(e) => update('pickup_address', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuleren</button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-digidromen-primary px-5 py-2 text-sm font-semibold text-digidromen-dark disabled:opacity-50"
          >
            {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Aanmelden
          </button>
        </div>
      </div>
    </div>
  );
};
```

Voeg in het Donations-component state en modal toe:
```tsx
const [showForm, setShowForm] = useState(false);
// ...
// "Donatie aanmelden" knop:
<button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90">
  <Plus size={16} /> Donatie aanmelden
</button>
// ...
{showForm && <DonationAanmeldForm onClose={() => setShowForm(false)} />}
```

---

### Task 3: Update DonationDetail.tsx — certificaatgate en statusacties

**Files:**
- Modify: `portal/src/pages/DonationDetail.tsx`

- [ ] **Stap 1: Lees de huidige DonationDetail.tsx**

```bash
head -60 "/Users/joris/Documents/Code projecten/Werk/Digidromen/portal/src/pages/DonationDetail.tsx"
```

- [ ] **Stap 2: Voeg certificaatgate toe**

Voeg de volgende helper-component toe boven het hoofdcomponent (niet inline):

```tsx
// Niet inline in DonationDetail definiëren
const StatusActieKnop: React.FC<{
  donationId: string;
  currentStatus: string;
  certificateUrl: string | null;
  userRole: string;
  onChanged: () => void;
}> = ({ donationId, currentStatus, certificateUrl, userRole, onChanged }) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Bepaal volgende status op basis van rol
  const transitions: Record<string, { next: string; label: string; allowedRoles: string[] }> = {
    aangemeld:     { next: 'pickup_gepland',   label: 'Ophaal plannen',       allowedRoles: ['digidromen_staff', 'digidromen_admin', 'service_partner'] },
    pickup_gepland:{ next: 'ontvangen',        label: 'Markeer als ontvangen', allowedRoles: ['service_partner', 'digidromen_admin'] },
    ontvangen:     { next: 'in_verwerking',    label: 'Start verwerking',      allowedRoles: ['service_partner', 'digidromen_admin'] },
    in_verwerking: { next: 'verwerkt',         label: 'Markeer als verwerkt',  allowedRoles: ['service_partner', 'digidromen_admin'] },
  };

  const t = transitions[currentStatus];
  if (!t || !t.allowedRoles.includes(userRole)) return null;

  const needsCert = t.next === 'verwerkt' && !certificateUrl;

  const handleClick = () => {
    if (needsCert) {
      setError('Upload eerst het data wipe certificaat voordat je naar Verwerkt zet.');
      return;
    }
    startTransition(async () => {
      setError(null);
      const { error: err } = await getSupabaseClient()
        .from('donation_batches')
        .update({ status: t.next })
        .eq('id', donationId);
      if (err) { setError(err.message); return; }
      onChanged();
    });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        onClick={handleClick}
        disabled={isPending || needsCert}
        title={needsCert ? 'Upload eerst het data wipe certificaat' : undefined}
        className="flex items-center gap-2 rounded-xl bg-digidromen-primary px-5 py-2.5 text-sm font-semibold text-digidromen-dark disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
      >
        {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
        {t.label}
      </button>
      {needsCert && (
        <p className="text-xs text-amber-700">
          Certificaat vereist: upload het data wipe certificaat hieronder voordat je naar Verwerkt kunt zetten.
        </p>
      )}
    </div>
  );
};
```

Gebruik `StatusActieKnop` in de DonationDetail JSX:
```tsx
<StatusActieKnop
  donationId={donation.id}
  currentStatus={donation.status}
  certificateUrl={donation.data_wipe_certificate_url ?? null}
  userRole={user?.role ?? ''}
  onChanged={() => queryClient.invalidateQueries({ queryKey: ['donations', id] })}
/>
```

---

### Task 4: inventory_movements bij orderuitlevering

**Files:**
- Modify: `portal/src/pages/OrderDetail.tsx`

- [ ] **Stap 1: Voeg inventory mutation toe bij statusovergang naar 'geleverd'**

Voeg de volgende helper toe in `OrderDetail.tsx` (buiten het component):

```tsx
// Buiten het component definiëren
async function logOrderMovements(orderId: string, lines: Array<{ product_id: string; quantity: number }>) {
  const supabase = getSupabaseClient();
  const movements = lines.map((line) => ({
    id: `mov-${orderId}-${line.product_id}-${Date.now()}`,
    product_id: line.product_id,
    quantity_delta: -line.quantity, // uitlevering = negatief
    movement_type: 'order_fulfillment' as const,
    source_case_id: orderId,
    source_case_type: 'order',
    note: `Uitlevering order ${orderId}`,
  }));
  const { error } = await supabase.from('inventory_movements').insert(movements);
  if (error) console.error('inventory_movements insert failed:', error.message);
}
```

Pas de statusovergang-handler aan in `OrderDetail.tsx` zodat bij de overgang naar 'geleverd' de movements worden gelogd:

```tsx
const handleStatusChange = async (newStatus: string) => {
  const { error } = await getSupabaseClient()
    .from('orders')
    .update({ status: newStatus })
    .eq('id', order.id);
  if (error) throw error;

  if (newStatus === 'geleverd' && orderLines?.length) {
    await logOrderMovements(order.id, orderLines.map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
    })));
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() });
};
```

---

### Task 5: Planning.tsx — nieuwe pagina

**Files:**
- Create: `portal/src/pages/Planning.tsx`

- [ ] **Stap 1: Schrijf de Planning pagina**

```tsx
// portal/src/pages/Planning.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Package, Truck, HeartHandshake } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface PlanningEvent {
  id: string;
  date: string;
  type: 'delivery' | 'pickup' | 'stock_arrival';
  label: string;
  sublabel: string;
  color: 'blue' | 'green' | 'orange';
}

function usePlanningEvents() {
  return useQuery<PlanningEvent[]>({
    queryKey: ['planning-events'],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const events: PlanningEvent[] = [];

      // Geplande bezorgingen (orders met delivery_date)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, delivery_date, scheduled_delivery_date, status, organization_id, organizations(name)')
        .not('delivery_date', 'is', null)
        .in('status', ['geaccordeerd', 'in_voorbereiding', 'geleverd'])
        .order('delivery_date', { ascending: true });

      orders?.forEach((o) => {
        events.push({
          id: `del-${o.id}`,
          date: o.delivery_date!,
          type: 'delivery',
          label: `Bezorging — ${(o.organizations as { name?: string } | null)?.name ?? o.organization_id}`,
          sublabel: o.status,
          color: 'blue',
        });
      });

      // Geplande ophaals (donaties met pickup_date)
      const { data: donations } = await supabase
        .from('donation_batches')
        .select('id, pickup_date, status, sponsor_organization_id, sponsor_org:organizations!donation_batches_sponsor_organization_id_fkey(name)')
        .not('pickup_date', 'is', null)
        .in('status', ['aangemeld', 'pickup_gepland'])
        .order('pickup_date', { ascending: true });

      donations?.forEach((d) => {
        events.push({
          id: `pick-${d.id}`,
          date: d.pickup_date!,
          type: 'pickup',
          label: `Ophaal donatie — ${(d.sponsor_org as { name?: string } | null)?.name ?? d.sponsor_organization_id}`,
          sublabel: d.status,
          color: 'orange',
        });
      });

      // Verwachte voorraadbinnenkomst (inventory_items met incoming_eta)
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('id, incoming_eta, product_id, products(name), quantity')
        .not('incoming_eta', 'is', null)
        .order('incoming_eta', { ascending: true });

      inventory?.forEach((item) => {
        events.push({
          id: `stock-${item.id}`,
          date: item.incoming_eta!,
          type: 'stock_arrival',
          label: `Voorraad verwacht — ${(item.products as { name?: string } | null)?.name ?? item.product_id}`,
          sublabel: `${item.quantity} stuks`,
          color: 'green',
        });
      });

      return events.sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 2 * 60 * 1000,
  });
}

const ICON: Record<PlanningEvent['type'], React.FC<{ size?: number; className?: string }>> = {
  delivery: Truck,
  pickup: HeartHandshake,
  stock_arrival: Package,
};

const COLOR: Record<PlanningEvent['color'], string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  green: 'border-green-200 bg-green-50 text-green-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
};

const ICON_COLOR: Record<PlanningEvent['color'], string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  orange: 'text-orange-500',
};

const Planning: React.FC = () => {
  const { data: events, isLoading } = usePlanningEvents();

  // Groepeer per datum
  const grouped = useMemo(() => {
    if (!events) return [];
    const map = new Map<string, PlanningEvent[]>();
    events.forEach((e) => {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays size={20} className="text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-800">Planning</h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <CalendarDays size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Geen geplande activiteiten</p>
          <p className="mt-1 text-xs text-slate-400">Bezorgingen, ophaals en voorraadbinnenkomst verschijnen hier zodra ze zijn ingepland.</p>
        </div>
      )}

      {grouped.map(([date, dayEvents]) => {
        const dateObj = new Date(date);
        const isToday = date === new Date().toISOString().slice(0, 10);
        const isPast = dateObj < new Date() && !isToday;

        return (
          <div key={date} className={isPast ? 'opacity-50' : ''}>
            <div className="mb-2 flex items-center gap-2">
              <p className={`text-sm font-semibold ${isToday ? 'text-digidromen-primary' : 'text-slate-600'}`}>
                {isToday ? 'Vandaag — ' : ''}
                {dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {isToday && <span className="rounded-full bg-digidromen-primary px-2 py-0.5 text-[10px] font-semibold text-digidromen-dark">vandaag</span>}
            </div>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const Icon = ICON[event.type];
                return (
                  <div key={event.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${COLOR[event.color]}`}>
                    <Icon size={16} className={`shrink-0 ${ICON_COLOR[event.color]}`} />
                    <div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs opacity-70">{event.sublabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Planning;
```

- [ ] **Stap 2: Commit SP3**

```bash
cd "/Users/joris/Documents/Code projecten/Werk/Digidromen"
git add portal/src/hooks/useDonationDraft.ts
git add portal/src/pages/Planning.tsx
git add portal/src/pages/Donations.tsx portal/src/pages/DonationDetail.tsx portal/src/pages/OrderDetail.tsx
git commit -m "feat(donations,planning): concept-drafts, certificaatgate, Planning pagina, inventory movements logging"
```

---

## Verificatie SP3

- [ ] Klik "Donatie aanmelden" → modal opent met contactpersoon + aantallen velden
- [ ] Ververs de pagina na invullen maar vóór submit → concept bewaard (draftId in localStorage)
- [ ] Donatie naar "verwerkt" zonder certificaat → foutmelding verschijnt
- [ ] Upload certificaat → "Markeer als verwerkt" knop actief
- [ ] Donatie naar "verwerkt" met certificaat → statuswijziging slaagt
- [ ] Planning pagina (`/planning`) toont events per datum
- [ ] Order naar "geleverd" → inventory_movements rijen aangemaakt (verifieer via Supabase dashboard)
- [ ] Geplande bezorgdatum verschijnt op planningpagina
