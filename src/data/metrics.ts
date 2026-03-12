import type {
  DashboardMetric,
  PortalData,
  Role,
} from "../contracts";
import { buildDashboardView } from "./contract-seed";

export interface MetricSummary {
  totalOrders: number;
  totalRepairs: number;
  totalDonations: number;
  unreadNotifications: number;
  queuedSyncJobs: number;
  failedSyncJobs: number;
  lowStockProducts: string[];
}

export function deriveMetricSummary(data: PortalData): MetricSummary {
  return {
    totalOrders: Object.keys(data.orders).length,
    totalRepairs: Object.keys(data.repairs).length,
    totalDonations: Object.keys(data.donations).length,
    unreadNotifications: Object.values(data.notifications).filter(
      (item) => Object.keys(item.readByRole).length === 0,
    ).length,
    queuedSyncJobs: Object.values(data.crmSync.jobs).filter(
      (item) => item.state === "queued" || item.state === "retrying",
    ).length,
    failedSyncJobs: Object.values(data.crmSync.jobs).filter(
      (item) => item.state === "failed",
    ).length,
    lowStockProducts: Object.values(data.products)
      .filter((item) => item.stockOnHand <= 10)
      .map((item) => item.id),
  };
}

export function deriveDashboardMetrics(
  data: PortalData,
  role: Role,
): DashboardMetric[] {
  return buildDashboardView(data, role).metrics;
}
