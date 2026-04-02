import React from "react";

const STATUS_STYLES: Record<string, string> = {
  // Orders (lowercase)
  concept: "bg-slate-50 text-slate-600 ring-slate-500/20",
  ingediend: "bg-blue-50 text-blue-700 ring-blue-600/20",
  te_accorderen: "bg-amber-50 text-amber-700 ring-amber-600/20",
  geaccordeerd: "bg-amber-50 text-amber-700 ring-amber-600/20",
  in_voorbereiding: "bg-violet-50 text-violet-700 ring-violet-600/20",
  geleverd: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  afgesloten: "bg-slate-50 text-slate-600 ring-slate-500/20",
  afgewezen: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // Repairs (UPPERCASE — unchanged in DB)
  ONTVANGEN: "bg-blue-50 text-blue-700 ring-blue-600/20",
  DIAGNOSE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_REPARATIE: "bg-violet-50 text-violet-700 ring-violet-600/20",
  TEST: "bg-sky-50 text-sky-700 ring-sky-600/20",
  RETOUR: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  IRREPARABEL: "bg-rose-50 text-rose-700 ring-rose-600/20",
  AFGESLOTEN: "bg-slate-50 text-slate-600 ring-slate-500/20",
  // Donations (lowercase)
  aangemeld: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pickup_gepland: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ontvangen: "bg-sky-50 text-sky-700 ring-sky-600/20",
  in_verwerking: "bg-violet-50 text-violet-700 ring-violet-600/20",
  verwerkt: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  geannuleerd: "bg-rose-50 text-rose-700 ring-rose-600/20",
  // CRM sync states
  synced: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  queued: "bg-blue-50 text-blue-700 ring-blue-600/20",
  retrying: "bg-violet-50 text-violet-700 ring-violet-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const STATUS_LABELS: Record<string, string> = {
  // Orders (lowercase)
  concept: "Concept",
  ingediend: "Ingediend",
  te_accorderen: "Te accorderen",
  geaccordeerd: "Geaccordeerd",
  in_voorbereiding: "In voorbereiding",
  geleverd: "Geleverd",
  afgesloten: "Afgesloten",
  afgewezen: "Afgewezen",
  // Repairs (UPPERCASE — unchanged in DB)
  ONTVANGEN: "Ontvangen",
  DIAGNOSE: "Diagnose",
  IN_REPARATIE: "In reparatie",
  TEST: "Test",
  RETOUR: "Retour",
  IRREPARABEL: "Irreparabel",
  AFGESLOTEN: "Afgesloten",
  // Donations (lowercase)
  aangemeld: "Aangemeld",
  pickup_gepland: "Ophaal gepland",
  ontvangen: "Ontvangen",
  in_verwerking: "In verwerking",
  verwerkt: "Verwerkt",
  geannuleerd: "Geannuleerd",
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
