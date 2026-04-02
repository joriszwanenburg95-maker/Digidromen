/**
 * Shared formatting utilities — extracted from portal.ts legacy code.
 * Import from here instead of portal.ts.
 */

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Status-dependent Tailwind classes for badges and indicators. */
export function statusClasses(status: string): string {
  if (
    status === "afgesloten" ||
    status === "geleverd" ||
    status === "verwerkt"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "afgewezen" || status === "geannuleerd" || status === "IRREPARABEL" || status === "failed") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "IN_REPARATIE" || status === "queued") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "retrying") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-sky-100 text-sky-700";
}

/** Human-readable status labels (NL). */
const STATUS_LABELS: Record<string, string> = {
  // order_status (lowercase)
  concept: "Concept",
  ingediend: "Ingediend",
  te_accorderen: "Te accorderen",
  geaccordeerd: "Geaccordeerd",
  in_voorbereiding: "In voorbereiding",
  geleverd: "Geleverd",
  afgesloten: "Afgesloten",
  afgewezen: "Afgewezen",
  // donation_status (lowercase)
  aangemeld: "Aangemeld",
  pickup_gepland: "Ophaal gepland",
  ontvangen: "Ontvangen",
  in_verwerking: "In verwerking",
  verwerkt: "Verwerkt",
  geannuleerd: "Geannuleerd",
  // repair_status (UPPERCASE — unchanged in DB)
  ONTVANGEN: "Ontvangen",
  DIAGNOSE: "Diagnose",
  IN_REPARATIE: "In reparatie",
  TEST: "Test",
  RETOUR: "Retour",
  IRREPARABEL: "Irreparabel",
  AFGESLOTEN: "Afgesloten",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
