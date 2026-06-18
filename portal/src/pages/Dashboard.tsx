import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CalendarCheck,
  CheckCircle,
  HeartHandshake,
  HelpCircle,
  Laptop,
  ListChecks,
  Package,
  Plus,
  Sparkles,
  ShoppingCart,
  TriangleAlert,
  Truck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { OrderingWindowBanner } from "../components/OrderingWindowBanner";
import { SkeletonKpiCard, SkeletonListItem } from "../components/Skeleton";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";
import KpiCard from "../components/KpiCard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

/* ─── Human-friendly status copy for help_org ─── */

const FRIENDLY_STATUS: Record<string, string> = {
  concept: "Wordt opgesteld",
  ingediend: "Aanvraag ontvangen",
  te_accorderen: "Wordt beoordeeld",
  geaccordeerd: "Goedgekeurd",
  in_voorbereiding: "Laptop wordt klaargemaakt",
  geleverd: "Afgeleverd",
  afgesloten: "Afgerond",
  afgewezen: "Helaas afgewezen",
};

/* ─── help_org: Mission Hero Panel ─── */

const MissionHeroPanel: React.FC<{ firstName: string; requestCount: number }> = ({
  firstName,
  requestCount,
}) => (
  <section className="overflow-hidden rounded-3xl border border-digidromen-cream bg-white shadow-sm">
    <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="bg-surface-soft p-7 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-digidromen-orange/15 bg-white px-3 py-1 text-xs font-semibold text-digidromen-orange">
          <Sparkles size={14} />
          Samen maken we digidromen waar
        </div>
        <p className="mt-5 text-sm font-medium text-digidromen-dark/60">
          Welkom terug, {firstName}
        </p>
        <h2 className="mt-1 max-w-2xl font-heading text-3xl font-semibold leading-tight text-digidromen-dark">
          Laptop aanvragen voor kinderen die digitaal mee moeten kunnen doen.
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-digidromen-dark/62">
          Kies wat nodig is, vul de leverinformatie aan en volg daarna elke
          aanvraag in gewone taal.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/orders"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[20px] bg-digidromen-yellow px-6 py-2.5 text-sm font-semibold text-digidromen-dark shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-digidromen-yellow/85"
          >
            <Plus size={16} />
            Nieuwe aanvraag
          </Link>
          <Link
            to="/orders"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[20px] border border-digidromen-cream bg-white px-5 py-2.5 text-sm font-semibold text-digidromen-primary transition-colors hover:border-digidromen-primary/25 hover:bg-digidromen-primary/5"
          >
            Mijn aanvragen
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-5 bg-white p-7 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-digidromen-blue/25 text-digidromen-primary">
            <Laptop size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-digidromen-dark">
              Aanvraagportaal
            </p>
            <p className="mt-1 text-sm leading-relaxed text-digidromen-dark/55">
              Geen backoffice-overzicht, maar een korte klantflow voor jullie
              eigen aanvragen.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-digidromen-cream bg-digidromen-warm p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-digidromen-dark/45">
            Open bij jullie
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-digidromen-dark">
            {requestCount}
          </p>
          <p className="text-sm text-digidromen-dark/55">
            {requestCount === 1 ? "aanvraag in behandeling" : "aanvragen in behandeling"}
          </p>
        </div>
      </div>
    </div>
  </section>
);

/* ─── help_org: My Request Timeline ─── */

interface OrderRow {
  id: string;
  status: string;
  organization_id: string;
  priority: string;
  preferred_delivery_date: string | null;
  created_at: string;
}

const MyRequestTimeline: React.FC<{ orders: OrderRow[] }> = ({ orders }) => (
  <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
    <h3 className="mb-4 font-heading text-base font-bold text-digidromen-dark">
      Mijn aanvragen
    </h3>
    <div className="space-y-3">
      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-digidromen-dark/30">
          Je hebt nog geen aanvragen gedaan.
        </p>
      ) : (
        orders.slice(0, 3).map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block rounded-2xl border border-digidromen-cream/80 p-4 transition-colors hover:bg-surface-soft"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-digidromen-dark">
                {FRIENDLY_STATUS[order.status] ?? order.status}
              </p>
              <StatusBadge status={order.status} />
            </div>
            {order.preferred_delivery_date ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-digidromen-dark/50">
                <CalendarCheck size={13} />
                Gewenste levering: {order.preferred_delivery_date}
              </p>
            ) : (
              <p className="mt-2 text-xs text-digidromen-dark/40">
                Leverdatum wordt later bepaald
              </p>
            )}
          </Link>
        ))
      )}
    </div>
    {orders.length > 3 && (
      <Link
        to="/orders"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-digidromen-orange hover:text-digidromen-orange/80"
      >
        Alle aanvragen bekijken
        <ArrowRight size={14} />
      </Link>
    )}
  </div>
);

/* ─── help_org: Need Help Panel ─── */

const NeedHelpPanel: React.FC = () => (
  <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-digidromen-cream">
        <HelpCircle size={18} className="text-digidromen-dark/50" />
      </div>
      <div>
        <h3 className="font-heading text-base font-bold text-digidromen-dark">
          Hulp nodig?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-digidromen-dark/55">
          Kom je er niet uit of heb je een vraag over je aanvraag? Neem dan
          contact op met Digidromen. We helpen je graag verder.
        </p>
      </div>
    </div>
  </div>
);

/* ─── service_partner: Warehouse Header ─── */

const WarehouseHeader: React.FC<{ firstName: string }> = ({ firstName }) => (
  <div className="rounded-2xl bg-digidromen-dark p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-digidromen-yellow">
      Werkvoorraad
    </p>
    <h2 className="mt-1 font-heading text-xl font-bold text-white">
      Hallo {firstName}
    </h2>
    <p className="mt-0.5 text-sm text-white/50">
      {new Date().toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
    </p>
  </div>
);

/* ─── service_partner: Warehouse Action Rail ─── */

interface WarehouseActionRailProps {
  donationCount: number;
  ordersToPrepare: number;
  lowStockCount: number;
}

const WarehouseActionRail: React.FC<WarehouseActionRailProps> = ({
  donationCount,
  ordersToPrepare,
  lowStockCount,
}) => (
  <div className="grid grid-cols-3 gap-3">
    <KpiCard
      label="Donaties te ontvangen"
      value={donationCount}
      icon={HeartHandshake}
      accent="bg-emerald-500"
    />
    <KpiCard
      label="Orders klaar te maken"
      value={ordersToPrepare}
      icon={Package}
      accent="bg-digidromen-primary"
    />
    <KpiCard
      label="Voorraadsignalen"
      value={lowStockCount}
      icon={TriangleAlert}
      accent="bg-amber-500"
    />
  </div>
);

/* ─── service_partner: Today Queue ─── */

interface TodayQueueProps {
  donations: DonationRow[];
  orders: OrderRow[];
}

interface DonationRow {
  id: string;
  status: string;
  sponsor_organization_id: string;
  device_count_promised: number;
  pickup_date: string | null;
  created_at: string;
}

const TodayQueue: React.FC<TodayQueueProps> = ({ donations, orders }) => {
  const items = [
    ...donations.slice(0, 3).map((d) => ({
      id: d.id,
      type: "donatie" as const,
      label:
        d.status === "aangemeld"
          ? "Pickup plannen"
          : d.status === "pickup_gepland"
            ? "Ontvangst registreren"
            : "Donatie verwerken",
      description: `${d.device_count_promised} apparaten${d.pickup_date ? ` · pickup ${d.pickup_date}` : ""}`,
      status: d.status,
      link: `/donations/${d.id}`,
      primary: d.status === "aangemeld",
    })),
    ...orders
      .filter((o) => o.status === "in_voorbereiding")
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        type: "order" as const,
        label: "Order klaarzetten",
        description: "Levering voorbereiden",
        status: o.status,
        link: `/orders/${o.id}`,
        primary: false,
      })),
  ];

  return (
    <Card className="gap-0 rounded-2xl border-digidromen-cream bg-white py-0 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-digidromen-orange">
              Werkrij
            </p>
            <h3 className="mt-1 font-heading text-base font-bold text-digidromen-dark">
              Vandaag aan te pakken
            </h3>
          </div>
          <Button
            asChild
            variant="outline"
            className="min-h-11 rounded-[18px] border-digidromen-cream text-digidromen-dark hover:bg-surface-soft"
          >
            <Link to="/donations">
              Alle donaties
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
        <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 py-6">
            <CheckCircle size={18} className="text-emerald-400" />
            <p className="text-sm text-digidromen-dark/40">
              Alles is bij. Geen openstaande taken.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className={`flex min-h-[72px] items-center justify-between gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                item.primary
                  ? "border-digidromen-orange/25 bg-digidromen-orange-light text-digidromen-dark"
                  : "border-digidromen-cream/80 bg-white hover:bg-surface-soft"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    item.primary
                      ? "bg-digidromen-orange text-white"
                      : "bg-digidromen-cream text-digidromen-orange"
                  }`}
                >
                  {item.type === "donatie" ? (
                    item.primary ? (
                      <CalendarClock size={20} />
                    ) : (
                      <HeartHandshake size={20} />
                    )
                  ) : (
                    <Truck size={20} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-digidromen-dark">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-digidromen-dark/50">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <StatusBadge status={item.status} />
                <ArrowRight size={16} className="text-digidromen-dark/35" />
              </div>
            </Link>
          ))
        )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── service_partner: Stock Signal Strip ─── */

interface StockItem {
  productId: string;
  name: string;
  availableQuantity: number;
}

const StockSignalStrip: React.FC<{ items: StockItem[] }> = ({ items }) => (
  <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
    <h3 className="mb-4 font-heading text-base font-bold text-digidromen-dark">
      Voorraadsignalen
    </h3>
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-digidromen-dark/30">
          Geen signalen.
        </p>
      ) : (
        items.slice(0, 4).map((p) => (
          <div
            key={p.productId}
            className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5"
          >
            <TriangleAlert
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="text-sm font-semibold text-digidromen-dark">
                {p.name}
              </p>
              <p className="text-xs text-digidromen-dark/50">
                Beschikbaar: {p.availableQuantity}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

/* ─── staff/admin: Operations Header ─── */

const OperationsHeader: React.FC<{ firstName: string }> = ({ firstName }) => (
  <div className="rounded-2xl bg-digidromen-dark p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-digidromen-blue">
      Regie
    </p>
    <h2 className="mt-1 font-heading text-xl font-bold text-white">
      Welkom terug, {firstName}
    </h2>
    <p className="mt-0.5 text-sm text-white/50">
      {new Date().toLocaleDateString("nl-NL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </p>
  </div>
);

/* ─── staff/admin: Approval Command Card ─── */

const ApprovalCommandCard: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <Link
      to="/orders?status=te_accorderen"
      className="flex min-h-[44px] items-center justify-between gap-4 rounded-2xl border border-digidromen-orange/20 bg-digidromen-orange-light px-5 py-4 text-digidromen-dark shadow-sm transition-colors hover:bg-digidromen-orange-light/70"
    >
      <div>
        <p className="text-sm font-bold">Bestellingen goedkeuren</p>
        <p className="mt-1 text-sm text-digidromen-dark/70">
          <strong>{count}</strong>{" "}
          {count === 1 ? "bestelling wacht" : "bestellingen wachten"} op
          accordering.
        </p>
      </div>
      <ArrowRight className="shrink-0 text-digidromen-orange" size={22} />
    </Link>
  );
};

/* ─── staff/admin: Operations Bento Grid ─── */

interface BentoGridProps {
  openOrderCount: number;
  openDonationCount: number;
  lowStockCount: number;
  scheduledDeliveries: number;
}

const OperationsBentoGrid: React.FC<BentoGridProps> = ({
  openOrderCount,
  openDonationCount,
  lowStockCount,
  scheduledDeliveries,
}) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <KpiCard
      label="Open orders"
      value={openOrderCount}
      icon={ShoppingCart}
      accent="bg-digidromen-primary"
    />
    <KpiCard
      label="Open donaties"
      value={openDonationCount}
      icon={HeartHandshake}
      accent="bg-emerald-500"
    />
    <KpiCard
      label="Gepland voor levering"
      value={scheduledDeliveries}
      icon={Truck}
      accent="bg-digidromen-orange"
    />
    <KpiCard
      label="Voorraadsignalen"
      value={lowStockCount}
      icon={TriangleAlert}
      accent="bg-amber-500"
    />
  </div>
);

/* ─── staff/admin: Recent Activity Feed ─── */

interface ActivityEvent {
  id: string;
  summary: string;
  createdAt: string;
  subjectType: string;
  subjectId: string;
}

const RecentActivityFeed: React.FC<{ events: ActivityEvent[] }> = ({
  events,
}) => (
  <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
    <h3 className="mb-4 font-heading text-base font-bold text-digidromen-dark">
      Recente activiteit
    </h3>
    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-digidromen-dark/30">
          Nog geen activiteit.
        </p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-digidromen-cream/80 p-3.5 transition-colors hover:bg-digidromen-cream/40"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-digidromen-dark">
                {event.summary}
              </p>
              <p className="shrink-0 text-[11px] text-digidromen-dark/35">
                {new Date(event.createdAt).toLocaleString("nl-NL", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-digidromen-dark/40">
              {event.subjectType} &middot; {event.subjectId}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);

/* ─── staff/admin: Exception Rail ─── */

const ExceptionRail: React.FC<{ lowStock: StockItem[] }> = ({ lowStock }) => (
  <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
    <h3 className="mb-4 font-heading text-base font-bold text-digidromen-dark">
      Signalen
    </h3>
    <div className="space-y-2.5">
      {lowStock.length === 0 ? (
        <p className="py-4 text-center text-sm text-digidromen-dark/30">
          Geen actieve signalen.
        </p>
      ) : (
        lowStock.slice(0, 3).map((product) => (
          <div
            key={product.productId}
            className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5"
          >
            <TriangleAlert
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="text-sm font-semibold text-digidromen-dark">
                {product.name}
              </p>
              <p className="text-xs text-digidromen-dark/50">
                Beschikbaar: {product.availableQuantity}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

/* ─── staff/admin: Quick Links (Bento-style) ─── */

interface QuickLinksProps {
  openOrderCount: number;
  openDonationCount: number;
  lowStockCount: number;
}

const QuickLinks: React.FC<QuickLinksProps> = ({
  openOrderCount,
  openDonationCount,
  lowStockCount,
}) => {
  const links = [
    {
      label: "Bestellingen",
      route: "/orders",
      description: `${openOrderCount} open`,
      icon: ShoppingCart,
    },
    {
      label: "Donaties",
      route: "/donations",
      description: `${openDonationCount} open`,
      icon: HeartHandshake,
    },
    {
      label: "Voorraad",
      route: "/inventory",
      description: `${lowStockCount} signalen`,
      icon: TriangleAlert,
    },
    {
      label: "Planning",
      route: "/planning",
      description: "leveringen",
      icon: ListChecks,
    },
  ];

  return (
    <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
      <h3 className="mb-4 font-heading text-base font-bold text-digidromen-dark">
        Snelle routes
      </h3>
      <div className="grid gap-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.route}
              to={item.route}
              className="flex min-h-[44px] items-center justify-between rounded-xl border border-digidromen-cream/60 p-3 transition-all hover:border-digidromen-primary/30 hover:bg-surface-soft"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-digidromen-blue/20">
                  <Icon size={15} className="text-digidromen-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-digidromen-dark">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-digidromen-dark/40">
                    {item.description}
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-digidromen-dark/25" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Main Dashboard Component
   ═══════════════════════════════════════════════════ */

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? "help_org";
  const isStaff = role === "digidromen_admin" || role === "digidromen_staff";

  /* ── Data fetching (unchanged) ── */

  const { isLoading: notificationsLoading } =
    useQuery({
      queryKey: queryKeys.notifications.unread(),
      queryFn: async () => {
        const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
        const { data, error } = await getSupabaseClient()
          .from("notifications")
          .select("id, title, created_at")
          .gte("created_at", oneDayAgo)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) {
          console.warn("Notificaties konden niet worden geladen", error);
          return [];
        }
        return data;
      },
      enabled: isStaff,
      retry: false,
    });

  const { data: approvalQueueCount = 0 } = useQuery({
    queryKey: ["orders", "te-accorderen-count"] as const,
    queryFn: async () => {
      const { count, error } = await getSupabaseClient()
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "te_accorderen");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isStaff,
  });

  const { data: openOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders.list({
      status: "open",
      scope:
        role === "help_org"
          ? "own_org"
          : role === "service_partner"
            ? "assigned_service_partner"
            : "all",
      organizationId:
        role === "help_org" || role === "service_partner"
          ? user?.organizationId ?? null
          : null,
    }),
    queryFn: async () => {
      let q = getSupabaseClient()
        .from("orders")
        .select(
          "id, status, organization_id, priority, preferred_delivery_date, created_at",
        )
        .not("status", "in", "(afgesloten,afgewezen)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (role === "help_org" && user?.organizationId) {
        q = q.eq("organization_id", user.organizationId);
      } else if (role === "service_partner" && user?.organizationId) {
        q = q.eq("assigned_service_partner_id", user.organizationId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled:
      (role !== "help_org" && role !== "service_partner") ||
      !!user?.organizationId,
  });

  const { data: openDonations = [], isLoading: donationsLoading } = useQuery({
    queryKey: queryKeys.donations.list({ status: "open" }),
    queryFn: async () => {
      let q = getSupabaseClient()
        .from("donation_batches")
        .select(
          "id, status, sponsor_organization_id, device_count_promised, pickup_date, created_at",
        )
        .neq("status", "verwerkt")
        .order("created_at", { ascending: false })
        .limit(20);
      if (role === "service_partner" && user?.organizationId) {
        q = q.eq("assigned_service_partner_id", user.organizationId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled:
      isStaff ||
      (role === "service_partner" && !!user?.organizationId),
  });

  const { data: recentEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["workflow-events", "recent"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("workflow_events")
        .select("id, title, created_at, case_type, case_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled:
      role !== "help_org" &&
      (role !== "service_partner" || !!user?.organizationId),
  });

  const { data: lowStockProducts = [], isLoading: stockLoading } = useQuery({
    queryKey: queryKeys.products.active(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("products")
        .select("id, name, stock_on_hand, stock_reserved, category")
        .eq("active", true)
        .eq("category", "laptop")
        .lt("stock_on_hand", 10);
      if (error) throw error;
      return data;
    },
    enabled: role !== "help_org",
  });

  /* ── Derived data ── */

  const openOrderCount = openOrders.length;
  const openDonationCount = openDonations.length;

  const displayEvents = recentEvents.map((e) => ({
    id: e.id,
    summary: e.title,
    createdAt: e.created_at,
    subjectType: e.case_type,
    subjectId: e.case_id,
  }));

  const displayLowStock = lowStockProducts.map((p) => ({
    productId: p.id,
    name: p.name,
    availableQuantity: p.stock_on_hand - p.stock_reserved,
  }));

  const scheduledDeliveries = openOrders.filter(
    (order) => order.preferred_delivery_date,
  ).length;
  const lowStockCount = displayLowStock.length;

  const isLoading =
    (isStaff && notificationsLoading) ||
    ordersLoading ||
    (role !== "help_org" && donationsLoading) ||
    (isStaff && eventsLoading) ||
    (role !== "help_org" && stockLoading);

  const firstName = user?.name?.split(" ")[0] ?? "";

  /* ── Loading state ── */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     help_org — Customer Surface
     ══════════════════════════════════════════ */

  if (role === "help_org") {
    return (
      <div className="space-y-6">
        <MissionHeroPanel firstName={firstName} requestCount={openOrderCount} />
        <OrderingWindowBanner />
        <MyRequestTimeline orders={openOrders} />
        <NeedHelpPanel />
      </div>
    );
  }

  /* ══════════════════════════════════════════
     service_partner — Warehouse Surface
     ══════════════════════════════════════════ */

  if (role === "service_partner") {
    const ordersToPrepare = openOrders.filter(
      (o) => o.status === "in_voorbereiding",
    ).length;

    return (
      <div className="space-y-6">
        <WarehouseHeader firstName={firstName} />
        <WarehouseActionRail
          donationCount={openDonationCount}
          ordersToPrepare={ordersToPrepare}
          lowStockCount={lowStockCount}
        />
        <TodayQueue donations={openDonations} orders={openOrders} />
        <StockSignalStrip items={displayLowStock} />
      </div>
    );
  }

  /* ══════════════════════════════════════════
     digidromen_staff / digidromen_admin — Operations Surface
     ══════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      <OperationsHeader firstName={firstName} />
      <ApprovalCommandCard count={approvalQueueCount} />
      <OperationsBentoGrid
        openOrderCount={openOrderCount}
        openDonationCount={openDonationCount}
        lowStockCount={lowStockCount}
        scheduledDeliveries={scheduledDeliveries}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RecentActivityFeed events={displayEvents} />
        <div className="space-y-6">
          <QuickLinks
            openOrderCount={openOrderCount}
            openDonationCount={openDonationCount}
            lowStockCount={lowStockCount}
          />
          <ExceptionRail lowStock={displayLowStock} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
