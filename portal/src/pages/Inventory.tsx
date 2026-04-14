import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Laptop, Monitor, Package, Search, SlidersHorizontal, Wrench } from "lucide-react";

import DataTable, { type Column } from "../components/DataTable";
import { LoadingButton } from "../components/LoadingButton";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import type { Database } from "../types/database";

/* ─── Types ─── */

type ProductCategory = Database["public"]["Enums"]["product_category"];
type InventoryCondition = Database["public"]["Enums"]["inventory_condition"];

interface InventoryRow {
  id: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  location: string;
  condition: InventoryCondition;
  quantity: number;
  available: number;
  updatedAt: string | null;
}

type InventoryView = "voorraad" | "mutatieregels" | "toekomstige_mutaties";

/* ─── Constants ─── */

const CATEGORY_CONFIG: Record<ProductCategory, { label: string; icon: typeof Laptop; className: string }> = {
  laptop: { label: "Laptop", icon: Monitor, className: "bg-blue-100 text-blue-700" },
  accessory: { label: "Accessoire", icon: Package, className: "bg-violet-100 text-violet-700" },
  service: { label: "Service", icon: Wrench, className: "bg-amber-100 text-amber-700" },
};

const CONDITION_LABELS: Record<InventoryCondition, string> = {
  new: "Nieuw",
  refurbished: "Refurbished",
  damaged: "Beschadigd",
  reserved: "Gereserveerd",
  in_repair: "In reparatie",
};

const CONDITION_STYLES: Record<InventoryCondition, string> = {
  new: "bg-emerald-100 text-emerald-700",
  refurbished: "bg-sky-100 text-sky-700",
  damaged: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  in_repair: "bg-purple-100 text-purple-700",
};

const REQUIRED_HEADERS = ["locatie", "beschikbaar", "gereserveerd", "binnenkomend"];

/* ─── Helpers ─── */

function CategoryBadge({ category }: { category: ProductCategory }) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.laptop;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: InventoryCondition }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CONDITION_STYLES[condition]}`}>
      {CONDITION_LABELS[condition]}
    </span>
  );
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseImportRows(input: string) {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Gebruik een CSV met minimaal een headerregel en een datarij.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(normalizeHeader);
  const headerMap = new Map(headers.map((h, i) => [h, i]));
  for (const h of REQUIRED_HEADERS) {
    if (!headerMap.has(h)) throw new Error(`Verplichte kolom ontbreekt: ${h}`);
  }
  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const val = (h: string) => cells[headerMap.get(h) ?? -1] ?? "";
    const location = val("locatie");
    const available = Number(val("beschikbaar") || 0);
    const reserved = Number(val("gereserveerd") || 0);
    const incoming = Number(val("binnenkomend") || 0);
    const eta = val("binnenkomend_op") || val("incoming_eta") || val("eta") || undefined;
    if (!location) throw new Error(`Rij ${index + 2}: locatie is verplicht.`);
    if ([available, reserved, incoming].some((v) => Number.isNaN(v) || v < 0)) {
      throw new Error(`Rij ${index + 2}: aantallen moeten nul of positief zijn.`);
    }
    return { location, available, reserved, incoming, eta };
  });
}

/* ─── Mutation rows (orders/donations) ─── */

type OrderMutRow = {
  id: string;
  status: string;
  order_lines: Array<{ product_id: string; quantity: number }> | null;
  organizations: { name: string } | null;
};

type DonationMutRow = {
  id: string;
  status: string;
  device_count_promised: number;
  refurbish_ready_count: number | null;
  organizations: { name: string } | null;
};

function normalizeOrg(input: unknown): { name: string } | null {
  return input && typeof input === "object" && "name" in input && typeof input.name === "string"
    ? { name: input.name }
    : null;
}

/* ─── Component ─── */

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? "help_org";
  const canImport = role === "digidromen_admin" || role === "digidromen_staff";

  const [activeView, setActiveView] = useState<InventoryView>("voorraad");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [conditionFilter, setConditionFilter] = useState<InventoryCondition | "all">("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // ── Data queries ──

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: queryKeys.inventory.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("inventory_items")
        .select("id, product_id, warehouse_location, available_quantity, quantity, condition, incoming_quantity, incoming_eta, updated_at, stock_location_id, stock_locations(name), products(sku, name, category)")
        .order("warehouse_location");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.orders.list({ for: "inventory" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select("id, status, organization_id, order_lines(product_id, quantity), organizations!orders_organization_id_fkey(name)")
        .not("status", "in", "(afgesloten,afgewezen)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        order_lines: r.order_lines ?? [],
        organizations: normalizeOrg(r.organizations),
      })) as OrderMutRow[];
    },
  });

  const { data: donations = [] } = useQuery({
    queryKey: queryKeys.donations.list({ for: "inventory" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("id, status, device_count_promised, refurbish_ready_count, sponsor_organization_id, organizations!donation_batches_sponsor_organization_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        device_count_promised: r.device_count_promised,
        refurbish_ready_count: r.refurbish_ready_count,
        organizations: normalizeOrg(r.organizations),
      })) as DonationMutRow[];
    },
  });

  // ── Transform inventory items to flat rows ──

  const inventoryRows: InventoryRow[] = useMemo(() => {
    return rawItems.map((item) => {
      const product = item.products as { sku: string; name: string; category: ProductCategory } | null;
      const loc = item.stock_locations as { name: string } | null;
      return {
        id: item.id,
        sku: product?.sku ?? "-",
        productName: product?.name ?? "Onbekend product",
        category: product?.category ?? "laptop",
        location: loc?.name ?? item.warehouse_location ?? "-",
        condition: (item.condition ?? "refurbished") as InventoryCondition,
        quantity: item.quantity,
        available: item.available_quantity,
        updatedAt: item.updated_at,
      };
    });
  }, [rawItems]);

  // ── Filtered rows ──

  const filteredRows = useMemo(() => {
    let rows = inventoryRows;
    if (categoryFilter !== "all") {
      rows = rows.filter((r) => r.category === categoryFilter);
    }
    if (conditionFilter !== "all") {
      rows = rows.filter((r) => r.condition === conditionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [inventoryRows, categoryFilter, conditionFilter, search]);

  // ── KPI totals ──

  const totals = useMemo(
    () =>
      inventoryRows.reduce(
        (acc, r) => ({
          available: acc.available + r.available,
          reserved: acc.reserved + Math.max(0, r.quantity - r.available),
          total: acc.total + r.quantity,
        }),
        { available: 0, reserved: 0, total: 0 },
      ),
    [inventoryRows],
  );

  // ── Mutation rows ──

  const mutationRows = useMemo(() => {
    const orderMuts = orders.flatMap((order) =>
      (order.order_lines ?? []).map((line) => {
        const delivered = ["geleverd", "afgesloten"].includes(order.status);
        const planned = ["ingediend", "te_accorderen", "geaccordeerd", "in_voorbereiding"].includes(order.status);
        return {
          id: `order-${order.id}-${line.product_id}`,
          type: "Uitlevering",
          direction: "uit" as const,
          quantity: Number(line.quantity ?? 0),
          party: order.organizations?.name ?? "Onbekend",
          reference: order.id,
          status: order.status,
          scope: delivered ? "historisch" : planned ? "toekomstig" : "historisch",
          note: delivered ? "Laptop uitgeleverd" : "Laptopaanvraag",
        };
      }),
    );
    const donationMuts = donations.map((d) => ({
      id: `donation-${d.id}`,
      type: "Donatie",
      direction: "in" as const,
      quantity: Number(d.refurbish_ready_count ?? d.device_count_promised ?? 0),
      party: d.organizations?.name ?? "Onbekende donor",
      reference: d.id,
      status: d.status,
      scope: d.status === "verwerkt" ? "historisch" : "toekomstig",
      note: d.status === "verwerkt" ? "Toegevoegd aan voorraad" : "Donatie in aanloop",
    }));
    return [...donationMuts, ...orderMuts].filter((r) => r.quantity > 0);
  }, [orders, donations]);

  const visibleMutations = useMemo(
    () =>
      activeView === "toekomstige_mutaties"
        ? mutationRows.filter((r) => r.scope === "toekomstig")
        : mutationRows,
    [activeView, mutationRows],
  );

  // ── Import handler ──

  const handleImport = async () => {
    setImportError(null);
    setImportNotice(null);
    try {
      const rows = parseImportRows(importText);
      const sb = getSupabaseClient();
      const { data: defaultProduct } = await sb
        .from("products").select("id").eq("category", "laptop").eq("active", true).limit(1).single();
      if (!defaultProduct) throw new Error("Geen actief laptopproduct gevonden.");
      const { data: locs } = await sb.from("stock_locations").select("id, name");
      const locMap = new Map((locs ?? []).map((l) => [l.name, l.id]));
      for (const row of rows) {
        const locId = locMap.get(row.location);
        if (!locId) throw new Error(`Locatie "${row.location}" niet gevonden.`);
        const payload = {
          product_id: defaultProduct.id,
          stock_location_id: locId,
          warehouse_location: row.location,
          condition: "refurbished" as const,
          available_quantity: row.available,
          quantity: row.available + row.reserved,
          incoming_quantity: row.incoming,
          incoming_eta: row.eta ?? null,
          last_mutation_at: new Date().toISOString(),
        };
        const { data: existing, error: findError } = await sb
          .from("inventory_items")
          .select("id")
          .eq("product_id", defaultProduct.id)
          .eq("stock_location_id", locId)
          .maybeSingle();
        if (findError) throw findError;
        if (existing?.id) {
          const { error } = await sb.from("inventory_items").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from("inventory_items").insert({
            id: crypto.randomUUID(),
            ...payload,
          });
          if (error) throw error;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      setImportNotice(`${rows.length} regels geimporteerd.`);
      setImportText("");
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import mislukt.");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportText(await file.text());
    setImportOpen(true);
    event.target.value = "";
  };

  // ── DataTable columns ──

  const inventoryColumns: Column<InventoryRow>[] = [
    {
      key: "sku",
      label: "SKU",
      render: (row) => <span className="font-mono text-xs font-semibold text-slate-700">{row.sku}</span>,
    },
    {
      key: "productName",
      label: "Product",
      render: (row) => <span className="font-semibold text-slate-900">{row.productName}</span>,
    },
    {
      key: "category",
      label: "Categorie",
      render: (row) => <CategoryBadge category={row.category} />,
    },
    {
      key: "location",
      label: "Locatie",
    },
    {
      key: "condition",
      label: "Conditie",
      render: (row) => <ConditionBadge condition={row.condition} />,
    },
    {
      key: "quantity",
      label: "Totaal",
      render: (row) => <span className="tabular-nums">{row.quantity}</span>,
    },
    {
      key: "available",
      label: "Beschikbaar",
      render: (row) => (
        <span className={`tabular-nums font-semibold ${row.available > 0 ? "text-emerald-700" : "text-red-600"}`}>
          {row.available}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Voorraad</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? "Laden..." : `${inventoryRows.length} items — ${totals.available} beschikbaar`}
          </p>
        </div>
        {canImport && (
          <div className="flex items-center gap-2">
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              title="Bulk upload CSV om voorraadhoeveelheden bij te werken"
            >
              <FileUp size={14} />
              CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
            </label>
            <button
              onClick={() => setImportOpen(!importOpen)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              title="Plak CSV data om te importeren"
            >
              <Download size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Beschikbaar", value: totals.available, color: "bg-emerald-50 text-emerald-600", icon: Laptop },
          { label: "Gereserveerd", value: totals.reserved, color: "bg-amber-50 text-amber-600", icon: Package },
          { label: "Totaal", value: totals.total, color: "bg-sky-50 text-sky-600", icon: Monitor },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── View tabs ── */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        {([
          { key: "voorraad" as const, label: "Voorraad" },
          { key: "mutatieregels" as const, label: "Mutatieregels" },
          { key: "toekomstige_mutaties" as const, label: "Toekomstige mutaties" },
        ]).map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === v.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Import panel (collapsed by default) ── */}
      {canImport && importOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Voorraad importeren</h3>
              <p className="mt-1 text-xs text-slate-500">
                Kolommen: <code>locatie, beschikbaar, gereserveerd, binnenkomend</code>
              </p>
            </div>
            <button
              onClick={() => setImportText("locatie,beschikbaar,gereserveerd,binnenkomend,binnenkomend_op\nTilburg-A1,24,6,4,2026-03-18")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Voorbeeld
            </button>
          </div>
          {importError && <p className="mt-3 text-sm text-rose-600">{importError}</p>}
          {importNotice && <p className="mt-3 text-sm text-emerald-600">{importNotice}</p>}
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder="Plak hier CSV-data..."
            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
          />
          <div className="mt-3 flex gap-2">
            <LoadingButton onClick={() => { void handleImport(); }} disabled={!importText.trim()} loadingLabel="Importeren..." className="px-3 py-1.5 text-xs">
              Import uitvoeren
            </LoadingButton>
            <button onClick={() => { setImportOpen(false); setImportText(""); setImportError(null); setImportNotice(null); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {activeView === "voorraad" ? (
        <>
          {/* Search & filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op SKU, product of locatie..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ProductCategory | "all")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="all">Alle categorieen</option>
                <option value="laptop">Laptop</option>
                <option value="accessory">Accessoire</option>
                <option value="service">Service</option>
              </select>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value as InventoryCondition | "all")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="all">Alle condities</option>
                <option value="new">Nieuw</option>
                <option value="refurbished">Refurbished</option>
                <option value="damaged">Beschadigd</option>
                <option value="reserved">Gereserveerd</option>
                <option value="in_repair">In reparatie</option>
              </select>
            </div>
          </div>

          {/* Inventory table */}
          <DataTable<InventoryRow>
            columns={inventoryColumns}
            data={filteredRows}
            isLoading={isLoading}
            emptyMessage="Geen voorraad gevonden voor deze filters."
            keyField="id"
          />
        </>
      ) : (
        /* Mutation table */
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Partij</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Referentie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mutatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Toelichting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleMutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Geen mutaties voor dit filter.
                  </td>
                </tr>
              ) : (
                visibleMutations.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.party}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{row.reference}</td>
                    <td className={`px-6 py-4 text-sm font-semibold ${row.direction === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.direction === "in" ? "+" : "-"}{row.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.status}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Inventory;
