import type { DonationStatus, OrderStatus, RepairStatus, Role } from "./domain";

export interface TransitionEdge<Status extends string> {
  from: Status;
  to: Status;
  roles: Role[];
}

export const orderTransitions: TransitionEdge<OrderStatus>[] = [
  {
    from: "INGEDIEND",
    to: "BEOORDEELD",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "INGEDIEND",
    to: "GEANNULEERD",
    roles: ["help_org", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "BEOORDEELD",
    to: "IN_BEHANDELING",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "BEOORDEELD",
    to: "GEANNULEERD",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_BEHANDELING",
    to: "IN_VOORBEREIDING",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_BEHANDELING",
    to: "GEANNULEERD",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_VOORBEREIDING",
    to: "VERZONDEN",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_VOORBEREIDING",
    to: "GEANNULEERD",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "VERZONDEN",
    to: "GELEVERD",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "GELEVERD",
    to: "AFGESLOTEN",
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
    from: "TOEGEZEGD",
    to: "OPHAALAFSPRAAK_GEPLAND",
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    from: "OPHAALAFSPRAAK_GEPLAND",
    to: "OPGEHAALD",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "OPGEHAALD",
    to: "AANGEKOMEN_WAREHOUSE",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "AANGEKOMEN_WAREHOUSE",
    to: "IN_VERWERKING",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "IN_VERWERKING",
    to: "RAPPORTAGE_GEREED",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
  {
    from: "RAPPORTAGE_GEREED",
    to: "OP_VOORRAAD",
    roles: ["service_partner", "digidromen_staff", "digidromen_admin"],
  },
];

export const terminalStatuses = {
  orders: ["AFGESLOTEN", "GEANNULEERD"] satisfies OrderStatus[],
  repairs: ["AFGESLOTEN"] satisfies RepairStatus[],
  donations: ["OP_VOORRAAD"] satisfies DonationStatus[],
};

export const statusLabels: Record<string, string> = {
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
  OPHAALAFSPRAAK_GEPLAND: "Ophaalafspraak gepland",
  OPGEHAALD: "Opgehaald",
  AANGEKOMEN_WAREHOUSE: "Aangekomen warehouse",
  IN_VERWERKING: "In verwerking",
  RAPPORTAGE_GEREED: "Rapportage gereed",
  OP_VOORRAAD: "Op voorraad",
};
