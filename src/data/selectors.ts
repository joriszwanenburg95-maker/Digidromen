import type {
  DonationBatch,
  Notification,
  Order,
  PortalData,
  RepairCase,
  Role,
} from "../contracts";
import { DEMO_USER_BY_ROLE } from "./contract-seed";

export interface ViewerContext {
  role: Role;
  userId: string;
  organizationId: string;
}

export function getViewerContext(data: PortalData, role: Role): ViewerContext {
  const userId = DEMO_USER_BY_ROLE[role];
  const user = data.users[userId];
  if (!user) {
    throw new Error(`No demo user configured for role ${role}.`);
  }
  return {
    role,
    userId,
    organizationId: user.organizationId,
  };
}

export function selectOrdersForRole(data: PortalData, role: Role): Order[] {
  const viewer = getViewerContext(data, role);
  const orders = Object.values(data.orders);
  if (role === "help_org") {
    return orders.filter((item) => item.organizationId === viewer.organizationId);
  }
  if (role === "service_partner") {
    return orders.filter((item) => item.assignedServicePartnerId === viewer.organizationId);
  }
  return orders;
}

export function selectRepairsForRole(data: PortalData, role: Role): RepairCase[] {
  const viewer = getViewerContext(data, role);
  const repairs = Object.values(data.repairs);
  if (role === "help_org") {
    return repairs.filter((item) => item.organizationId === viewer.organizationId);
  }
  if (role === "service_partner") {
    return repairs.filter((item) => item.assignedServicePartnerId === viewer.organizationId);
  }
  return repairs;
}

export function selectDonationsForRole(
  data: PortalData,
  role: Role,
): DonationBatch[] {
  const viewer = getViewerContext(data, role);
  const donations = Object.values(data.donations);
  if (role === "help_org") {
    return [];
  }
  if (role === "service_partner") {
    return donations.filter((item) => item.assignedServicePartnerId === viewer.organizationId);
  }
  return donations;
}

export function selectNotificationsForRole(
  data: PortalData,
  role: Role,
): Notification[] {
  return Object.values(data.notifications)
    .filter((item) => item.roleScope.includes(role))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
