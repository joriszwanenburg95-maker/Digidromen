import type { DonationBatch, Order, PortalData, RepairCase } from "../contracts";

function quote(value: string | number | undefined): string {
  const normalized = value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function row(values: Array<string | number | undefined>): string {
  return values.map((value) => quote(value)).join(",");
}

export function exportOrdersCsv(data: PortalData): string {
  const header = row([
    "id",
    "organisatie",
    "status",
    "prioriteit",
    "leverdatum",
    "regels",
  ]);
  const rows = Object.values(data.orders).map((item: Order) =>
    row([
      item.id,
      data.organizations[item.organizationId]?.name,
      item.status,
      item.priority,
      item.preferredDeliveryDate,
      item.lineItems.length,
    ]),
  );
  return [header, ...rows].join("\n");
}

export function exportRepairsCsv(data: PortalData): string {
  const header = row([
    "id",
    "organisatie",
    "status",
    "subtype",
    "serienummer",
    "issueType",
  ]);
  const rows = Object.values(data.repairs).map((item: RepairCase) =>
    row([
      item.id,
      data.organizations[item.organizationId]?.name,
      item.status,
      item.subtype,
      item.serialNumber,
      item.issueType,
    ]),
  );
  return [header, ...rows].join("\n");
}

export function exportDonationsCsv(data: PortalData): string {
  const header = row([
    "id",
    "sponsor",
    "status",
    "deviceCountPromised",
    "refurbishReadyCount",
    "rejectedCount",
  ]);
  const rows = Object.values(data.donations).map((item: DonationBatch) =>
    row([
      item.id,
      data.organizations[item.sponsorOrganizationId]?.name,
      item.status,
      item.deviceCountPromised,
      item.refurbishReadyCount,
      item.rejectedCount,
    ]),
  );
  return [header, ...rows].join("\n");
}
