import type { Role } from "./domain";

export interface RouteDefinition {
  path: string;
  navLabel: string;
  pageTitle: string;
  description: string;
  visibleTo: Role[];
  defaultFor: Role[];
  section: "general" | "operations" | "admin" | "integration";
}

export const routeDefinitions: RouteDefinition[] = [
  {
    path: "/login",
    navLabel: "Login",
    pageTitle: "Demo Login",
    description: "Persona selection entry point for the localhost proof of concept.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [],
    section: "general",
  },
  {
    path: "/dashboard",
    navLabel: "Dashboard",
    pageTitle: "Dashboard",
    description: "Role-based overview of work, alerts, and recent activity.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    section: "general",
  },
  {
    path: "/orders",
    navLabel: "Orders",
    pageTitle: "Orders",
    description: "Order list, catalog filters, and creation entry point.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/orders/:id",
    navLabel: "Order Detail",
    pageTitle: "Order Detail",
    description: "Timeline, messages, documents, and status actions for a single order.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/repairs",
    navLabel: "Repairs",
    pageTitle: "Repairs",
    description: "Repair list and creation entry point.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/repairs/:id",
    navLabel: "Repair Detail",
    pageTitle: "Repair Detail",
    description: "Repair workflow, diagnostics, documents, and communication view.",
    visibleTo: [
      "help_org",
      "digidromen_staff",
      "digidromen_admin",
      "service_partner",
    ],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/donations",
    navLabel: "Donations",
    pageTitle: "Donations",
    description: "Donation registration list and pickup/refurbish overview.",
    visibleTo: ["digidromen_staff", "digidromen_admin", "service_partner"],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/donations/:id",
    navLabel: "Donation Detail",
    pageTitle: "Donation Detail",
    description: "Donation timeline, stock impact, and refurbish reporting view.",
    visibleTo: ["digidromen_staff", "digidromen_admin", "service_partner"],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/inventory",
    navLabel: "Inventory",
    pageTitle: "Inventory",
    description: "Inventory stock, reservations, and mutation overview.",
    visibleTo: ["digidromen_staff", "digidromen_admin", "service_partner"],
    defaultFor: [],
    section: "operations",
  },
  {
    path: "/reports",
    navLabel: "Reports",
    pageTitle: "Reports",
    description: "Operational reports and CSV export stubs.",
    visibleTo: ["help_org", "digidromen_staff", "digidromen_admin"],
    defaultFor: [],
    section: "admin",
  },
  {
    path: "/settings",
    navLabel: "Settings",
    pageTitle: "Settings",
    description: "Configuration stubs for users, products, and workflow settings.",
    visibleTo: ["digidromen_admin"],
    defaultFor: [],
    section: "admin",
  },
  {
    path: "/crm-sync",
    navLabel: "CRM Sync",
    pageTitle: "CRM Sync Center",
    description: "Mock CRM queue, retry, and failure handling overview.",
    visibleTo: ["digidromen_staff", "digidromen_admin"],
    defaultFor: [],
    section: "integration",
  },
];

export const fallbackRouteByRole: Record<Role, string> = {
  help_org: "/dashboard",
  digidromen_staff: "/dashboard",
  digidromen_admin: "/dashboard",
  service_partner: "/dashboard",
};
