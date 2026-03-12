import type {
  CaseType,
  CrmSyncJob,
  DonationBatch,
  DonationStatus,
  DocumentRecord,
  Notification,
  Order,
  OrderStatus,
  PortalData,
  RepairCase,
  RepairStatus,
  Role,
  WorkflowEvent,
} from "./domain";

export interface MutationMeta {
  actorRole: Role;
  actorName: string;
  actorUserId?: string;
  reason?: string;
  timestamp: string;
}

export interface PortalStoreSnapshot {
  data: PortalData;
  activeRole: Role;
  version: number;
}

export interface CreateOrderInput {
  organizationId: string;
  requesterUserId: string;
  productId: string;
  quantity: number;
  preferredDeliveryDate?: string;
  motivation: string;
  deliveryAddress: string;
  priority?: Order["priority"];
}

export interface CreateRepairInput {
  organizationId: string;
  requesterUserId: string;
  serialNumber: string;
  issueType: string;
  notes: string;
  subtype: RepairCase["subtype"];
  photoPlaceholderCount: number;
}

export interface CreateDonationInput {
  sponsorOrganizationId: string;
  deviceCountPromised: number;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactEmail: string;
  pickupWindow?: string;
  notes?: string;
}

export interface PortalStoreContract {
  load(): PortalStoreSnapshot;
  resetToSeed(): PortalStoreSnapshot;
  setActiveRole(role: Role): PortalStoreSnapshot;
  createOrder(input: CreateOrderInput, meta: MutationMeta): Order;
  updateOrderStatus(orderId: string, status: OrderStatus, meta: MutationMeta): Order;
  createRepair(input: CreateRepairInput, meta: MutationMeta): RepairCase;
  updateRepairStatus(repairId: string, status: RepairStatus, meta: MutationMeta): RepairCase;
  createDonation(input: CreateDonationInput, meta: MutationMeta): DonationBatch;
  updateDonationStatus(
    donationId: string,
    status: DonationStatus,
    meta: MutationMeta,
  ): DonationBatch;
  appendWorkflowEvent(event: WorkflowEvent): void;
  addNotification(notification: Notification): void;
  attachDocument(document: DocumentRecord, meta: MutationMeta): DocumentRecord;
}

export interface CrmSyncRequest {
  caseType: CaseType;
  caseId: string;
  entityName: CrmSyncJob["entityName"];
  bufferedChanges: string[];
  meta: MutationMeta;
}

export interface CrmMockAdapterContract {
  queueSync(request: CrmSyncRequest): CrmSyncJob;
  flushQueue(now: string): CrmSyncJob[];
  retry(jobId: string, now: string): CrmSyncJob;
  markFailed(jobId: string, reason: string, now: string): CrmSyncJob;
  summarizeHealth(): PortalData["crmSync"]["health"];
}

export interface ShipmentUpdateInput {
  orderId: string;
  deliveredAt?: string;
  trackingReference?: string;
  notes?: string;
}

export interface RepairUpdateInput {
  repairId: string;
  nextStatus: RepairStatus;
  notes?: string;
  replacementOffered?: boolean;
}

export interface RefurbishUpdateInput {
  donationId: string;
  nextStatus: DonationStatus;
  refurbishReadyCount?: number;
  rejectedCount?: number;
  notes?: string;
}

export interface StockMutationInput {
  productId: string;
  delta: number;
  reason: "donation_intake" | "order_reservation" | "shipment" | "repair_return";
  relatedCaseType?: CaseType;
  relatedCaseId?: string;
}

export interface ServicePartnerMockAdapterContract {
  pushShipmentUpdate(input: ShipmentUpdateInput, meta: MutationMeta): Order;
  pushRepairUpdate(input: RepairUpdateInput, meta: MutationMeta): RepairCase;
  pushRefurbishUpdate(input: RefurbishUpdateInput, meta: MutationMeta): DonationBatch;
  recordStockMutation(input: StockMutationInput, meta: MutationMeta): void;
}

export interface SeedFactoryContract {
  createSeedData(now: string): PortalData;
}
