import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, CalendarDays, HeartHandshake, Package, ShoppingCart } from "lucide-react";

import { LoadingButton } from "../components/LoadingButton";
import { downloadWorkbook } from "../lib/export";
import { downloadTextFile, formatDate } from "../lib/format";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database";

type OrderReportRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "status" | "priority" | "preferred_delivery_date" | "created_at"
> & {
  organizations: { name: string } | null;
  order_lines: Array<{ id: string }> | null;
};

type DonationReportRow = Pick<
  Database["public"]["Tables"]["donation_batches"]["Row"],
  "id" | "status" | "device_count_promised" | "refurbish_ready_count" | "rejected_count" | "pickup_date" | "created_at"
> & {
  organizations: { name: string } | null;
};

function normalizeOrganization(input: unknown): { name: string } | null {
  return input && typeof input === "object" && "name" in input && typeof input.name === "string"
    ? { name: input.name }
    : null;
}

const dayFormatter = new Intl.DateTimeFormat("nl-NL", { weekday: "short" });

function buildCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

const Reports: React.FC = () => {
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.orders.list({ for: "reports" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select(
          "id, status, priority, preferred_delivery_date, created_at, organizations!orders_organization_id_fkey(name), order_lines(id)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        priority: row.priority,
        preferred_delivery_date: row.preferred_delivery_date,
        created_at: row.created_at,
        organizations: normalizeOrganization(row.organizations),
        order_lines: row.order_lines ?? [],
      })) satisfies OrderReportRow[];
    },
  });

  const { data: donations = [] } = useQuery({
    queryKey: queryKeys.donations.list({ for: "reports" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select(
          "id, status, device_count_promised, refurbish_ready_count, rejected_count, pickup_date, created_at, organizations!donation_batches_sponsor_organization_id_fkey(name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        device_count_promised: row.device_count_promised,
        refurbish_ready_count: row.refurbish_ready_count,
        rejected_count: row.rejected_count,
        pickup_date: row.pickup_date,
        created_at: row.created_at,
        organizations: normalizeOrganization(row.organizations),
      })) satisfies DonationReportRow[];
    },
  });

  const openOrders = orders.filter((order) => !["afgesloten", "afgewezen"].includes(order.status));
  const scheduledDeliveries = openOrders.filter((order) => order.preferred_delivery_date).length;
  const activeDonations = donations.filter((donation) => !["verwerkt", "geannuleerd"].includes(donation.status));
  const refurbishReady = donations.reduce(
    (total, donation) => total + Number(donation.refurbish_ready_count ?? 0),
    0,
  );

  const exportCards = [
    {
      key: "orders-excel",
      title: "Orders in Excel",
      description: "Volledig overzicht van orderstatussen, prioriteit en geplande leverdatums.",
      tone: "bg-sky-600 text-white",
      action: () =>
        downloadWorkbook(
          "orders.xlsx",
          "Orders",
          orders.map((order) => ({
            id: order.id,
            organisatie: order.organizations?.name ?? "",
            status: order.status,
            prioriteit: order.priority,
            leverdatum: order.preferred_delivery_date ?? "",
            regels: order.order_lines?.length ?? 0,
            aangemaakt_op: order.created_at,
          })),
        ),
    },
    {
      key: "orders-csv",
      title: "Orders in CSV",
      description: "Lichtgewicht export voor delen met finance, BI of externe tooling.",
      tone: "bg-white text-slate-900 border border-slate-200",
      action: () =>
        downloadTextFile(
          "orders.csv",
          buildCsv([
            ["id", "organisatie", "status", "prioriteit", "leverdatum", "aangemaakt_op"],
            ...orders.map((order) => [
              order.id,
              order.organizations?.name ?? "",
              order.status,
              order.priority ?? "",
              order.preferred_delivery_date ?? "",
              order.created_at,
            ]),
          ]),
        ),
    },
    {
      key: "donations-excel",
      title: "Donaties in Excel",
      description: "Batchstatus, donor en refurbish-opbrengst in een rapportagebestand.",
      tone: "bg-emerald-600 text-white",
      action: () =>
        downloadWorkbook(
          "donations.xlsx",
          "Donations",
          donations.map((donation) => ({
            id: donation.id,
            sponsor: donation.organizations?.name ?? "",
            status: donation.status,
            pickup_datum: donation.pickup_date ?? "",
            toegezegde_devices: donation.device_count_promised,
            refurbish_ready: donation.refurbish_ready_count ?? 0,
            afgekeurd: donation.rejected_count ?? 0,
          })),
        ),
    },
    {
      key: "donations-csv",
      title: "Donaties in CSV",
      description: "Snelle export voor operationele afstemming met servicepartners.",
      tone: "bg-white text-slate-900 border border-slate-200",
      action: () =>
        downloadTextFile(
          "donations.csv",
          buildCsv([
            ["id", "sponsor", "status", "pickup_datum", "toegezegde_devices", "refurbish_ready", "afgekeurd"],
            ...donations.map((donation) => [
              donation.id,
              donation.organizations?.name ?? "",
              donation.status,
              donation.pickup_date ?? "",
              String(donation.device_count_promised),
              String(donation.refurbish_ready_count ?? 0),
              String(donation.rejected_count ?? 0),
            ]),
          ]),
        ),
    },
  ] as const;

  const weeklyActivity = useMemo(() => {
    const buckets = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const isoDay = date.toISOString().slice(0, 10);
      const orderCount = orders.filter((order) => order.created_at.startsWith(isoDay)).length;
      const donationCount = donations.filter((donation) => donation.created_at.startsWith(isoDay)).length;
      return {
        label: dayFormatter.format(date),
        total: orderCount + donationCount,
      };
    });

    const maxValue = Math.max(...buckets.map((bucket) => bucket.total), 1);
    return buckets.map((bucket) => ({
      ...bucket,
      height: `${Math.max(14, Math.round((bucket.total / maxValue) * 100))}%`,
    }));
  }, [donations, orders]);

  const runExport = async (key: string, action: () => void) => {
    setActiveExport(key);
    setLastExport(null);
    try {
      action();
      setLastExport(key);
      window.setTimeout(() => setLastExport((current) => (current === key ? null : current)), 2400);
    } finally {
      setActiveExport(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_40%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_55%,_#ecfeff_100%)] shadow-sm">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.6fr_1fr] lg:px-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <ArrowDownToLine size={14} />
              Rapportagehub
            </div>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900">
                Operationele rapportages zonder oude repair-ruis.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Exporteer orders en donaties in het juiste formaat en houd tegelijk zicht op leverdruk, actieve batches en refurbish-opbrengst.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Open orders", value: openOrders.length, icon: ShoppingCart, tone: "bg-sky-50 text-sky-700" },
                { label: "Leveringen gepland", value: scheduledDeliveries, icon: CalendarDays, tone: "bg-amber-50 text-amber-700" },
                { label: "Actieve donaties", value: activeDonations.length, icon: HeartHandshake, tone: "bg-emerald-50 text-emerald-700" },
                { label: "Refurbish ready", value: refurbishReady, icon: Package, tone: "bg-slate-100 text-slate-800" },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur">
                  <div className={`mb-3 inline-flex rounded-xl p-2 ${tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Afgelopen 7 dagen</p>
                <h3 className="mt-2 text-lg font-semibold">Instroom per dag</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Orders + donaties
              </span>
            </div>
            <div className="mt-6 flex h-48 items-end gap-3">
              {weeklyActivity.map((bucket) => (
                <div key={bucket.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-2xl bg-gradient-to-t from-cyan-400 via-sky-400 to-white/80" style={{ height: bucket.height }} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">{bucket.total}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{bucket.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {exportCards.map((card) => (
          <article key={card.key} className={`rounded-[24px] p-5 shadow-sm ${card.tone}`}>
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Export</p>
                <h3 className="text-xl font-bold">{card.title}</h3>
                <p className="text-sm leading-6 opacity-80">{card.description}</p>
              </div>
              <LoadingButton
                onClick={() => { void runExport(card.key, card.action); }}
                isLoading={activeExport === card.key}
                isSuccess={lastExport === card.key}
                loadingLabel="Voorbereiden..."
                successLabel="Gedownload"
                variant={card.tone.includes("bg-white") ? "secondary" : "primary"}
                className={card.tone.includes("bg-white") ? "self-start" : "self-start border-white/10 bg-white/10 text-white hover:bg-white/15"}
              >
                Download export
              </LoadingButton>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recente orders</h3>
              <p className="text-sm text-slate-500">Focus op leverdatums en werkvoorraad.</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {orders.length} totaal
            </span>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-sky-700">{order.id}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{order.organizations?.name ?? "Onbekende organisatie"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {order.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Leverdatum: {order.preferred_delivery_date ? formatDate(order.preferred_delivery_date) : "Nog niet gepland"}</span>
                  <span>Regels: {order.order_lines?.length ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recente donatiebatches</h3>
              <p className="text-sm text-slate-500">Instroom, pickup en refurbish-opbrengst in een oogopslag.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {donations.length} totaal
            </span>
          </div>
          <div className="space-y-3">
            {donations.slice(0, 5).map((donation) => (
              <div key={donation.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-emerald-700">{donation.id}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{donation.organizations?.name ?? "Onbekende donor"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {donation.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Pickup: {donation.pickup_date ? formatDate(donation.pickup_date) : "Nog niet ingepland"}</span>
                  <span>Toegezegd: {donation.device_count_promised}</span>
                  <span>Refurbish ready: {donation.refurbish_ready_count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
