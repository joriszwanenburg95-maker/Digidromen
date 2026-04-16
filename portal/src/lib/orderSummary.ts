/** Minimale velden voor een leesbare bestelregel in lijsten en detail. */
export type OrderLineSummaryInput = {
  quantity: number;
  line_type?: string | null;
  rma_category?: string | null;
  products?: { name?: string | null } | null;
};

const LINE_TYPE_LABEL: Record<string, string> = {
  new_request: "Nieuwe aanvraag",
  rma_defect: "Vervanging",
};

const RMA_LABEL: Record<string, string> = {
  laptop: "laptop",
  voedingskabel: "voedingskabel",
  powerbank: "powerbank",
  muis: "muis",
  rugzak: "rugzak",
  headset: "headset",
};

function lineSubtitle(line: OrderLineSummaryInput): string {
  const parts: string[] = [];
  if (line.line_type && line.line_type !== "regular") {
    parts.push(LINE_TYPE_LABEL[line.line_type] ?? line.line_type);
  }
  if (line.rma_category) {
    parts.push(RMA_LABEL[line.rma_category] ?? line.rma_category);
  }
  return parts.join(" · ");
}

/** Korte tekst voor tabellen, bv. "2× Laptoppakket 6-12 · 1× Voedingskabel" */
export function formatOrderLinesSummary(
  lines: OrderLineSummaryInput[] | null | undefined,
): string {
  if (!lines?.length) {
    return "—";
  }
  return lines
    .map((line) => {
      const name =
        line.products?.name?.trim() || "Product (onbekend)";
      return `${line.quantity}× ${name}`;
    })
    .join(" · ");
}

/** Titelregel voor detail: één regel per product met optionele toelichting */
export function formatOrderLineDetailLabel(line: OrderLineSummaryInput): {
  title: string;
  subtitle: string | null;
} {
  const name = line.products?.name?.trim() || "Product (onbekend)";
  const title = `${line.quantity}× ${name}`;
  const sub = lineSubtitle(line);
  return { title, subtitle: sub || null };
}
