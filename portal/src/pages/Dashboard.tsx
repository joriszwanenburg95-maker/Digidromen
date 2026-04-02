import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, HeartHandshake, RefreshCw, ShoppingCart, TriangleAlert, Wrench } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";
import KpiCard from "../components/KpiCard";


const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await getSupabaseClient()
        .from("notifications")
        .select("id, title, created_at")
        .gte("created_at", oneDayAgo)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: openOrders = [] } = useQuery({
    queryKey: queryKeys.orders.list({ status: "open" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select("id, status, organization_id, priority, preferred_delivery_date, created_at")
        .not("status", "in", "(AFGESLOTEN,GEANNULEERD)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: openRepairs = [] } = useQuery({
    queryKey: queryKeys.repairs.list({ status: "open" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("repair_cases")
        .select("id, status, issue_type, updated_at")
        .neq("status", "AFGESLOTEN")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: openDonations = [] } = useQuery({
    queryKey: queryKeys.donations.list({ status: "open" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("id, status, sponsor_organization_id, device_count_promised, pickup_date, created_at")
        .neq("status", "OP_VOORRAAD")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: recentEvents = [] } = useQuery({
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
    enabled: true,
  });

  const { data: lowStockProducts = [] } = useQuery({
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
    enabled: true,
  });

  const role = user?.role ?? "help_org";
  const openOrderCount = openOrders.length;
  const openRepairCount = openRepairs.length;
  const openDonationCount = openDonations.length;

  const unreadNotifications = notifications.length;

  const spotlightOrders = openOrders.slice(0, 3);
  const spotlightRepairs = openRepairs.slice(0, 3);
  const spotlightDonations = openDonations.slice(0, 3);

  // KPI cards per role
  const cards = role === "help_org"
    ? [
        { label: "Open bestellingen", value: String(openOrderCount), icon: ShoppingCart, accent: "bg-digidromen-primary" },
        { label: "Open reparaties", value: String(openRepairCount), icon: Wrench, accent: "bg-amber-500" },
        { label: "Meldingen", value: String(unreadNotifications), icon: RefreshCw, accent: "bg-digidromen-secondary" },
        { label: "Donaties", value: "-", icon: HeartHandshake, accent: "bg-emerald-500" },
      ]
    : role === "service_partner"
      ? [
          { label: "Open reparaties", value: String(openRepairCount), icon: Wrench, accent: "bg-amber-500" },
          { label: "Donatiebatches", value: String(openDonationCount), icon: HeartHandshake, accent: "bg-emerald-500" },
          { label: "Te leveren orders", value: String(openOrders.filter((o) => ["IN_VOORBEREIDING", "VERZONDEN"].includes(o.status)).length), icon: ShoppingCart, accent: "bg-digidromen-primary" },
          { label: "Meldingen", value: String(unreadNotifications), icon: RefreshCw, accent: "bg-digidromen-secondary" },
        ]
      : [
          { label: "Open orders", value: String(openOrderCount), icon: ShoppingCart, accent: "bg-digidromen-primary" },
          { label: "Open reparaties", value: String(openRepairCount), icon: Wrench, accent: "bg-amber-500" },
          { label: "Open donaties", value: String(openDonationCount), icon: HeartHandshake, accent: "bg-emerald-500" },
          { label: "Meldingen", value: String(unreadNotifications), icon: FileText, accent: "bg-digidromen-secondary" },
        ];

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

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-digidromen-dark p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-digidromen-primary/20 blur-3xl" />
        <div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-digidromen-primary/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-digidromen-primary">
            Supply & Service Portal
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Welkom terug, {user?.name?.split(" ")[0]}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {new Date().toLocaleDateString("nl-NL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((stat) => (
          <KpiCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} accent={stat.accent} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent activity */}
        <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
          <h3 className="mb-4 text-base font-bold text-digidromen-dark">Recente activiteit</h3>
          <div className="space-y-3">
            {displayEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-digidromen-dark/30">Nog geen activiteit.</p>
            ) : (
              displayEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-digidromen-cream/80 p-3.5 transition-colors hover:bg-digidromen-cream/40">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-digidromen-dark">{event.summary}</p>
                    <p className="shrink-0 text-[11px] text-digidromen-dark/35">
                      {new Date(event.createdAt).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick links */}
          <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-digidromen-dark">Snelle routes</h3>
            <div className="grid gap-2">
              {[
                { label: "Bestellingen", route: "/orders", description: `${openOrders.length} records`, icon: ShoppingCart },
                { label: "Reparaties", route: "/repairs", description: `${openRepairs.length} records`, icon: Wrench },
                { label: "Donaties", route: "/donations", description: `${openDonations.length} records`, icon: HeartHandshake },
              ]
                .filter((item) => item.route !== "/donaties" || role !== "help_org")
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.route}
                      to={item.route}
                      className="flex items-center justify-between rounded-xl border border-digidromen-cream/60 p-3 transition-all hover:border-digidromen-primary/30 hover:bg-digidromen-orange-light/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-digidromen-cream">
                          <Icon size={15} className="text-digidromen-dark/50" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-digidromen-dark">{item.label}</p>
                          <p className="text-[11px] text-digidromen-dark/40">{item.description}</p>
                        </div>
                      </div>
                      <ArrowRight size={15} className="text-digidromen-dark/25" />
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-digidromen-dark">Signalen</h3>
            <div className="space-y-2.5">
              {displayLowStock.length > 0 ? (
                displayLowStock.slice(0, 2).map((product) => (
                  <div key={product.productId} className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-digidromen-dark">{product.name}</p>
                      <p className="text-xs text-digidromen-dark/50">Beschikbaar: {product.availableQuantity}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-digidromen-dark/30">Geen actieve signalen.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spotlight cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={16} className="text-digidromen-primary" />
            <h3 className="text-base font-bold text-digidromen-dark">Orders</h3>
          </div>
          <div className="space-y-2">
            {spotlightOrders.length === 0 ? (
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Geen openstaande orders.</p>
            ) : (
              spotlightOrders.map((order) => (
                <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark font-mono">{order.id}</p>
                  <StatusBadge status={order.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wrench size={16} className="text-amber-500" />
            <h3 className="text-base font-bold text-digidromen-dark">Reparaties</h3>
          </div>
          <div className="space-y-2">
            {spotlightRepairs.length === 0 ? (
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Geen openstaande reparaties.</p>
            ) : (
              spotlightRepairs.map((repair) => (
                <Link key={repair.id} to={`/repairs/${repair.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark font-mono">{repair.id}</p>
                  <StatusBadge status={repair.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <HeartHandshake size={16} className="text-emerald-500" />
            <h3 className="text-base font-bold text-digidromen-dark">Donaties</h3>
          </div>
          <div className="space-y-2">
            {spotlightDonations.length === 0 ? (
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Geen actieve donatiebatches.</p>
            ) : (
              spotlightDonations.map((donation) => (
                <Link key={donation.id} to={`/donations/${donation.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark font-mono">{donation.id}</p>
                  <StatusBadge status={donation.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
