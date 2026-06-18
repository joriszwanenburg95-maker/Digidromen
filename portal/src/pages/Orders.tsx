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
import type { ProductScenario } from "../lib/productRules";
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

// Beheerder/medewerker: actiegerichte inbox. Concepten (niet-ingediende drafts)
// worden niet getoond — daar valt niets te beoordelen.
const allStatusTabs: StatusTab[] = [
  { key: "te_beoordelen", label: "Te beoordelen", matchStatuses: ["ingediend", "te_accorderen"] },
  { key: "goedgekeurd", label: "Goedgekeurd", matchStatuses: ["geaccordeerd", "in_voorbereiding"] },
  { key: "geleverd", label: "Geleverd" },
  { key: "afgerond", label: "Afgerond", matchStatuses: ["afgesloten"] },
  { key: "afgewezen", label: "Afgewezen" },
  { key: "all", label: "Alle" },
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

const helpOrgProducts: ReadonlyArray<{
  label: string;
  description: string;
  icon: typeof Laptop;
  scenario: ProductScenario;
}> = [
  {
    label: "Laptoppakket",
    description: "Voor een kind dat digitaal mee moet kunnen doen.",
    icon: Laptop,
    scenario: "new_request",
  },
  {
    label: "Voedingskabel",
    description: "Vervanging van een defecte voedingskabel of adapter.",
    icon: Cable,
    scenario: "cable_replacement",
  },
  {
    label: "Rugzak",
    description: "Als de laptoptas ontbreekt of vervangen moet worden.",
    icon: Backpack,
    scenario: "backpack_replacement",
  },
  {
    label: "Muis",
    description: "Muis vervangen bij defect of ontbreken.",
    icon: Mouse,
    scenario: "mouse_replacement",
  },
  {
    label: "Headset",
    description: "Vervanging wanneer luisteren of spreken niet lukt.",
    icon: Headphones,
    scenario: "headset_replacement",
  },
  {
    label: "Powerbank",
    description: "Vervanging van een defecte powerbank.",
    icon: Battery,
    scenario: "powerbank_replacement",
  },
];

const HelpOrgOrderPortalHeader: React.FC<{
  thisMonthCount: number;
  activeCount: number;
  canOrder: boolean;
  onNewRequest: () => void;
  onPickProduct: (scenario: ProductScenario) => void;
}> = ({ thisMonthCount, activeCount, canOrder, onNewRequest, onPickProduct }) => {
  const newProduct = helpOrgProducts.find((p) => p.scenario === "new_request");
  const replacements = helpOrgProducts.filter((p) => p.scenario !== "new_request");

  const ProductTile = ({
    label,
    description,
    icon: Icon,
    scenario,
    wide,
  }: (typeof helpOrgProducts)[number] & { wide?: boolean }) => (
    <button
      type="button"
      disabled={!canOrder}
      onClick={() => onPickProduct(scenario)}
      className={`group flex items-start gap-3 rounded-2xl border border-digidromen-cream bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-digidromen-orange/30 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
        wide ? "min-h-[96px] w-full sm:items-center" : "min-h-[104px]"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl ${
          wide ? "size-14" : "size-11"
        } ${scenario === "new_request" ? "bg-digidromen-yellow/35 text-digidromen-dark" : "bg-digidromen-orange-light text-digidromen-orange"}`}
      >
        <Icon size={wide ? 26 : 20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-semibold text-digidromen-dark ${wide ? "text-base" : "text-sm"}`}>{label}</p>
          {scenario === "new_request" ? (
            <span className="shrink-0 rounded-full bg-digidromen-yellow/40 px-2 py-0.5 text-[10px] font-semibold text-digidromen-dark">
              Meest gekozen
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-digidromen-dark/55">{description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-digidromen-orange group-hover:text-digidromen-orange-hover">
          Bestellen
          <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );

  return (
    <section className="overflow-hidden rounded-[32px] border border-digidromen-cream bg-white shadow-sm">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_16%,rgba(255,213,0,0.28),transparent_34%),linear-gradient(135deg,#fff9ea_0%,#fff7ed_58%,#ffffff_100%)] p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-digidromen-orange/12 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-digidromen-orange/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-digidromen-orange">
              Digidromen webshop
            </div>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl font-semibold leading-tight text-digidromen-dark sm:text-4xl">
              Kies wat een kind nodig heeft.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-digidromen-dark/62">
              Klik op een product om te bestellen. Digidromen beoordeelt je aanvraag
              en je volgt de status hieronder.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[240px]">
            {[
              { label: "Deze maand besteld", value: thisMonthCount },
              { label: "In behandeling", value: activeCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-digidromen-cream bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-digidromen-dark/42">{item.label}</p>
                <p className="mt-1 font-heading text-2xl font-semibold text-digidromen-dark">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 border-t border-digidromen-cream p-5 sm:p-6">
        {!canOrder ? (
          <span className="inline-flex items-center rounded-full border border-digidromen-cream bg-digidromen-warm px-3 py-1 text-xs font-semibold text-digidromen-dark/55">
            Bestelvenster gesloten
          </span>
        ) : null}

        {/* Blok 1 — Nieuwe bestelling */}
        {newProduct ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-digidromen-yellow/40 text-[11px] font-bold text-digidromen-dark">1</span>
              <p className="text-sm font-semibold text-digidromen-dark">Nieuwe bestelling</p>
            </div>
            <ProductTile {...newProduct} wide />
          </div>
        ) : null}

        {/* Blok 2 — Vervanging */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-digidromen-orange-light text-[11px] font-bold text-digidromen-orange">2</span>
            <p className="text-sm font-semibold text-digidromen-dark">Vervanging van een onderdeel</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {replacements.map((product) => (
              <ProductTile key={product.label} {...product} />
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!canOrder}
          onClick={onNewRequest}
          className="inline-flex min-h-11 items-center gap-2 rounded-[20px] border border-digidromen-cream bg-white px-4 py-2 text-sm font-semibold text-digidromen-dark transition-all hover:border-digidromen-orange/30 hover:bg-digidromen-warm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} />
          Liever zelf kiezen? Start een lege aanvraag
        </button>
      </div>
    </section>
  );
};

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
  const role: Role = (user?.role as Role) ?? "help_org";
  const surface = getSurface(role);
  const isHelpOrg = role === "help_org";
  const isServicePartner = role === "service_partner";
  const isStaff = role === "digidromen_admin" || role === "digidromen_staff";
  // Beheerder/medewerker landen op de actie-inbox; overige rollen op "Alle".
  const defaultStatusTab = isStaff ? "te_beoordelen" : "all";

  const [showWizard, setShowWizard] = useState(false);
  const [wizardScenario, setWizardScenario] = useState<ProductScenario | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get("status") ?? defaultStatusTab,
  );

  useEffect(() => {
    setStatusFilter(searchParams.get("status") ?? defaultStatusTab);
  }, [searchParams, defaultStatusTab]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowWizard(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const statusTabs = useMemo(() => getStatusTabs(role), [role]);

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => listOrders({ role, organizationId: user?.organizationId }),
    enabled: !!user,
  });

  // Concepten (niet-ingediende drafts) tonen we niet aan beheerder/medewerker.
  const displayOrders = useMemo(
    () => (isHelpOrg ? allOrders : allOrders.filter((o: OrderListRow) => o.status !== "concept")),
    [allOrders, isHelpOrg],
  );

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
  const now = new Date();
  const thisMonthHelpOrgCount = displayOrders.filter((order) => {
    if (!order.created_at) return false;
    const created = new Date(order.created_at);
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    );
  }).length;

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
            <strong>Ingediend</strong>. Open de bestelling en kies{" "}
            <strong>Accorderen</strong> of <strong>Afwijzen</strong>.
          </p>
          <button
            type="button"
            onClick={() => setFilter("te_beoordelen")}
            className="mt-2 text-sm font-semibold text-amber-900 underline hover:no-underline"
          >
            Toon alleen in te dienen bestellingen →
          </button>
        </div>
      ) : null}

      {isHelpOrg ? (
        <HelpOrgOrderPortalHeader
          thisMonthCount={thisMonthHelpOrgCount}
          activeCount={activeHelpOrgCount}
          canOrder={canOrder}
          onNewRequest={() => {
            setWizardScenario(null);
            setShowWizard(true);
          }}
          onPickProduct={(scenario) => {
            setWizardScenario(scenario);
            setShowWizard(true);
          }}
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

      {/* Banner self-gate't intern op help_org; toon hem dus op de webshoppagina. */}
      <OrderingWindowBanner />

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
            {tab.key === "te_beoordelen" && pendingApprovalCount > 0 ? (
              <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-digidromen-orange px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {pendingApprovalCount}
              </span>
            ) : null}
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

      {showWizard ? (
        <OrderWizard
          initialScenario={wizardScenario}
          onClose={() => {
            setShowWizard(false);
            setWizardScenario(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default Orders;
