export type {
  DonationStatus,
  OrderStatus,
  RepairStatus,
  Role,
} from "../../../src/contracts/domain";

export interface User {
  id: string;
  fullName: string;
  email: string;
  organizationId: string;
}

export interface Product {
  id: string;
  name: string;
  category: "laptop" | "accessory" | "service";
  brand: string;
  specsSummary: string;
  availableQuantity: number;
  stockBadge: string;
}

export interface Order {
  id: string;
  status: string;
  priority: string;
  organizationId: string;
  preferredDeliveryDate?: string;
}

export interface RepairCase {
  id: string;
  status: string;
  organizationId: string;
  productId: string;
  issueType: string;
  updatedAt?: string;
}

export interface DonationBatch {
  id: string;
  status: string;
  donorOrganizationId: string;
  deviceCount: number;
  estimatedPickupDate?: string;
}

export interface TimelineEvent {
  id: string;
  status: string;
  message: string;
  timestamp: string;
  kind: "system" | "manual" | "sync";
}
