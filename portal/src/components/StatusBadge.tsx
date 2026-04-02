import React from "react";

const STATUS_STYLES: Record<string, string> = {
  // Orders
  INGEDIEND: "bg-blue-50 text-blue-700 ring-blue-600/20",
  BEOORDEELD: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_BEHANDELING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_VOORBEREIDING: "bg-violet-50 text-violet-700 ring-violet-600/20",
  VERZONDEN: "bg-sky-50 text-sky-700 ring-sky-600/20",
  GELEVERD: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  AFGESLOTEN: "bg-slate-50 text-slate-600 ring-slate-500/20",
  GEANNULEERD: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Repairs
  ONTVANGEN: "bg-blue-50 text-blue-700 ring-blue-600/20",
  DIAGNOSE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_REPARATIE: "bg-violet-50 text-violet-700 ring-violet-600/20",
  TEST: "bg-sky-50 text-sky-700 ring-sky-600/20",
  RETOUR: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  IRREPARABEL: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Donations
  TOEGEZEGD: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OPHAALAFSPRAAK_GEPLAND: "bg-amber-50 text-amber-700 ring-amber-600/20",
  OPGEHAALD: "bg-sky-50 text-sky-700 ring-sky-600/20",
  AANGEKOMEN_WAREHOUSE: "bg-violet-50 text-violet-700 ring-violet-600/20",
  IN_VERWERKING: "bg-violet-50 text-violet-700 ring-violet-600/20",
  RAPPORTAGE_GEREED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  OP_VOORRAAD: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  // CRM sync states
  synced: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  queued: "bg-blue-50 text-blue-700 ring-blue-600/20",
  retrying: "bg-violet-50 text-violet-700 ring-violet-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const STATUS_LABELS: Record<string, string> = {
  INGEDIEND: "Ingediend",
  BEOORDEELD: "Beoordeeld",
  IN_BEHANDELING: "In behandeling",
  IN_VOORBEREIDING: "In voorbereiding",
  VERZONDEN: "Verzonden",
  GELEVERD: "Geleverd",
  AFGESLOTEN: "Afgesloten",
  GEANNULEERD: "Geannuleerd",
  ONTVANGEN: "Ontvangen",
  DIAGNOSE: "Diagnose",
  IN_REPARATIE: "In reparatie",
  TEST: "Test",
  RETOUR: "Retour",
  IRREPARABEL: "Irreparabel",
  TOEGEZEGD: "Toegezegd",
  OPHAALAFSPRAAK_GEPLAND: "Ophaal gepland",
  OPGEHAALD: "Opgehaald",
  AANGEKOMEN_WAREHOUSE: "Warehouse",
  IN_VERWERKING: "In verwerking",
  RAPPORTAGE_GEREED: "Rapportage gereed",
  OP_VOORRAAD: "Op voorraad",
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const styles = STATUS_STYLES[status] ?? "bg-slate-50 text-slate-600 ring-slate-500/20";
  const label = STATUS_LABELS[status] ?? status;
  const sizeClasses = size === "sm"
    ? "px-2.5 py-0.5 text-[11px]"
    : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${styles} ${sizeClasses}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
