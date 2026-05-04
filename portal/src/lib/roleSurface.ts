import type { Role } from "../types";
import {
  Building2,
  Calendar,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Package,
  BarChart3,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  Box,
  Shield,
} from "lucide-react";

export type SurfaceKind = "customer" | "warehouse" | "operations" | "admin";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group?: "main" | "beheer";
}

export interface RoleSurfaceConfig {
  kind: SurfaceKind;
  homeLabel: string;
  orderLabel: string;
  nav: NavItem[];
  pageTitle: Record<string, string>;
}

const nav = {
  dashboard: (label: string): NavItem => ({
    key: "dashboard",
    label,
    path: "/dashboard",
    icon: LayoutDashboard,
  }),
  orders: (label: string): NavItem => ({
    key: "orders",
    label,
    path: "/orders",
    icon: ShoppingCart,
  }),
  donations: (): NavItem => ({
    key: "donations",
    label: "Donaties",
    path: "/donations",
    icon: HeartHandshake,
  }),
  planning: (): NavItem => ({
    key: "planning",
    label: "Planning",
    path: "/planning",
    icon: Calendar,
  }),
  inventory: (): NavItem => ({
    key: "inventory",
    label: "Voorraad",
    path: "/inventory",
    icon: Box,
  }),
  forecast: (): NavItem => ({
    key: "forecast",
    label: "Prognose",
    path: "/forecast",
    icon: TrendingUp,
  }),
  reports: (): NavItem => ({
    key: "reports",
    label: "Rapportages",
    path: "/reports",
    icon: BarChart3,
  }),
  organizations: (): NavItem => ({
    key: "organizations",
    label: "Organisaties",
    path: "/organizations",
    icon: Building2,
  }),
  stockLocations: (): NavItem => ({
    key: "stockLocations",
    label: "Locaties",
    path: "/stock-locations",
    icon: MapPin,
  }),
  settings: (label: string): NavItem => ({
    key: "settings",
    label,
    path: "/settings",
    icon: Settings,
  }),
  users: (): NavItem => ({
    key: "users",
    label: "Gebruikers",
    path: "/users",
    icon: Users,
    group: "beheer",
  }),
  integrations: (): NavItem => ({
    key: "integrations",
    label: "Integraties",
    path: "/crm-sync",
    icon: RefreshCw,
    group: "beheer",
  }),
  auditLog: (): NavItem => ({
    key: "auditLog",
    label: "Audit Log",
    path: "/audit-log",
    icon: ClipboardList,
    group: "beheer",
  }),
} as const;

export const roleSurface: Record<Role, RoleSurfaceConfig> = {
  help_org: {
    kind: "customer",
    homeLabel: "Start",
    orderLabel: "Aanvragen",
    nav: [
      nav.dashboard("Start"),
      nav.orders("Aanvragen"),
      nav.settings("Mijn organisatie"),
    ],
    pageTitle: {
      "/dashboard": "Start",
      "/orders": "Laptop aanvragen",
      "/settings": "Mijn organisatie",
    },
  },
  service_partner: {
    kind: "warehouse",
    homeLabel: "Werkvoorraad",
    orderLabel: "Uitleveringen",
    nav: [
      nav.dashboard("Werkvoorraad"),
      nav.orders("Uitleveringen"),
      nav.donations(),
      nav.inventory(),
      nav.stockLocations(),
      nav.settings("Instellingen"),
    ],
    pageTitle: {
      "/dashboard": "Werkvoorraad",
      "/orders": "Uitleveringen",
      "/donations": "Donaties",
      "/inventory": "Voorraad",
      "/stock-locations": "Locaties",
      "/settings": "Instellingen",
    },
  },
  digidromen_staff: {
    kind: "operations",
    homeLabel: "Regie",
    orderLabel: "Bestellingen",
    nav: [
      nav.dashboard("Regie"),
      nav.orders("Bestellingen"),
      nav.donations(),
      nav.planning(),
      nav.inventory(),
      nav.forecast(),
      nav.reports(),
      nav.organizations(),
      nav.stockLocations(),
      nav.settings("Instellingen"),
    ],
    pageTitle: {
      "/dashboard": "Regie",
      "/orders": "Bestellingen",
      "/donations": "Donaties",
      "/planning": "Planning",
      "/inventory": "Voorraad",
      "/forecast": "Prognose",
      "/reports": "Rapportages",
      "/organizations": "Organisaties",
      "/stock-locations": "Locaties",
      "/settings": "Instellingen",
    },
  },
  digidromen_admin: {
    kind: "admin",
    homeLabel: "Regie",
    orderLabel: "Bestellingen",
    nav: [
      nav.dashboard("Regie"),
      nav.orders("Bestellingen"),
      nav.donations(),
      nav.planning(),
      nav.inventory(),
      nav.forecast(),
      nav.reports(),
      nav.organizations(),
      nav.stockLocations(),
      nav.settings("Instellingen"),
      nav.users(),
      nav.integrations(),
      nav.auditLog(),
    ],
    pageTitle: {
      "/dashboard": "Regie",
      "/orders": "Bestellingen",
      "/donations": "Donaties",
      "/planning": "Planning",
      "/inventory": "Voorraad",
      "/forecast": "Prognose",
      "/reports": "Rapportages",
      "/organizations": "Organisaties",
      "/stock-locations": "Locaties",
      "/settings": "Instellingen",
      "/users": "Gebruikers",
      "/crm-sync": "Integraties",
      "/audit-log": "Audit Log",
    },
  },
};

export function getSurface(role: Role): RoleSurfaceConfig {
  return roleSurface[role];
}

export function getPageTitle(role: Role, pathname: string): string {
  const surface = getSurface(role);
  const match = Object.entries(surface.pageTitle).find(([path]) =>
    pathname.startsWith(path),
  );
  return match?.[1] ?? "Portal";
}

export function isRouteAllowed(role: Role, pathname: string): boolean {
  const surface = getSurface(role);
  return surface.nav.some(
    (item) =>
      pathname === item.path || pathname.startsWith(item.path + "/"),
  );
}

export const roleLabels: Record<Role, string> = {
  help_org: "Hulporganisatie",
  digidromen_staff: "Medewerker",
  digidromen_admin: "Beheerder",
  service_partner: "Servicepartner",
};
