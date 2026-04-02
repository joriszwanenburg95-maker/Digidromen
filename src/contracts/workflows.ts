import type { DonationStatus, OrderStatus, RepairStatus, Role } from "./domain";

export interface TransitionEdge<Status extends string> {
  from: Status;
  to: Status;
  roles: Role[];
}

export const orderTransitions: TransitionEdge<OrderStatus>[] = [
  {
    from: "ingediend",
    to: "te_accorderen",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "ingediend",
    to: "afgewezen",
    roles: ["help_org", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "te_accorderen",
    to: "geaccordeerd",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "te_accorderen",
    to: "afgewezen",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "geaccordeerd",
    to: "in_voorbereiding",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "geaccordeerd",
    to: "afgewezen",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "in_voorbereiding",
    to: "geleverd",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "geleverd",
    to: "afgesloten",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
];

export const repairTransitions: TransitionEdge<RepairStatus>[] = [
  {
    from: "ONTVANGEN",
    to: "DIAGNOSE",
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    from: "ONTVANGEN",
    to: "IRREPARABEL",
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    from: "DIAGNOSE",
    to: "IN_REPARATIE",
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    from: "DIAGNOSE",
    to: "IRREPARABEL",
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    from: "IN_REPARATIE",
    to: "TEST",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_REPARATIE",
    to: "IRREPARABEL",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "TEST",
    to: "RETOUR",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "TEST",
    to: "IRREPARABEL",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "RETOUR",
    to: "AFGESLOTEN",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IRREPARABEL",
    to: "AFGESLOTEN",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
];

export const donationTransitions: TransitionEdge<DonationStatus>[] = [
  {
    from: "aangemeld",
    to: "pickup_gepland",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "pickup_gepland",
    to: "ontvangen",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "ontvangen",
    to: "in_verwerking",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "in_verwerking",
    to: "verwerkt",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
];

export const terminalStatuses = {
  orders: ["afgesloten", "afgewezen"] satisfies OrderStatus[],
  repairs: ["AFGESLOTEN"] satisfies RepairStatus[],
  donations: ["verwerkt", "geannuleerd"] satisfies DonationStatus[],
};

export const statusLabels: Record<string, string> = {
  // order_status (lowercase)
  concept: "Concept",
  ingediend: "Ingediend",
  te_accorderen: "Te accorderen",
  geaccordeerd: "Geaccordeerd",
  in_voorbereiding: "In voorbereiding",
  geleverd: "Geleverd",
  afgesloten: "Afgesloten",
  afgewezen: "Afgewezen",
  // repair_status (UPPERCASE — unchanged in DB)
  ONTVANGEN: "Ontvangen",
  DIAGNOSE: "Diagnose",
  IN_REPARATIE: "In reparatie",
  TEST: "Test",
  RETOUR: "Retour",
  IRREPARABEL: "Irreparabel",
  AFGESLOTEN: "Afgesloten",
  // donation_status (lowercase)
  aangemeld: "Aangemeld",
  pickup_gepland: "Ophaal gepland",
  ontvangen: "Ontvangen",
  in_verwerking: "In verwerking",
  verwerkt: "Verwerkt",
  geannuleerd: "Geannuleerd",
};
