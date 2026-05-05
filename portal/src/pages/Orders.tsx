import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Backpack,
  Battery,
  Cable,
  CalendarCheck,
  CheckCircle2,
  Headphones,
  Laptop,
  Mouse,
  Plus,
} from "lucide-react";

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
import { getSurface } from "../lib/roleSurface";
import { useOrderingWindow } from "../hooks/useOrderingWindow";
import StatusBadge from "../components/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Per-role status tab definitions                                    */
/* ------------------------------------------------------------------ */

interface StatusTab {
  key: string;
  label: string;
  /** If set, multiple DB statuses map to this single tab */
  matchStatuses?: string[];
}

const allStatusTabs: StatusTab[] = [
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

const helpOrgStatusTabs: StatusTab[] = [
  { key: "all", label: "Alle" },
  { key: "ingediend", label: "Ingediend" },
  {
    key: "in_behandeling",
    label: "In behandeling",
    matchStatuses: ["te_accorderen", "geaccordeerd", "in_voorbereiding"],
  },
  { key: "geleverd", label: "Geleverd" },
  { key: "afgesloten", label: "Afgesloten" },
];

const servicePartnerStatusTabs: StatusTab[] = [
  { key: "all", label: "Alle" },
  { key: "in_voorbereiding", label: "Voorbereiding" },
  { key: "geleverd", label: "Geleverd" },
  { key: "afgesloten", label: "Afgesloten" },
];

function getStatusTabs(role: Role): StatusTab[] {
  switch (role) {
    case "help_org":
      return helpOrgStatusTabs;
    case "service_partner":
      return servicePartnerStatusTabs;
    default:
      return allStatusTabs;
  }
}

/* ------------------------------------------------------------------ */

const ORDER_CREATOR_ROLES: string[] = [
  "help_org",
  "digidromen_staff",
  "digidromen_admin",
];

const helpOrgProducts = [
  {
    label: "Laptoppakket",
    description: "Voor een kind dat digitaal mee moet kunnen doen.",
    icon: Laptop,
  },
  {
    label: "Adapter",
    description: "Vervanging van een defecte voedingskabel.",
    icon: Cable,
  },
  {
    label: "Rugzak",
    description: "Als de laptoptas ontbreekt of vervangen moet worden.",
    icon: Backpack,
  },
  {
    label: "Accessoires",
    description: "Muis vervangen bij defect of ontbreken.",
    icon: Mouse,
  },
  {
    label: "Headset",
    description: "Vervanging wanneer luisteren of spreken niet lukt.",
    icon: Headphones,
  },
  {
    label: "Powerbank",
    description: "Vervanging van een defecte powerbank.",
    icon: Battery,
  },
] as const;

const HelpOrgOrderPortalHeader: React.FC<{
  total: number;
  activeCount: number;
  deliveredCount: number;
  canOrder: boolean;
  onNewRequest: () => void;
}> = ({ total, activeCount, deliveredCount, canOrder, onNewRequest }) => (
  <section className="overflow-hidden rounded-[32px] border border-digidromen-cream bg-white shadow-sm">
    <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_16%,rgba(255,213,0,0.28),transparent_34%),linear-gradient(135deg,#fff9ea_0%,#fff7ed_58%,#ffffff_100%)] p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-digidromen-orange/12 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-digidromen-orange/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-digidromen-orange">
            Aanvraagportaal
          </div>
          <h2 className="mt-5 max-w-2xl font-heading text-3xl font-semibold leading-tight text-digidromen-dark sm:text-4xl">
            Vraag snel aan wat een kind nodig heeft.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-digidromen-dark/62">
            Kies een laptoppakket of vervangend onderdeel. Digidromen beoordeelt de aanvraag en houdt je aanvraagstatus overzichtelijk bij.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canOrder}
              onClick={onNewRequest}
              className="inline-flex min-h-12 items-center gap-2 rounded-[22px] bg-digidromen-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-digidromen-orange-hover disabled:cursor-not-allowed disabled:bg-digidromen-cream disabled:text-digidromen-dark/35"
            >
              <Plus size={17} />
              Nieuwe aanvraag starten
            </button>
            {!canOrder ? (
              <span className="inline-flex min-h-12 items-center rounded-[22px] border border-digidromen-cream bg-white px-4 text-sm font-semibold text-digidromen-dark/55">
                Bestelvenster gesloten
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Totaal", value: total },
            { label: "Bezig", value: activeCount },
            { label: "Geleverd", value: deliveredCount },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-digidromen-cream bg-digidromen-warm px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-digidromen-dark/42">{item.label}</p>
              <p className="mt-1 font-heading text-2xl font-semibold text-digidromen-dark">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {helpOrgProducts.map(({ label, description, icon: Icon }) => (
            <div key={label} className="flex min-h-[92px] items-start gap-3 rounded-2xl border border-digidromen-cream bg-white p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-digidromen-orange-light text-digidromen-orange">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-digidromen-dark">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-digidromen-dark/55">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const HelpOrgRequestCards: React.FC<{
  orders: OrderListRow[];
  isLoading: boolean;
  emptyLabel: string;
  statusFilter: string;
  onOpen: (id: string) => void;
}> = ({ orders, isLoading, emptyLabel, statusFilter, onOpen }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-3xl border border-digidromen-cream bg-white"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-digidromen-cream bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-digidromen-blue/20 text-digidromen-primary">
          <Laptop size={26} />
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold text-digidromen-dark">
          {statusFilter === "all" ? emptyLabel : "Geen aanvragen met deze status"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-digidromen-dark/55">
          Start een nieuwe aanvraag zodra jullie een laptop of vervangend onderdeel
          nodig hebben. Je ziet hier alleen aanvragen van je eigen organisatie.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => {
        const summary = formatOrderLinesSummary(order.order_lines);
        return (
          <button
            key={order.id}
            type="button"
            onClick={() => onOpen(order.id)}
            className="group flex min-h-[220px] flex-col justify-between rounded-3xl border border-digidromen-cream bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-digidromen-primary/25 hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-digidromen-blue/20 text-digidromen-primary">
                  <Laptop size={21} />
                </div>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-digidromen-dark/40">
                Aanvraag
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-digidromen-primary">
                {order.id.slice(0, 8)}
              </p>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-digidromen-dark/70">
                {summary}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-digidromen-cream pt-4">
              <p className="flex items-center gap-1.5 text-xs text-digidromen-dark/55">
                <CalendarCheck size={14} />
                {order.preferred_delivery_date ?? "Leverdatum volgt"}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-digidromen-orange group-hover:text-digidromen-orange-hover">
                Bekijk
                <ArrowRight size={14} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

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
  const surface = getSurface(role);
  const isHelpOrg = role === "help_org";
  const isServicePartner = role === "service_partner";
  const isStaff = role === "digidromen_admin" || role === "digidromen_staff";

  const statusTabs = useMemo(() => getStatusTabs(role), [role]);

  const { data: displayOrders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => listOrders({ role, organizationId: user?.organizationId }),
    enabled: !!user,
  });

  const { data: pendingApprovalCount = 0 } = useQuery({
    queryKey: ["orders", "te-accorderen-count"] as const,
    queryFn: countAwaitingApproval,
    enabled: isStaff,
  });

  const { data: window } = useOrderingWindow();

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return displayOrders;
    const tab = statusTabs.find((t) => t.key === statusFilter);
    if (tab?.matchStatuses) {
      return displayOrders.filter((o: OrderListRow) =>
        tab.matchStatuses!.includes(o.status),
      );
    }
    return displayOrders.filter((o: OrderListRow) => o.status === statusFilter);
  }, [statusFilter, displayOrders, statusTabs]);

  const canCreateOrder = ORDER_CREATOR_ROLES.includes(role);
  const canOrder = canPlaceOrder(user?.role, window);
  const activeHelpOrgCount = displayOrders.filter((order) =>
    ["ingediend", "te_accorderen", "geaccordeerd", "in_voorbereiding"].includes(order.status),
  ).length;
  const deliveredHelpOrgCount = displayOrders.filter((order) =>
    ["geleverd", "afgesloten"].includes(order.status),
  ).length;

  // Column count per role for skeleton/colSpan
  const showKlant = !isHelpOrg;
  const showPrioriteit = isStaff;
  const tableCols = 4 + (showKlant ? 1 : 0) + (showPrioriteit ? 1 : 0);

  // Labels per role
  const heading = isHelpOrg
    ? "Laptop aanvragen"
    : isServicePartner
      ? surface.orderLabel
      : "Bestellingen";
  const ctaLabel = isHelpOrg ? "Nieuwe aanvraag" : "Bestelling toevoegen";
  const countLabel = isHelpOrg
    ? `${displayOrders.length} aanvragen`
    : `${displayOrders.length} orders`;
  const emptyAllLabel = isHelpOrg
    ? "Nog geen aanvragen. Start een eerste aanvraag."
    : isServicePartner
      ? "Nog geen uitleveringen."
      : "Nog geen bestellingen.";

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

      {isHelpOrg ? (
        <HelpOrgOrderPortalHeader
          total={displayOrders.length}
          activeCount={activeHelpOrgCount}
          deliveredCount={deliveredHelpOrgCount}
          canOrder={canOrder}
          onNewRequest={() => setShowWizard(true)}
        />
      ) : null}

      {!isHelpOrg ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-digidromen-dark">
            {heading}
          </h2>
          <p className="text-sm text-digidromen-dark/60">
            {isLoading ? "Laden..." : countLabel}
          </p>
        </div>
        {canCreateOrder && !isServicePartner ? (
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-[20px] bg-digidromen-yellow px-4 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            {ctaLabel}
          </button>
        ) : null}
        </div>
      ) : null}

      {isHelpOrg ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-digidromen-dark">
          <CheckCircle2 size={16} className="text-digidromen-orange" />
          Je ziet alleen aanvragen van je eigen organisatie.
        </div>
      ) : null}

      {!isHelpOrg ? <OrderingWindowBanner /> : null}

      <div className={`flex gap-1.5 overflow-x-auto rounded-xl p-1 ${isHelpOrg ? "bg-white shadow-sm border border-digidromen-cream" : "bg-digidromen-cream"}`}>
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === tab.key
                ? "bg-surface text-digidromen-dark shadow-sm"
                : "text-digidromen-dark/60 hover:text-digidromen-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isHelpOrg ? (
        <HelpOrgRequestCards
          orders={filteredOrders}
          isLoading={isLoading}
          emptyLabel={emptyAllLabel}
          statusFilter={statusFilter}
          onOpen={(id) => navigate(`/orders/${id}`)}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-digidromen-cream bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-digidromen-cream">
            <thead className="bg-digidromen-cream/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">
                  Bestelde producten
                </th>
                {showKlant ? (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Klant</th>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Status</th>
                {showPrioriteit ? (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Prioriteit</th>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Gewenste leverdatum</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-digidromen-cream bg-surface">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonTableRow key={index} cols={tableCols} />
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={tableCols} className="px-6 py-12 text-center text-sm text-digidromen-dark/40">
                    {statusFilter === "all"
                      ? emptyAllLabel
                      : "Geen bestellingen met deze status. Kies 'Alle' om het volledige overzicht te zien."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const orgName = order.organizations?.name ?? "Onbekend";
                  const displayPriority = order.priority;
                  const displayDate = order.preferred_delivery_date ?? "-";
                  const summary = formatOrderLinesSummary(order.order_lines);

                  return (
                    <tr key={order.id} className="hover:bg-digidromen-cream/30">
                      <td className="max-w-[140px] px-6 py-4 text-sm font-mono font-semibold text-digidromen-orange">
                        <span className="break-all">{order.id}</span>
                      </td>
                      <td className="max-w-md px-6 py-4 text-sm text-digidromen-dark/80">{summary}</td>
                      {showKlant ? (
                        <td className="px-6 py-4 text-sm text-digidromen-dark/60">{orgName}</td>
                      ) : null}
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      {showPrioriteit ? (
                        <td className="px-6 py-4 text-sm text-digidromen-dark/60">{displayPriority}</td>
                      ) : null}
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{displayDate}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-orange hover:text-digidromen-orange-hover"
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
      )}

      {showWizard ? <OrderWizard onClose={() => setShowWizard(false)} /> : null}
    </div>
  );
};

export default Orders;
