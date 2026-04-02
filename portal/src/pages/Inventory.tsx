import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Laptop, PackageCheck, Truck } from "lucide-react";

import { LoadingButton } from "../components/LoadingButton";
import { SkeletonTableRow } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import type { Database } from "../types/database";

type ParsedInventoryImportRow = {
  location: string;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  incomingEta?: string;
};

const REQUIRED_HEADERS = ["locatie", "beschikbaar", "gereserveerd", "binnenkomend"];
type InventoryView = "voorraad" | "mutatieregels" | "toekomstige_mutaties";

type InventoryItemRow = Pick<
  Database["public"]["Tables"]["inventory_items"]["Row"],
  | "id"
  | "product_id"
  | "warehouse_location"
  | "available_quantity"
  | "quantity"
  | "incoming_quantity"
  | "incoming_eta"
  | "updated_at"
  | "stock_location_id"
> & {
  stock_locations: { name: string } | null;
  products: { name: string; category: Database["public"]["Tables"]["products"]["Row"]["category"] } | null;
};

type OrderInventoryRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "status" | "organization_id"
> & {
  order_lines: Array<{ product_id: string; quantity: number }> | null;
  organizations: { name: string } | null;
};

type DonationInventoryRow = Pick<
  Database["public"]["Tables"]["donation_batches"]["Row"],
  "id" | "status" | "device_count_promised" | "refurbish_ready_count" | "sponsor_organization_id"
> & {
  organizations: { name: string } | null;
};

const KPI_STYLES = {
  Beschikbaar: "bg-sky-50 text-sky-600",
  Gereserveerd: "bg-amber-50 text-amber-600",
  Binnenkomend: "bg-emerald-50 text-emerald-600",
} as const;

function normalizeOrganization(input: unknown): { name: string } | null {
  return input && typeof input === "object" && "name" in input && typeof input.name === "string"
    ? { name: input.name }
    : null;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseImportRows(input: string): ParsedInventoryImportRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

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
    const availableQuantity = Number(val("beschikbaar") || 0);
    const reservedQuantity = Number(val("gereserveerd") || 0);
    const incomingQuantity = Number(val("binnenkomend") || 0);
    const incomingEta = val("binnenkomend_op") || val("incoming_eta") || val("eta") || undefined;

    if (!location) throw new Error(`Rij ${index + 2}: locatie is verplicht.`);
    if ([availableQuantity, reservedQuantity, incomingQuantity].some((v) => Number.isNaN(v) || v < 0)) {
      throw new Error(`Rij ${index + 2}: aantallen moeten nul of positief zijn.`);
    }
    return { location, availableQuantity, reservedQuantity, incomingQuantity, incomingEta };
  });
}

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<InventoryView>("voorraad");

  const queryClient = useQueryClient();
  const role = user?.role ?? "help_org";
  const canImport = role === "digidromen_admin" || role === "digidromen_staff";

  // Supabase inventory query
  const { data: supabaseInventory = [], isLoading } = useQuery({
    queryKey: queryKeys.inventory.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("inventory_items")
        .select("id, product_id, warehouse_location, available_quantity, quantity, incoming_quantity, incoming_eta, updated_at, stock_location_id, stock_locations(name), products(name, category)")
        .order("warehouse_location");
      if (error) throw error;
      return (data ?? []) as InventoryItemRow[];
    },
    enabled: true,
  });

  // Supabase mutations: recent orders + donations
  const { data: supabaseOrders = [] } = useQuery({
    queryKey: queryKeys.orders.list({ for: "inventory" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select("id, status, organization_id, order_lines(product_id, quantity), organizations(name)")
        .not("status", "in", "(afgesloten,afgewezen)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        organization_id: row.organization_id,
        order_lines: row.order_lines ?? [],
        organizations: normalizeOrganization(row.organizations),
      })) satisfies OrderInventoryRow[];
    },
    enabled: true,
  });

  const { data: supabaseDonations = [] } = useQuery({
    queryKey: queryKeys.donations.list({ for: "inventory" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("id, status, device_count_promised, refurbish_ready_count, sponsor_organization_id, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        device_count_promised: row.device_count_promised,
        refurbish_ready_count: row.refurbish_ready_count,
        sponsor_organization_id: row.sponsor_organization_id,
        organizations: normalizeOrganization(row.organizations),
      })) satisfies DonationInventoryRow[];
    },
    enabled: true,
  });

  // Build inventory rows for supabase mode
  const supabaseInventoryRows = useMemo(() => {
    const grouped = new Map<string, {
      id: string;
      location: string;
      availableQuantity: number;
      reservedQuantity: number;
      incomingQuantity: number;
      incomingEta?: string;
      updatedAt?: string;
    }>();

    for (const item of supabaseInventory) {
      const key = item.stock_locations?.name ?? item.warehouse_location ?? item.id;
      const current = grouped.get(key) ?? {
        id: item.id,
        location: key,
        availableQuantity: 0,
        reservedQuantity: 0,
        incomingQuantity: 0,
        incomingEta: item.incoming_eta ?? undefined,
        updatedAt: item.updated_at,
      };
      current.availableQuantity += item.available_quantity;
      current.reservedQuantity += Math.max(0, item.quantity - item.available_quantity);
      current.incomingQuantity += item.incoming_quantity;
      current.incomingEta = item.incoming_eta ?? current.incomingEta;
      current.updatedAt = (item.updated_at ?? "") > (current.updatedAt ?? "") ? item.updated_at : current.updatedAt;
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).sort((a, b) => a.location.localeCompare(b.location));
  }, [supabaseInventory]);

  const inventoryRows = supabaseInventoryRows;

  const totals = useMemo(
    () => inventoryRows.reduce(
      (acc, row) => ({ available: acc.available + row.availableQuantity, reserved: acc.reserved + row.reservedQuantity, incoming: acc.incoming + row.incomingQuantity }),
      { available: 0, reserved: 0, incoming: 0 },
    ),
    [inventoryRows],
  );

  const mutationRows = useMemo(() => {
    const orderMutations = supabaseOrders.flatMap((order) =>
      (order.order_lines ?? []).map((line) => {
        const delivered = ["geleverd", "afgesloten"].includes(order.status);
        const planned = ["ingediend", "te_accorderen", "geaccordeerd", "in_voorbereiding"].includes(order.status);
        return {
          id: `order-${order.id}-${line.product_id}`,
          type: "Uitlevering",
          direction: "uit",
          quantity: Number(line.quantity ?? 0),
          party: order.organizations?.name ?? "Onbekend",
          reference: order.id,
          status: order.status,
          date: "",
          scope: delivered ? "historisch" : planned ? "toekomstig" : "historisch",
          note: delivered ? "Laptop uitgeleverd aan klant" : "Laptopaanvraag van klant",
        };
      }),
    );

    const donationMutations = supabaseDonations.map((donation) => ({
      id: `donation-${donation.id}`,
      type: "Donatie",
      direction: "in",
      quantity: Number(donation.refurbish_ready_count ?? donation.device_count_promised ?? 0),
      party: donation.organizations?.name ?? "Onbekende donor",
      reference: donation.id,
      status: donation.status,
      date: "",
      scope: donation.status === "verwerkt" ? "historisch" : "toekomstig",
      note: donation.status === "verwerkt" ? "Laptops toegevoegd aan voorraad" : "Donatie in aanloop",
    }));

    const incomingRows = inventoryRows
      .filter((row) => row.incomingQuantity > 0)
      .map((row) => ({
        id: `incoming-${row.id}`,
        type: "Binnenkomst",
        direction: "in",
        quantity: row.incomingQuantity,
        party: row.location,
        reference: row.location,
        status: row.incomingEta ? "GEPLAND" : "OPEN",
        date: row.incomingEta ?? row.updatedAt ?? "",
        scope: "toekomstig",
        note: "Verwachte ontvangst op voorraadlocatie",
      }));

    return [...donationMutations, ...incomingRows, ...orderMutations]
      .filter((r) => r.quantity > 0)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [inventoryRows, supabaseOrders, supabaseDonations]);

  const visibleMutationRows = useMemo(
    () => mutationRows.filter((row) => activeView === "toekomstige_mutaties" ? row.scope === "toekomstig" : true),
    [activeView, mutationRows],
  );

  const handleImport = async () => {
    setImportError(null);
    setImportNotice(null);
    try {
      const rows = parseImportRows(importText);
      const supabase = getSupabaseClient();

      // Get or create default product for inventory items
      const { data: defaultProduct } = await supabase
        .from("products")
        .select("id")
        .eq("category", "laptop")
        .eq("active", true)
        .limit(1)
        .single();

      if (!defaultProduct) {
        throw new Error("Geen actief laptopproduct gevonden.");
      }

      // Get stock locations for name lookup
      const { data: locations } = await supabase
        .from("stock_locations")
        .select("id, name");
      const locationMap = new Map((locations ?? []).map((location) => [location.name, location.id]));

      for (const row of rows) {
        const locationId = locationMap.get(row.location);
        if (!locationId) {
          throw new Error(`Locatie "${row.location}" niet gevonden. Maak deze eerst aan.`);
        }

        const { error } = await supabase
          .from("inventory_items")
          .upsert({
            id: crypto.randomUUID(),
            product_id: defaultProduct.id,
            stock_location_id: locationId,
            warehouse_location: row.location,
            condition: "refurbished" as const,
            available_quantity: row.availableQuantity,
            quantity: row.availableQuantity + row.reservedQuantity,
            incoming_quantity: row.incomingQuantity,
            incoming_eta: row.incomingEta ?? null,
          }, {
            onConflict: "product_id,stock_location_id",
          });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      setImportNotice(`${rows.length} voorraadregels geimporteerd.`);
      setImportText("");
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import mislukt.");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportText(await file.text());
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Laptopvoorraad</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? "Laden..." : `${inventoryRows.length} locaties`}
          </p>
        </div>
        {canImport ? (
          <label className="flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <FileUp size={16} className="mr-2" />
            CSV laden
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Beschikbaar", value: totals.available, icon: Laptop, color: "sky" },
          { label: "Gereserveerd", value: totals.reserved, icon: PackageCheck, color: "amber" },
          { label: "Binnenkomend", value: totals.incoming, icon: Truck, color: "emerald" },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${KPI_STYLES[label as keyof typeof KPI_STYLES]}`}>
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

      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        {[
          { key: "voorraad" as const, label: "Voorraad" },
          { key: "mutatieregels" as const, label: "Mutatieregels" },
          { key: "toekomstige_mutaties" as const, label: "Toekomstige mutaties" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === view.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {canImport ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Voorraad importeren</h3>
              <p className="mt-1 text-sm text-slate-500">
                Kolommen: <code>locatie, beschikbaar, gereserveerd, binnenkomend</code>, optioneel <code>binnenkomend_op</code>.
              </p>
            </div>
            <button
              onClick={() => setImportText("locatie,beschikbaar,gereserveerd,binnenkomend,binnenkomend_op\nTilburg-A1,24,6,4,2026-03-18\nTilburg-Buffer,12,0,8,2026-03-20")}
              className="flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <Download size={16} className="mr-2" />
              Voorbeeld invullen
            </button>
          </div>
          {importError ? <p className="mt-4 text-sm text-rose-600">{importError}</p> : null}
          {importNotice ? <p className="mt-4 text-sm text-emerald-600">{importNotice}</p> : null}
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder="Plak hier CSV-data..."
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none ring-digidromen-primary focus:ring-2"
          />
          <div className="mt-4 flex gap-3">
            <LoadingButton
              onClick={() => { void handleImport(); }}
              disabled={!importText.trim()}
              loadingLabel="Importeren..."
              className="px-4 py-2"
            >
              Import uitvoeren
            </LoadingButton>
            <LoadingButton
              onClick={() => { setImportText(""); setImportError(null); setImportNotice(null); }}
              variant="secondary"
              className="px-4 py-2"
            >
              Wissen
            </LoadingButton>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {activeView === "voorraad" ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Locatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Beschikbaar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gereserveerd</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Binnenkomend</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Verwacht</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Laatste mutatie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonTableRow key={index} cols={6} />
                ))
              ) : inventoryRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Nog geen laptopvoorraad.
                  </td>
                </tr>
              ) : (
                inventoryRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.availableQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.reservedQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.incomingQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.incomingEta ?? "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString("nl-NL") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Partij / Locatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Referentie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mutatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Toelichting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonTableRow key={index} cols={7} />
                ))
              ) : visibleMutationRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    Geen mutaties voor dit filter.
                  </td>
                </tr>
              ) : (
                visibleMutationRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.party}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{row.reference}</td>
                    <td className={`px-6 py-4 text-sm font-semibold ${row.direction === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.direction === "in" ? "+" : "-"}{row.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.status}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.date ? String(row.date) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventory;
