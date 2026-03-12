import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, RefreshCw, TriangleAlert } from "lucide-react";

import { formatDateTime, usePortalContext } from "../lib/portal";

const Dashboard: React.FC = () => {
  const { snapshot, user, orders, repairs, donations, notifications } = usePortalContext();

  const spotlightOrders = orders.slice(0, 3);
  const spotlightRepairs = repairs.slice(0, 3);
  const spotlightDonations = donations.slice(0, 3);
  const recentDocs = Object.values(snapshot.data.documents)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);

  const cards =
    snapshot.role === "help_org"
      ? [
          { label: "Open bestellingen", value: String(orders.filter((item) => !["AFGESLOTEN", "GEANNULEERD"].includes(item.status)).length), color: "bg-sky-500" },
          { label: "Open reparaties", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length), color: "bg-orange-500" },
          { label: "Open documenten", value: String(recentDocs.length), color: "bg-emerald-500" },
          { label: "Nieuwe meldingen", value: String(notifications.filter((item) => item.status === "unread").length), color: "bg-violet-500" },
        ]
      : snapshot.role === "service_partner"
        ? [
            { label: "Open repairs", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length), color: "bg-orange-500" },
            { label: "Pickup batches", value: String(donations.filter((item) => item.status !== "OP_VOORRAAD").length), color: "bg-emerald-500" },
            { label: "Te leveren orders", value: String(orders.filter((item) => item.status === "IN_VOORBEREIDING" || item.status === "VERZONDEN").length), color: "bg-sky-500" },
            { label: "Queue alerts", value: String(snapshot.metrics.syncHealth.queued + snapshot.metrics.syncHealth.failed), color: "bg-violet-500" },
          ]
        : [
            { label: "Open orders", value: String(snapshot.metrics.openOrders), color: "bg-sky-500" },
            { label: "Open repairs", value: String(snapshot.metrics.openRepairs), color: "bg-orange-500" },
            { label: "Open donations", value: String(snapshot.metrics.openDonations), color: "bg-emerald-500" },
            { label: "CRM failures", value: String(snapshot.metrics.syncHealth.failed), color: "bg-rose-500" },
          ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welkom terug, {user?.name}</h2>
          <p className="text-sm text-slate-500">
            Actieve rol: <span className="font-semibold">{snapshot.role}</span>
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
            <div className={`h-1 w-12 mt-4 rounded ${stat.color}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Recente activiteit</h3>
          <div className="space-y-4">
            {Object.values(snapshot.data.workflowEvents)
              .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
              .slice(0, 6)
              .map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-900">{event.summary}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.subjectType} • {event.subjectId}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Snelle routes</h3>
            <div className="grid gap-3">
              {[
                { label: "Bestellingen", route: "/orders", description: `${orders.length} records zichtbaar` },
                { label: "Reparaties", route: "/repairs", description: `${repairs.length} records zichtbaar` },
                { label: "Donaties", route: "/donations", description: `${donations.length} records zichtbaar` },
                { label: "CRM Sync", route: "/crm-sync", description: `${snapshot.metrics.syncHealth.failed} failures / ${snapshot.metrics.syncHealth.queued} queued` },
              ]
                .filter((item) => item.route !== "/crm-sync" || snapshot.role !== "help_org")
                .filter((item) => item.route !== "/donations" || snapshot.role !== "help_org")
                .map((item) => (
                  <Link
                    key={item.route}
                    to={item.route}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                  </Link>
                ))}
          </div>
        </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Signalen</h3>
            <div className="space-y-3">
              {snapshot.metrics.syncHealth.failed > 0 ? (
                <Link to="/crm-sync" className="flex items-start rounded-xl bg-rose-50 p-4 text-rose-700">
                  <TriangleAlert size={18} className="mr-3 mt-0.5" />
                  <div>
                    <p className="font-semibold">CRM sync heeft failures</p>
                    <p className="text-sm">{snapshot.metrics.syncHealth.failed} cases wachten op retry.</p>
                  </div>
                </Link>
              ) : null}

              {snapshot.metrics.lowStockProducts.slice(0, 2).map((product) => (
                <div key={product.productId} className="flex items-start rounded-xl bg-amber-50 p-4 text-amber-700">
                  <RefreshCw size={18} className="mr-3 mt-0.5" />
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm">Beschikbaar: {product.availableQuantity}</p>
                  </div>
                </div>
              ))}

              {recentDocs.length > 0 ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center">
                    <FileText size={16} className="mr-2 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">Recente documenten</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Orders</h3>
          <div className="space-y-3">
            {spotlightOrders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{order.id}</p>
                <p className="text-sm text-slate-500">{order.status}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Repairs</h3>
          <div className="space-y-3">
            {spotlightRepairs.map((repair) => (
              <Link key={repair.id} to={`/repairs/${repair.id}`} className="block rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{repair.id}</p>
                <p className="text-sm text-slate-500">{repair.status}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Donations</h3>
          <div className="space-y-3">
            {spotlightDonations.map((donation) => (
              <Link key={donation.id} to={`/donations/${donation.id}`} className="block rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{donation.id}</p>
                <p className="text-sm text-slate-500">{donation.status}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
