import type { Role } from "../types";

export const roleLabels: Record<Role, string> = {
  help_org: "Hulporganisatie",
  digidromen_staff: "Digidromen Medewerker",
  digidromen_admin: "Digidromen Beheerder",
  service_partner: "Servicepartner",
};

export function formatStatus(_subjectType: "order" | "repair" | "donation", status: string): string {
  return status;
}

export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sortEvents<T extends { createdAt: string }>(events: T[]): T[] {
  return [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function unreadCount(notifications: Array<{ status?: string }>): number {
  return notifications.filter((item) => item.status === "unread").length;
}
