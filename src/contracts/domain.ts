export type EntityId = string;
export type ISODateString = string;

export type Role =
  | "help_org"
  | "digidromen_staff"
  | "digidromen_admin"
  | "service_partner";

export type CaseType = "order" | "repair" | "donation";
export type Priority = "low" | "normal" | "high" | "urgent";
export type NotificationChannel = "email" | "portal" | "system";
export type NotificationLevel = "info" | "success" | "warning" | "error";
export type MessageKind = "internal" | "manual" | "system";
export type DocumentKind =
  | "request_attachment"
  | "repair_report"
  | "shipping_note"
  | "pickup_note"
  | "donation_report"
  | "other";

export type OrderStatus =
  | "INGEDIEND"
  | "BEOORDEELD"
  | "IN_BEHANDELING"
  | "IN_VOORBEREIDING"
  | "VERZONDEN"
  | "GELEVERD"
  | "AFGESLOTEN"
  | "GEANNULEERD";

export type RepairStatus =
  | "ONTVANGEN"
  | "DIAGNOSE"
  | "IN_REPARATIE"
  | "TEST"
  | "RETOUR"
  | "IRREPARABEL"
  | "AFGESLOTEN";

export type RepairSubtype = "GENERAL_REPAIR" | "ACCESSORY_ISSUE";

export type DonationStatus =
  | "TOEGEZEGD"
  | "OPHAALAFSPRAAK_GEPLAND"
  | "OPGEHAALD"
  | "AANGEKOMEN_WAREHOUSE"
  | "IN_VERWERKING"
  | "RAPPORTAGE_GEREED"
  | "OP_VOORRAAD";

export type WorkflowStatus = OrderStatus | RepairStatus | DonationStatus;

export interface Organization {
  id: EntityId;
  name: string;
  type: "help_org" | "digidromen" | "service_partner" | "sponsor";
  city: string;
  contactName: string;
  contactEmail: string;
  active: boolean;
  crmRelationId?: string;
}

export interface User {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  email: string;
  role: Role;
  title?: string;
  phone?: string;
  avatarLabel?: string;
}

export interface Product {
  id: EntityId;
  sku: string;
  name: string;
  category: "laptop" | "accessory" | "service";
  description: string;
  stockOnHand: number;
  stockReserved: number;
  specificationSummary: string[];
  imageUrl?: string;
  active: boolean;
}

export interface InventoryItem {
  id: EntityId;
  productId: EntityId;
  serialNumber?: string;
  warehouseLocation: string;
  condition: "new" | "refurbished" | "damaged" | "reserved" | "in_repair";
  quantity: number;
  availableQuantity: number;
  sourceDonationBatchId?: EntityId;
  assignedOrderId?: EntityId;
  lastMutationAt: ISODateString;
}

export interface CrmReference {
  crmRelationId?: string;
  crmCaseId?: string;
  crmTaskId?: string;
}

export interface WorkflowEvent {
  id: EntityId;
  caseType: CaseType;
  caseId: EntityId;
  status: WorkflowStatus;
  title: string;
  description: string;
  createdAt: ISODateString;
  actorRole: Role | "system";
  actorName: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface Message {
  id: EntityId;
  caseType: CaseType;
  caseId: EntityId;
  authorUserId?: EntityId;
  authorRole: Role | "system";
  authorName: string;
  kind: MessageKind;
  body: string;
  createdAt: ISODateString;
  internalOnly?: boolean;
  attachmentDocumentIds?: EntityId[];
}

export interface DocumentRecord {
  id: EntityId;
  caseType: CaseType;
  caseId: EntityId;
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  uploadedAt: ISODateString;
  uploadedByUserId?: EntityId;
  uploadedByName: string;
  kind: DocumentKind;
  storageMode: "metadata_only" | "crm_reference";
  crmDocumentId?: string;
  notes?: string;
}

export interface Notification {
  id: EntityId;
  roleScope: Role[];
  title: string;
  body: string;
  createdAt: ISODateString;
  channel: NotificationChannel;
  level: NotificationLevel;
  readByRole: Partial<Record<Role, boolean>>;
  relatedCaseType?: CaseType;
  relatedCaseId?: EntityId;
}

export interface OrderLine {
  id: EntityId;
  productId: EntityId;
  quantity: number;
}

export interface Order extends CrmReference {
  id: EntityId;
  organizationId: EntityId;
  requesterUserId: EntityId;
  status: OrderStatus;
  priority: Priority;
  preferredDeliveryDate?: ISODateString;
  requestedAt: ISODateString;
  motivation: string;
  deliveryAddress: string;
  lineItems: OrderLine[];
  stockBadge: "in_stock" | "limited" | "out_of_stock";
  assignedServicePartnerId?: EntityId;
  lastUpdatedAt: ISODateString;
  workflowEventIds: EntityId[];
  messageIds: EntityId[];
  documentIds: EntityId[];
}

export interface RepairCase extends CrmReference {
  id: EntityId;
  organizationId: EntityId;
  requesterUserId: EntityId;
  status: RepairStatus;
  subtype: RepairSubtype;
  serialNumber: string;
  issueType: string;
  notes: string;
  photoPlaceholderCount: number;
  receivedAt: ISODateString;
  assignedServicePartnerId?: EntityId;
  replacementOffered?: boolean;
  lastUpdatedAt: ISODateString;
  workflowEventIds: EntityId[];
  messageIds: EntityId[];
  documentIds: EntityId[];
}

export interface DonationBatch extends CrmReference {
  id: EntityId;
  sponsorOrganizationId: EntityId;
  status: DonationStatus;
  deviceCountPromised: number;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactEmail: string;
  pickupWindow?: string;
  registeredAt: ISODateString;
  assignedServicePartnerId?: EntityId;
  refurbishReadyCount?: number;
  rejectedCount?: number;
  notes?: string;
  lastUpdatedAt: ISODateString;
  workflowEventIds: EntityId[];
  messageIds: EntityId[];
  documentIds: EntityId[];
}

export interface CrmSyncJob {
  id: EntityId;
  caseType: CaseType;
  caseId: EntityId;
  state: "queued" | "synced" | "failed" | "retrying";
  entityName: "organization" | "order" | "repair" | "donation" | "document" | "task";
  bufferedChanges: string[];
  lastAttemptAt?: ISODateString;
  lastSuccessfulSyncAt?: ISODateString;
  failureReason?: string;
  retryCount: number;
}

export interface CrmSyncState {
  jobs: Record<EntityId, CrmSyncJob>;
  queueOrder: EntityId[];
  lastSweepAt?: ISODateString;
  health: "healthy" | "degraded" | "blocked";
}

export interface PortalData {
  organizations: Record<EntityId, Organization>;
  users: Record<EntityId, User>;
  products: Record<EntityId, Product>;
  inventoryItems: Record<EntityId, InventoryItem>;
  orders: Record<EntityId, Order>;
  repairs: Record<EntityId, RepairCase>;
  donations: Record<EntityId, DonationBatch>;
  documents: Record<EntityId, DocumentRecord>;
  messages: Record<EntityId, Message>;
  notifications: Record<EntityId, Notification>;
  workflowEvents: Record<EntityId, WorkflowEvent>;
  crmSync: CrmSyncState;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  tone?: "default" | "good" | "warning" | "danger";
}

export interface DashboardAction {
  id: string;
  label: string;
  route: string;
  relatedCaseType?: CaseType;
  relatedCaseId?: EntityId;
}

export interface DashboardView {
  role: Role;
  metrics: DashboardMetric[];
  pendingActions: DashboardAction[];
  recentDocumentIds: EntityId[];
  spotlightCaseIds: EntityId[];
}
