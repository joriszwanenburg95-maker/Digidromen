import type { Database } from "../types/database";

export type Role =
  | "digidromen_admin"
  | "digidromen_staff"
  | "service_partner"
  | "help_org";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type DonationStatus = Database["public"]["Enums"]["donation_status"];
export type RepairStatus = Database["public"]["Enums"]["repair_status"];

const BADGE_FALLBACK = "bg-slate-100 text-slate-700";

// Afgeslankte bestelportal: bestellingen hoeven alleen geaccordeerd te worden.
// Eén klik vanaf "Ingediend" → "Geaccordeerd" (of afwijzen). Daarna kan de
// beheerder een leverdatum vullen (= update naar besteller) en afronden.
const ORDER_FLOW_STAFF: Partial<Record<OrderStatus, OrderStatus[]>> = {
  ingediend: ["geaccordeerd", "afgewezen"],
  geaccordeerd: ["geleverd"],
  geleverd: ["afgesloten"],
};

const ORDER_FLOW_SERVICE_PARTNER: Partial<Record<OrderStatus, OrderStatus[]>> = {
  in_voorbereiding: ["geleverd"],
};

const ORDER_BADGE: Record<OrderStatus, string> = {
  concept: "bg-slate-100 text-slate-800",
  ingediend: "bg-blue-100 text-blue-800",
  te_accorderen: "bg-amber-100 text-amber-800",
  geaccordeerd: "bg-amber-100 text-amber-800",
  in_voorbereiding: "bg-purple-100 text-purple-800",
  geleverd: "bg-green-100 text-green-800",
  afgesloten: "bg-slate-100 text-slate-800",
  afgewezen: "bg-red-100 text-red-800",
};

const ORDER_LABEL: Record<OrderStatus, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  te_accorderen: "Ter accordering",
  geaccordeerd: "Geaccordeerd",
  in_voorbereiding: "In voorbereiding",
  geleverd: "Geleverd",
  afgesloten: "Afgesloten",
  afgewezen: "Afgewezen",
};

const ORDER_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  afgewezen: "Afwijzen",
  te_accorderen: "Ter accordering",
  geaccordeerd: "Accorderen",
  in_voorbereiding: "In voorbereiding zetten",
  geleverd: "Markeren als geleverd",
  afgesloten: "Afsluiten",
};

export const orderWorkflow = {
  nextStates(role: Role, status: OrderStatus): OrderStatus[] {
    if (role === "help_org") return [];
    if (role === "service_partner") return ORDER_FLOW_SERVICE_PARTNER[status] ?? [];
    return ORDER_FLOW_STAFF[status] ?? [];
  },
  canTransition(role: Role, from: OrderStatus, to: OrderStatus): boolean {
    return orderWorkflow.nextStates(role, from).includes(to);
  },
  label(status: OrderStatus): string {
    return ORDER_LABEL[status] ?? status;
  },
  actionLabel(target: OrderStatus): string {
    return ORDER_ACTION_LABEL[target] ?? `→ ${ORDER_LABEL[target] ?? target}`;
  },
  badgeClass(status: OrderStatus): string {
    return ORDER_BADGE[status] ?? BADGE_FALLBACK;
  },
  buttonClass(target: OrderStatus): string {
    if (target === "afgewezen") return "bg-red-600 hover:bg-red-700 text-white";
    if (target === "te_accorderen" || target === "geaccordeerd")
      return "bg-amber-500 hover:bg-amber-600 text-white";
    if (target === "geleverd" || target === "afgesloten")
      return "bg-green-600 hover:bg-green-700 text-white";
    return "bg-digidromen-orange hover:bg-digidromen-orange-hover text-white";
  },
};

const DONATION_FLOW: Partial<Record<DonationStatus, DonationStatus[]>> = {
  aangemeld: ["pickup_gepland"],
  pickup_gepland: ["ontvangen"],
  ontvangen: ["in_verwerking"],
  in_verwerking: ["verwerkt"],
};

const DONATION_BADGE: Record<DonationStatus, string> = {
  concept: "bg-slate-100 text-slate-700",
  aangemeld: "bg-blue-100 text-blue-800",
  pickup_gepland: "bg-amber-100 text-amber-800",
  ontvangen: "bg-sky-100 text-sky-800",
  in_verwerking: "bg-purple-100 text-purple-800",
  verwerkt: "bg-green-100 text-green-800",
  geannuleerd: "bg-red-100 text-red-800",
};

const DONATION_LABEL: Record<DonationStatus, string> = {
  concept: "Concept",
  aangemeld: "Aangemeld",
  pickup_gepland: "Pickup gepland",
  ontvangen: "Ontvangen",
  in_verwerking: "In verwerking",
  verwerkt: "Verwerkt",
  geannuleerd: "Geannuleerd",
};

const DONATION_ACTION_LABEL: Partial<Record<DonationStatus, string>> = {
  pickup_gepland: "Pickup plannen",
  ontvangen: "Markeren als ontvangen",
  in_verwerking: "Start verwerking",
  verwerkt: "Markeren als verwerkt",
};

export type DonationManageContext = {
  role: Role;
  userOrganizationId: string | undefined;
  assignedServicePartnerId: string | null;
};

export const donationWorkflow = {
  canManage({ role, userOrganizationId, assignedServicePartnerId }: DonationManageContext): boolean {
    if (role === "help_org") return false;
    if (role === "digidromen_admin" || role === "digidromen_staff") return true;
    if (role === "service_partner") {
      return (
        !!assignedServicePartnerId && assignedServicePartnerId === userOrganizationId
      );
    }
    return false;
  },
  nextStates(ctx: DonationManageContext, status: DonationStatus): DonationStatus[] {
    if (!donationWorkflow.canManage(ctx)) return [];
    return DONATION_FLOW[status] ?? [];
  },
  canTransition(ctx: DonationManageContext, from: DonationStatus, to: DonationStatus): boolean {
    return donationWorkflow.nextStates(ctx, from).includes(to);
  },
  label(status: DonationStatus): string {
    return DONATION_LABEL[status] ?? status;
  },
  actionLabel(target: DonationStatus): string {
    return DONATION_ACTION_LABEL[target] ?? `→ ${DONATION_LABEL[target] ?? target}`;
  },
  badgeClass(status: DonationStatus): string {
    return DONATION_BADGE[status] ?? BADGE_FALLBACK;
  },
  buttonClass(target: DonationStatus): string {
    if (target === "verwerkt") return "bg-green-600 hover:bg-green-700 text-white";
    if (target === "pickup_gepland" || target === "in_verwerking")
      return "bg-amber-500 hover:bg-amber-600 text-white";
    return "bg-digidromen-orange hover:bg-digidromen-orange-hover text-white";
  },
};

const REPAIR_FLOW: Partial<Record<RepairStatus, RepairStatus[]>> = {
  ONTVANGEN: ["DIAGNOSE"],
  DIAGNOSE: ["IN_REPARATIE", "IRREPARABEL"],
  IN_REPARATIE: ["TEST"],
  TEST: ["RETOUR", "IN_REPARATIE"],
  RETOUR: ["AFGESLOTEN"],
  IRREPARABEL: ["AFGESLOTEN"],
};

const REPAIR_BADGE: Record<RepairStatus, string> = {
  ONTVANGEN: "bg-blue-100 text-blue-800",
  DIAGNOSE: "bg-amber-100 text-amber-800",
  IN_REPARATIE: "bg-purple-100 text-purple-800",
  TEST: "bg-sky-100 text-sky-800",
  RETOUR: "bg-green-100 text-green-800",
  IRREPARABEL: "bg-red-100 text-red-800",
  AFGESLOTEN: "bg-slate-100 text-slate-800",
};

const REPAIR_LABEL: Record<RepairStatus, string> = {
  ONTVANGEN: "Ontvangen",
  DIAGNOSE: "Diagnose",
  IN_REPARATIE: "In reparatie",
  TEST: "Test",
  RETOUR: "Retour",
  IRREPARABEL: "Irreparabel",
  AFGESLOTEN: "Afgesloten",
};

export const repairWorkflow = {
  nextStates(role: Role, status: RepairStatus): RepairStatus[] {
    if (role === "help_org") return [];
    return REPAIR_FLOW[status] ?? [];
  },
  canTransition(role: Role, from: RepairStatus, to: RepairStatus): boolean {
    return repairWorkflow.nextStates(role, from).includes(to);
  },
  label(status: RepairStatus): string {
    return REPAIR_LABEL[status] ?? status;
  },
  badgeClass(status: RepairStatus): string {
    return REPAIR_BADGE[status] ?? BADGE_FALLBACK;
  },
};

const ALL_LABELS: Record<string, string> = {
  ...ORDER_LABEL,
  ...DONATION_LABEL,
  ...REPAIR_LABEL,
};

/** Generic lookup across all workflow entities. Falls back to the raw status. */
export function labelFor(status: string): string {
  return ALL_LABELS[status] ?? status;
}
