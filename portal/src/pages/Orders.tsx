import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { OrderWizard } from "../components/wizard/OrderWizard";
import { OrderingWindowBanner } from "../components/OrderingWindowBanner";
import { SkeletonTableRow } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { canPlaceOrder } from "../lib/canPlaceOrder";
import {
  countAwaitingApproval,
  listOrders,
  type OrderListRow,
} from "../lib/data/orders";
import { formatOrderLinesSummary } from "../lib/orderSummary";
import { queryKeys } from "../lib/queryKeys";
import type { Role } from "../lib/workflow";
import { useOrderingWindow } from "../hooks/useOrderingWindow";
import StatusBadge from "../components/StatusBadge";

const statusTabs = [
  { key: "all", label: "Alle" },
  { key: "concept", label: "Concept" },
  { key: "ingediend", label: "Ingediend" },
  { key: "te_accorderen", label: "Te accorderen" },
  { key: "geaccordeerd", label: "Geaccordeerd" },
  { key: "in_voorbereiding", label: "Voorbereiding" },
  { key: "geleverd", label: "Geleverd" },
  { key: "afgesloten", label: "Afgesloten" },
  { key: "afgewezen", label: "Afgewezen" },
];

const ORDER_CREATOR_ROLES: string[] = [
  "help_org",
  "digidromen_staff",
  "digidromen_admin",
];

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get("status") ?? "all",
  );

  useEffect(() => {
    setStatusFilter(searchParams.get("status") ?? "all");
  }, [searchParams]);

  const role: Role = (user?.role as Role) ?? "help_org";

  const { data: displayOrders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => listOrders({ role, organizationId: user?.organizationId }),
    enabled: !!user,
  });

  const isStaff = role === "digidromen_admin" || role === "digidromen_staff";

  const { data: pendingApprovalCount = 0 } = useQuery({
    queryKey: ["orders", "te-accorderen-count"] as const,
    queryFn: countAwaitingApproval,
    enabled: isStaff,
  });

  const { data: window } = useOrderingWindow();

  const filteredOrders = statusFilter === "all"
    ? displayOrders
    : displayOrders.filter((o: OrderListRow) => o.status === statusFilter);
  const canCreateOrder = ORDER_CREATOR_ROLES.includes(role);
  const canOrder = canPlaceOrder(user?.role, window);
  const isHelpOrg = role === "help_org";
  const tableCols = isHelpOrg ? 5 : 7;

  const setFilter = (key: string) => {
    if (key === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      {isStaff && pendingApprovalCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Accordering nodig</p>
          <p className="mt-1 text-amber-900/90">
            Er {pendingApprovalCount === 1 ? "staat" : "staan"}{" "}
            <strong>{pendingApprovalCount}</strong>{" "}
            {pendingApprovalCount === 1 ? "bestelling" : "bestellingen"} met status{" "}
            <strong>Te accorderen</strong>. Open de bestelling en kies onderaan{" "}
            <strong>Accorderen</strong> of <strong>Afwijzen</strong> (na eventueel eerst{" "}
            <strong>Ter accordering</strong> bij status &quot;Ingediend&quot;).
          </p>
          <button
            type="button"
            onClick={() => setFilter("te_accorderen")}
            className="mt-2 text-sm font-semibold text-amber-900 underline hover:no-underline"
          >
            Toon alleen te accorderen bestellingen →
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isHelpOrg ? "Laptop aanvragen" : "Bestellingen"}
          </h2>
          <p className="text-sm text-slate-500">
            {isLoading
              ? "Laden..."
              : isHelpOrg
                ? `${displayOrders.length} aanvragen`
                : `${displayOrders.length} orders`}
          </p>
        </div>
        {canCreateOrder ? (
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            {isHelpOrg ? "Nieuwe aanvraag" : "Bestelling toevoegen"}
          </button>
        ) : null}
      </div>

      {isHelpOrg ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Kies <strong>Nieuwe aanvraag</strong> om een laptoppakket of vervangend onderdeel aan te vragen. Je ziet hier alleen aanvragen van je eigen organisatie.
        </div>
      ) : null}

      <OrderingWindowBanner />

      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bestelde producten
              </th>
              {!isHelpOrg ? (
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Klant</th>
              ) : null}
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              {!isHelpOrg ? (
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prioriteit</th>
              ) : null}
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gewenste leverdatum</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <SkeletonTableRow key={index} cols={tableCols} />
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={tableCols} className="px-6 py-12 text-center text-sm text-slate-400">
                  {statusFilter === "all"
                    ? "Nog geen bestellingen."
                    : "Geen bestellingen met deze status. Kies ‘Alle’ om het volledige overzicht te zien."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const orgName = order.organizations?.name ?? "Onbekend";
                const displayPriority = order.priority;
                const displayDate = order.preferred_delivery_date ?? "-";
                const summary = formatOrderLinesSummary(order.order_lines);

                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="max-w-[140px] px-6 py-4 text-sm font-mono font-semibold text-sky-700">
                      <span className="break-all">{order.id}</span>
                    </td>
                    <td className="max-w-md px-6 py-4 text-sm text-slate-700">{summary}</td>
                    {!isHelpOrg ? (
                      <td className="px-6 py-4 text-sm text-slate-600">{orgName}</td>
                    ) : null}
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    {!isHelpOrg ? (
                      <td className="px-6 py-4 text-sm text-slate-600">{displayPriority}</td>
                    ) : null}
                    <td className="px-6 py-4 text-sm text-slate-600">{displayDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-primary hover:bg-sky-50"
                      >
                        Bekijken
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showWizard ? <OrderWizard onClose={() => setShowWizard(false)} /> : null}
    </div>
  );
};

export default Orders;
