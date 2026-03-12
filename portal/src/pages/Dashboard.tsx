import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, RefreshCw, ShoppingCart, TriangleAlert, Wrench, HeartHandshake } from "lucide-react";

import { formatDateTime, usePortalContext } from "../lib/portal";
import { getCrmPreparationSummary } from "../lib/crm-preparation";

type DashboardListItem = {
  id: string;
  status: string;
};

type DashboardEvent = {
  id: string;
  summary: string;
  createdAt: string;
  subjectType: string;
  subjectId: string;
};

type DashboardDocument = {
  id: string;
  createdAt: string;
  fileName: string;
};

const Dashboard: React.FC = () => {
  const { snapshot, user, orders, repairs, donations, notifications } = usePortalContext();
  const crmPreparation = getCrmPreparationSummary(snapshot.data);

  const spotlightOrders = (orders as DashboardListItem[]).slice(0, 3);
  const spotlightRepairs = (repairs as DashboardListItem[]).slice(0, 3);
  const spotlightDonations = (donations as DashboardListItem[]).slice(0, 3);
  const recentDocs = (Object.values(snapshot.data.documents) as DashboardDocument[])
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
    .slice(0, 4);
  const recentEvents = (Object.values(snapshot.data.workflowEvents) as DashboardEvent[])
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
    .slice(0, 6);

  const cards =
    snapshot.role === "help_org"
      ? [
          { label: "Open bestellingen", value: String(orders.filter((item) => !["AFGESLOTEN", "GEANNULEERD"].includes(item.status)).length), icon: ShoppingCart, accent: "bg-digidromen-primary" },
          { label: "Open reparaties", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length), icon: Wrench, accent: "bg-amber-500" },
          { label: "Documenten", value: String(recentDocs.length), icon: FileText, accent: "bg-emerald-500" },
          { label: "Meldingen", value: String(notifications.filter((item) => item.status === "unread").length), icon: RefreshCw, accent: "bg-digidromen-secondary" },
        ]
      : snapshot.role === "service_partner"
        ? [
            { label: "Open repairs", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length), icon: Wrench, accent: "bg-amber-500" },
            { label: "Pickup batches", value: String(donations.filter((item) => item.status !== "OP_VOORRAAD").length), icon: HeartHandshake, accent: "bg-emerald-500" },
            { label: "Te leveren", value: String(orders.filter((item) => item.status === "IN_VOORBEREIDING" || item.status === "VERZONDEN").length), icon: ShoppingCart, accent: "bg-digidromen-primary" },
            { label: "CRM queue", value: String(crmPreparation.openQueueCount), icon: RefreshCw, accent: "bg-digidromen-secondary" },
          ]
        : [
            { label: "Open orders", value: String(snapshot.metrics.openOrders), icon: ShoppingCart, accent: "bg-digidromen-primary" },
            { label: "Open repairs", value: String(snapshot.metrics.openRepairs), icon: Wrench, accent: "bg-amber-500" },
            { label: "Open donations", value: String(snapshot.metrics.openDonations), icon: HeartHandshake, accent: "bg-emerald-500" },
            { label: "CRM referenties", value: String(crmPreparation.preparedReferenceCount), icon: RefreshCw, accent: "bg-digidromen-secondary" },
          ];

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

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-digidromen-cream bg-white p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.accent}/15`}>
                  <Icon size={18} className={`${stat.accent.replace("bg-", "text-")}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-digidromen-dark">{stat.value}</p>
              <p className="mt-0.5 text-xs font-medium text-digidromen-dark/50">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent activity */}
        <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
          <h3 className="mb-4 text-base font-bold text-digidromen-dark">Recente activiteit</h3>
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-digidromen-dark/30">Nog geen activiteit.</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-digidromen-cream/80 p-3.5 transition-colors hover:bg-digidromen-cream/40">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-digidromen-dark">{event.summary}</p>
                    <p className="shrink-0 text-[11px] text-digidromen-dark/35">{formatDateTime(event.createdAt)}</p>
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
          {/* Quick routes */}
          <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-digidromen-dark">Snelle routes</h3>
            <div className="grid gap-2">
              {[
                { label: "Bestellingen", route: "/orders", description: `${orders.length} records`, icon: ShoppingCart },
                { label: "Reparaties", route: "/repairs", description: `${repairs.length} records`, icon: Wrench },
                { label: "Donaties", route: "/donations", description: `${donations.length} records`, icon: HeartHandshake },
                { label: "CRM voorbereiding", route: "/crm-sync", description: `${crmPreparation.preparedReferenceCount} referenties`, icon: RefreshCw },
              ]
                .filter((item) => item.route !== "/crm-sync" || snapshot.role !== "help_org")
                .filter((item) => item.route !== "/donations" || snapshot.role !== "help_org")
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

          {/* Signals */}
          <div className="rounded-2xl border border-digidromen-cream bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-digidromen-dark">Signalen</h3>
            <div className="space-y-2.5">
              <Link to="/crm-sync" className="flex items-start gap-3 rounded-xl bg-digidromen-orange-light p-3.5">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-digidromen-primary" />
                <div>
                  <p className="text-sm font-semibold text-digidromen-dark">CRM-koppeling staat geparkeerd</p>
                  <p className="text-xs text-digidromen-dark/50">
                    {crmPreparation.openQueueCount} queue-items, {crmPreparation.preparedReferenceCount} referenties
                  </p>
                </div>
              </Link>

              {snapshot.metrics.lowStockProducts.slice(0, 2).map((product) => (
                <div key={product.productId} className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5">
                  <RefreshCw size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-digidromen-dark">{product.name}</p>
                    <p className="text-xs text-digidromen-dark/50">Beschikbaar: {product.availableQuantity}</p>
                  </div>
                </div>
              ))}

              {recentDocs.length > 0 ? (
                <div className="rounded-xl bg-digidromen-cream/60 p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-digidromen-dark/40" />
                    <p className="text-xs font-semibold text-digidromen-dark">Recente documenten</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-digidromen-dark/50">
                    {recentDocs.map((document) => (
                      <p key={document.id}>{document.fileName}</p>
                    ))}
                  </div>
                </div>
              ) : null}
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
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Nog geen bestellingen.</p>
            ) : (
              spotlightOrders.map((order) => (
                <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark">{order.id}</p>
                  <p className="text-xs text-digidromen-dark/40">{order.status}</p>
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
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Nog geen reparaties.</p>
            ) : (
              spotlightRepairs.map((repair) => (
                <Link key={repair.id} to={`/repairs/${repair.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark">{repair.id}</p>
                  <p className="text-xs text-digidromen-dark/40">{repair.status}</p>
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
              <p className="py-4 text-center text-sm text-digidromen-dark/30">Nog geen donaties.</p>
            ) : (
              spotlightDonations.map((donation) => (
                <Link key={donation.id} to={`/donations/${donation.id}`} className="block rounded-xl bg-digidromen-cream/50 p-3 transition-colors hover:bg-digidromen-cream">
                  <p className="text-sm font-semibold text-digidromen-dark">{donation.id}</p>
                  <p className="text-xs text-digidromen-dark/40">{donation.status}</p>
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
