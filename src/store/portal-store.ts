import type {
  CrmMockAdapterContract,
  CrmSyncRequest,
  MutationMeta,
  PortalStoreContract,
  PortalStoreSnapshot,
  RepairUpdateInput,
  ServicePartnerMockAdapterContract,
  ShipmentUpdateInput,
  RefurbishUpdateInput,
  StockMutationInput,
  CreateDonationInput,
  CreateOrderInput,
  CreateRepairInput,
} from "../contracts";
import {
  CURRENT_PERSISTENCE_VERSION,
  LOCAL_STORAGE_KEYS,
  type PersistedPortalEnvelope,
  type PersistedUiState,
} from "../contracts";
import {
  donationTransitions,
  orderTransitions,
  repairTransitions,
} from "../contracts";
import type {
  CaseType,
  CrmSyncJob,
  DashboardView,
  DocumentRecord,
  DonationBatch,
  DonationStatus,
  Message,
  Notification,
  Order,
  OrderStatus,
  PortalData,
  RepairCase,
  RepairStatus,
  Role,
  WorkflowEvent,
  WorkflowStatus,
} from "../contracts";
import { exportDonationsCsv, exportOrdersCsv, exportRepairsCsv } from "../data/csv";
import { deriveMetricSummary } from "../data/metrics";
import {
  DEFAULT_ACTIVE_ROLE,
  DEFAULT_UI_STATE,
  buildDashboardView,
  createSeedData,
} from "../data/contract-seed";
import { getStorage, type StorageLike } from "./local-storage";

interface InternalState {
  activeRole: Role;
  data: PortalData;
  ui: PersistedUiState;
  version: number;
}

export interface ExtendedPortalStore extends PortalStoreContract {
  crm: CrmMockAdapterContract;
  servicePartner: ServicePartnerMockAdapterContract;
  getSnapshot(): PortalStoreSnapshot;
  subscribe(listener: () => void): () => void;
  getUiState(): PersistedUiState;
  saveUiState(uiState: PersistedUiState): PersistedUiState;
  exportOrdersCsv(): string;
  exportRepairsCsv(): string;
  exportDonationsCsv(): string;
  getDashboardView(role?: Role): DashboardView;
  addMessage(message: Message): Message;
  addDocument(input: DocumentRecord, meta: MutationMeta): DocumentRecord;
  getMetricSummary(): ReturnType<typeof deriveMetricSummary>;
}

export function createPortalStore(storageOverride?: StorageLike): ExtendedPortalStore {
  const storage = getStorage(storageOverride);
  const listeners = new Set<() => void>();
  let state = loadState(storage);

  function emit(): void {
    persistState(storage, state);
    listeners.forEach((listener) => listener());
  }

  function mutate(mutator: (draft: InternalState) => void): void {
    const draft = clone(state);
    mutator(draft);
    draft.version += 1;
    state = draft;
    emit();
  }

  function load(): PortalStoreSnapshot {
    return {
      data: state.data,
      activeRole: state.activeRole,
      version: state.version,
    };
  }

  function resetToSeed(): PortalStoreSnapshot {
    state = {
      activeRole: DEFAULT_ACTIVE_ROLE,
      data: createSeedData(),
      ui: DEFAULT_UI_STATE,
      version: 1,
    };
    emit();
    return load();
  }

  function setActiveRole(role: Role): PortalStoreSnapshot {
    state = {
      ...state,
      activeRole: role,
      version: state.version + 1,
    };
    emit();
    return load();
  }

  function createOrder(input: CreateOrderInput, meta: MutationMeta): Order {
    const id = createId("order");
    const requestedAt = meta.timestamp;
    const order: Order = {
      id,
      organizationId: input.organizationId,
      requesterUserId: input.requesterUserId,
      status: "ingediend",
      priority: input.priority ?? "normal",
      preferredDeliveryDate: input.preferredDeliveryDate,
      requestedAt,
      motivation: input.motivation,
      deliveryAddress: input.deliveryAddress,
      lineItems: [
        {
          id: createId("orderline"),
          productId: input.productId,
          quantity: input.quantity,
        },
      ],
      stockBadge: getStockBadge(state.data, input.productId),
      lastUpdatedAt: requestedAt,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
    };

    mutate((draft) => {
      draft.data.orders[id] = order;
      appendCaseEvent(
        draft.data,
        "order",
        id,
        "ingediend",
        "Nieuwe orderaanvraag",
        "Orderaanvraag is ingediend.",
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["digidromen_staff", "digidromen_admin"],
        title: "Nieuwe orderaanvraag",
        body: `Order ${id} wacht op beoordeling.`,
        createdAt: meta.timestamp,
        channel: "portal",
        level: "info",
        relatedCaseType: "order",
        relatedCaseId: id,
      });
      queueSync(draft.data, {
        caseType: "order",
        caseId: id,
        entityName: "order",
        bufferedChanges: ["Order aangemaakt"],
        meta,
      });
    });

    return state.data.orders[id];
  }

  function updateOrderStatus(orderId: string, status: OrderStatus, meta: MutationMeta): Order {
    mutate((draft) => {
      const order = mustFind(draft.data.orders, orderId, "Order");
      assertTransition("order", order.status, status, meta.actorRole);
      order.status = status;
      order.lastUpdatedAt = meta.timestamp;
      appendCaseEvent(
        draft.data,
        "order",
        orderId,
        status,
        `Orderstatus ${status}`,
        `Orderstatus gewijzigd naar ${status}.`,
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["help_org", "digidromen_staff", "digidromen_admin"],
        title: "Orderstatus bijgewerkt",
        body: `Order ${orderId} staat nu op ${status}.`,
        createdAt: meta.timestamp,
        channel: "email",
        level: status === "afgewezen" ? "warning" : "info",
        relatedCaseType: "order",
        relatedCaseId: orderId,
      });
      queueSync(draft.data, {
        caseType: "order",
        caseId: orderId,
        entityName: "order",
        bufferedChanges: [`Orderstatus naar ${status}`],
        meta,
      });
      reconcileOrderStock(draft.data, order, status);
    });
    return state.data.orders[orderId];
  }

  function createRepair(input: CreateRepairInput, meta: MutationMeta): RepairCase {
    const id = createId("repair");
    const repair: RepairCase = {
      id,
      organizationId: input.organizationId,
      requesterUserId: input.requesterUserId,
      status: "ONTVANGEN",
      subtype: input.subtype,
      serialNumber: input.serialNumber,
      issueType: input.issueType,
      notes: input.notes,
      photoPlaceholderCount: input.photoPlaceholderCount,
      receivedAt: meta.timestamp,
      lastUpdatedAt: meta.timestamp,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
    };

    mutate((draft) => {
      draft.data.repairs[id] = repair;
      appendCaseEvent(
        draft.data,
        "repair",
        id,
        "ONTVANGEN",
        "Nieuw reparatieverzoek",
        "Reparatieverzoek is ontvangen.",
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["digidromen_staff", "digidromen_admin"],
        title: "Nieuw reparatieverzoek",
        body: `Repair ${id} wacht op intake.`,
        createdAt: meta.timestamp,
        channel: "portal",
        level: "info",
        relatedCaseType: "repair",
        relatedCaseId: id,
      });
      queueSync(draft.data, {
        caseType: "repair",
        caseId: id,
        entityName: "repair",
        bufferedChanges: ["Repair aangemaakt"],
        meta,
      });
    });

    return state.data.repairs[id];
  }

  function updateRepairStatus(
    repairId: string,
    status: RepairStatus,
    meta: MutationMeta,
  ): RepairCase {
    mutate((draft) => {
      const repair = mustFind(draft.data.repairs, repairId, "Repair");
      assertTransition("repair", repair.status, status, meta.actorRole);
      repair.status = status;
      repair.lastUpdatedAt = meta.timestamp;
      appendCaseEvent(
        draft.data,
        "repair",
        repairId,
        status,
        `Reparatiestatus ${status}`,
        `Reparatiestatus gewijzigd naar ${status}.`,
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["help_org", "digidromen_staff", "digidromen_admin"],
        title: "Reparatiestatus bijgewerkt",
        body: `Repair ${repairId} staat nu op ${status}.`,
        createdAt: meta.timestamp,
        channel: "portal",
        level: status === "IRREPARABEL" ? "warning" : "info",
        relatedCaseType: "repair",
        relatedCaseId: repairId,
      });
      queueSync(draft.data, {
        caseType: "repair",
        caseId: repairId,
        entityName: "repair",
        bufferedChanges: [`Repairstatus naar ${status}`],
        meta,
      });
    });
    return state.data.repairs[repairId];
  }

  function createDonation(input: CreateDonationInput, meta: MutationMeta): DonationBatch {
    const id = createId("donation");
    const donation: DonationBatch = {
      id,
      sponsorOrganizationId: input.sponsorOrganizationId,
      status: "aangemeld",
      deviceCountPromised: input.deviceCountPromised,
      pickupAddress: input.pickupAddress,
      pickupContactName: input.pickupContactName,
      pickupContactEmail: input.pickupContactEmail,
      pickupWindow: input.pickupWindow,
      registeredAt: meta.timestamp,
      notes: input.notes,
      lastUpdatedAt: meta.timestamp,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
    };

    mutate((draft) => {
      draft.data.donations[id] = donation;
      appendCaseEvent(
        draft.data,
        "donation",
        id,
        "aangemeld",
        "Nieuwe donatiebatch",
        "Donatiebatch is geregistreerd.",
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["digidromen_staff", "digidromen_admin", "service_partner"],
        title: "Nieuwe donatiebatch",
        body: `Donatie ${id} wacht op pickup planning.`,
        createdAt: meta.timestamp,
        channel: "portal",
        level: "info",
        relatedCaseType: "donation",
        relatedCaseId: id,
      });
      queueSync(draft.data, {
        caseType: "donation",
        caseId: id,
        entityName: "donation",
        bufferedChanges: ["Donatiebatch aangemaakt"],
        meta,
      });
    });

    return state.data.donations[id];
  }

  function updateDonationStatus(
    donationId: string,
    status: DonationStatus,
    meta: MutationMeta,
  ): DonationBatch {
    mutate((draft) => {
      const donation = mustFind(draft.data.donations, donationId, "Donation");
      assertTransition("donation", donation.status, status, meta.actorRole);
      donation.status = status;
      donation.lastUpdatedAt = meta.timestamp;
      appendCaseEvent(
        draft.data,
        "donation",
        donationId,
        status,
        `Donatiestatus ${status}`,
        `Donatiestatus gewijzigd naar ${status}.`,
        meta,
      );
      addCaseNotification(draft.data, {
        roleScope: ["digidromen_staff", "digidromen_admin", "service_partner"],
        title: "Donatiestatus bijgewerkt",
        body: `Donatie ${donationId} staat nu op ${status}.`,
        createdAt: meta.timestamp,
        channel: "portal",
        level: status === "verwerkt" ? "success" : "info",
        relatedCaseType: "donation",
        relatedCaseId: donationId,
      });
      queueSync(draft.data, {
        caseType: "donation",
        caseId: donationId,
        entityName: "donation",
        bufferedChanges: [`Donatiestatus naar ${status}`],
        meta,
      });
      if (status === "verwerkt" && donation.refurbishReadyCount) {
        applyStockDelta(draft.data, "product-dell-14", donation.refurbishReadyCount, "donation_intake");
      }
    });
    return state.data.donations[donationId];
  }

  function appendWorkflowEvent(event: WorkflowEvent): void {
    mutate((draft) => {
      draft.data.workflowEvents[event.id] = event;
      attachEventToCase(draft.data, event.caseType, event.caseId, event.id);
    });
  }

  function addNotification(notification: Notification): void {
    mutate((draft) => {
      draft.data.notifications[notification.id] = notification;
    });
  }

  function attachDocument(document: DocumentRecord, meta: MutationMeta): DocumentRecord {
    mutate((draft) => {
      draft.data.documents[document.id] = document;
      attachDocumentToCase(draft.data, document.caseType, document.caseId, document.id);
      queueSync(draft.data, {
        caseType: document.caseType,
        caseId: document.caseId,
        entityName: "document",
        bufferedChanges: [`Document toegevoegd: ${document.fileName}`],
        meta,
      });
    });
    return state.data.documents[document.id];
  }

  function addDocument(input: DocumentRecord, meta: MutationMeta): DocumentRecord {
    return attachDocument(input, meta);
  }

  function addMessage(message: Message): Message {
    mutate((draft) => {
      draft.data.messages[message.id] = message;
      attachMessageToCase(draft.data, message.caseType, message.caseId, message.id);
    });
    return state.data.messages[message.id];
  }

  const crm: CrmMockAdapterContract = {
    queueSync(request: CrmSyncRequest): CrmSyncJob {
      let result!: CrmSyncJob;
      mutate((draft) => {
        result = queueSync(draft.data, request);
      });
      return result;
    },
    flushQueue(now: string): CrmSyncJob[] {
      const processed: CrmSyncJob[] = [];
      mutate((draft) => {
        for (const jobId of draft.data.crmSync.queueOrder) {
          const job = draft.data.crmSync.jobs[jobId];
          if (!job) {
            continue;
          }
          const succeeds = job.retryCount > 0 || job.caseId.charCodeAt(job.caseId.length - 1) % 3 !== 0;
          job.lastAttemptAt = now;
          if (succeeds) {
            job.state = "synced";
            job.bufferedChanges = [];
            job.lastSuccessfulSyncAt = now;
            job.failureReason = undefined;
          } else {
            job.state = "failed";
            job.failureReason = "Mock CRM-fout tijdens synchronisatie.";
          }
          processed.push(job);
        }
        draft.data.crmSync.queueOrder = Object.values(draft.data.crmSync.jobs)
          .filter((job) => job.state === "queued" || job.state === "retrying")
          .map((job) => job.id);
        draft.data.crmSync.lastSweepAt = now;
        draft.data.crmSync.health = summarizeHealth(draft.data.crmSync.jobs);
      });
      return processed;
    },
    retry(jobId: string, now: string): CrmSyncJob {
      let result!: CrmSyncJob;
      mutate((draft) => {
        const job = mustFind(draft.data.crmSync.jobs, jobId, "CRM job");
        job.state = "retrying";
        job.retryCount += 1;
        job.lastAttemptAt = now;
        if (!draft.data.crmSync.queueOrder.includes(jobId)) {
          draft.data.crmSync.queueOrder.push(jobId);
        }
        draft.data.crmSync.health = summarizeHealth(draft.data.crmSync.jobs);
        result = job;
      });
      return result;
    },
    markFailed(jobId: string, reason: string, now: string): CrmSyncJob {
      let result!: CrmSyncJob;
      mutate((draft) => {
        const job = mustFind(draft.data.crmSync.jobs, jobId, "CRM job");
        job.state = "failed";
        job.failureReason = reason;
        job.lastAttemptAt = now;
        draft.data.crmSync.health = summarizeHealth(draft.data.crmSync.jobs);
        result = job;
      });
      return result;
    },
    summarizeHealth(): PortalData["crmSync"]["health"] {
      return summarizeHealth(state.data.crmSync.jobs);
    },
  };

  const servicePartner: ServicePartnerMockAdapterContract = {
    pushShipmentUpdate(input: ShipmentUpdateInput, meta: MutationMeta): Order {
      const currentOrder = mustFind(state.data.orders, input.orderId, "Order");
      let order = currentOrder;
      if (input.deliveredAt) {
        if (currentOrder.status !== "in_voorbereiding") {
          order = updateOrderStatus(input.orderId, "in_voorbereiding", meta);
        }
        order = updateOrderStatus(input.orderId, "geleverd", meta);
      } else if (currentOrder.status !== "in_voorbereiding") {
        order = updateOrderStatus(input.orderId, "in_voorbereiding", meta);
      }
      if (input.notes) {
        addMessage({
          id: createId("message"),
          caseType: "order",
          caseId: input.orderId,
          authorRole: meta.actorRole,
          authorName: meta.actorName,
          authorUserId: meta.actorUserId,
          kind: "manual",
          body: input.notes,
          createdAt: meta.timestamp,
        });
      }
      return order;
    },
    pushRepairUpdate(input: RepairUpdateInput, meta: MutationMeta): RepairCase {
      const repair = updateRepairStatus(input.repairId, input.nextStatus, meta);
      if (input.replacementOffered !== undefined) {
        mutate((draft) => {
          draft.data.repairs[input.repairId].replacementOffered = input.replacementOffered;
        });
      }
      if (input.notes) {
        addMessage({
          id: createId("message"),
          caseType: "repair",
          caseId: input.repairId,
          authorRole: meta.actorRole,
          authorName: meta.actorName,
          authorUserId: meta.actorUserId,
          kind: "manual",
          body: input.notes,
          createdAt: meta.timestamp,
        });
      }
      return repair;
    },
    pushRefurbishUpdate(input: RefurbishUpdateInput, meta: MutationMeta): DonationBatch {
      mutate((draft) => {
        const donation = mustFind(draft.data.donations, input.donationId, "Donation");
        donation.refurbishReadyCount = input.refurbishReadyCount ?? donation.refurbishReadyCount;
        donation.rejectedCount = input.rejectedCount ?? donation.rejectedCount;
        donation.notes = input.notes ?? donation.notes;
      });
      return updateDonationStatus(input.donationId, input.nextStatus, meta);
    },
    recordStockMutation(input: StockMutationInput, _meta: MutationMeta): void {
      mutate((draft) => {
        applyStockDelta(draft.data, input.productId, input.delta, input.reason);
      });
    },
  };

  return {
    load,
    getSnapshot: load,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resetToSeed,
    setActiveRole,
    createOrder,
    updateOrderStatus,
    createRepair,
    updateRepairStatus,
    createDonation,
    updateDonationStatus,
    appendWorkflowEvent,
    addNotification,
    attachDocument,
    addDocument,
    addMessage,
    getUiState: () => state.ui,
    saveUiState(uiState: PersistedUiState) {
      state = {
        ...state,
        ui: uiState,
        version: state.version + 1,
      };
      emit();
      return state.ui;
    },
    exportOrdersCsv: () => exportOrdersCsv(state.data),
    exportRepairsCsv: () => exportRepairsCsv(state.data),
    exportDonationsCsv: () => exportDonationsCsv(state.data),
    getDashboardView(role?: Role) {
      return buildDashboardView(state.data, role ?? state.activeRole);
    },
    getMetricSummary() {
      return deriveMetricSummary(state.data);
    },
    crm,
    servicePartner,
  };
}

function loadState(storage: StorageLike): InternalState {
  const persistedRole = loadJson<Role>(storage, LOCAL_STORAGE_KEYS.role) ?? DEFAULT_ACTIVE_ROLE;
  const persistedData = loadJson<PersistedPortalEnvelope>(storage, LOCAL_STORAGE_KEYS.data);
  const persistedUi = loadJson<PersistedUiState>(storage, LOCAL_STORAGE_KEYS.ui);
  return {
    activeRole: persistedRole,
    data:
      persistedData && persistedData.version === CURRENT_PERSISTENCE_VERSION
        ? persistedData.data
        : createSeedData(),
    ui: persistedUi ?? DEFAULT_UI_STATE,
    version: persistedData?.version ?? 1,
  };
}

function persistState(storage: StorageLike, state: InternalState): void {
  saveJson(storage, LOCAL_STORAGE_KEYS.role, state.activeRole);
  saveJson<PersistedPortalEnvelope>(storage, LOCAL_STORAGE_KEYS.data, {
    version: CURRENT_PERSISTENCE_VERSION,
    savedAt: new Date().toISOString(),
    activeRole: state.activeRole,
    data: state.data,
  });
  saveJson(storage, LOCAL_STORAGE_KEYS.ui, state.ui);
}

function loadJson<T>(storage: StorageLike, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveJson<T>(storage: StorageLike, key: string, value: T): void {
  storage.setItem(key, JSON.stringify(value));
}

function queueSync(data: PortalData, request: CrmSyncRequest): CrmSyncJob {
  const existing = Object.values(data.crmSync.jobs).find(
    (item) => item.caseType === request.caseType && item.caseId === request.caseId,
  );
  if (existing) {
    existing.state = "queued";
    existing.bufferedChanges = [...existing.bufferedChanges, ...request.bufferedChanges];
    existing.lastAttemptAt = request.meta.timestamp;
    if (!data.crmSync.queueOrder.includes(existing.id)) {
      data.crmSync.queueOrder.push(existing.id);
    }
    data.crmSync.health = summarizeHealth(data.crmSync.jobs);
    return existing;
  }

  const job: CrmSyncJob = {
    id: createId("crmjob"),
    caseType: request.caseType,
    caseId: request.caseId,
    state: "queued",
    entityName: request.entityName,
    bufferedChanges: [...request.bufferedChanges],
    lastAttemptAt: request.meta.timestamp,
    retryCount: 0,
  };
  data.crmSync.jobs[job.id] = job;
  data.crmSync.queueOrder.push(job.id);
  data.crmSync.health = summarizeHealth(data.crmSync.jobs);
  return job;
}

function summarizeHealth(
  jobs: Record<string, CrmSyncJob>,
): PortalData["crmSync"]["health"] {
  const values = Object.values(jobs);
  if (values.some((job) => job.state === "failed")) {
    return "blocked";
  }
  if (values.some((job) => job.state === "queued" || job.state === "retrying")) {
    return "degraded";
  }
  return "healthy";
}

function appendCaseEvent(
  data: PortalData,
  caseType: CaseType,
  caseId: string,
  status: WorkflowStatus,
  title: string,
  description: string,
  meta: MutationMeta,
): void {
  const eventId = createId("event");
  const event: WorkflowEvent = {
    id: eventId,
    caseType,
    caseId,
    status,
    title,
    description,
    createdAt: meta.timestamp,
    actorRole: meta.actorRole,
    actorName: meta.actorName,
    metadata: meta.actorUserId ? { actorUserId: meta.actorUserId } : undefined,
  };
  data.workflowEvents[eventId] = event;
  attachEventToCase(data, caseType, caseId, eventId);
}

function addCaseNotification(
  data: PortalData,
  notification: Omit<Notification, "id" | "readByRole"> & { id?: string },
): void {
  const id = notification.id ?? createId("notification");
  data.notifications[id] = {
    readByRole: {},
    ...notification,
    id,
  };
}

function attachEventToCase(data: PortalData, caseType: CaseType, caseId: string, eventId: string): void {
  if (caseType === "order") {
    data.orders[caseId].workflowEventIds.push(eventId);
    return;
  }
  if (caseType === "repair") {
    data.repairs[caseId].workflowEventIds.push(eventId);
    return;
  }
  data.donations[caseId].workflowEventIds.push(eventId);
}

function attachMessageToCase(
  data: PortalData,
  caseType: CaseType,
  caseId: string,
  messageId: string,
): void {
  if (caseType === "order") {
    data.orders[caseId].messageIds.push(messageId);
    return;
  }
  if (caseType === "repair") {
    data.repairs[caseId].messageIds.push(messageId);
    return;
  }
  data.donations[caseId].messageIds.push(messageId);
}

function attachDocumentToCase(
  data: PortalData,
  caseType: CaseType,
  caseId: string,
  documentId: string,
): void {
  if (caseType === "order") {
    data.orders[caseId].documentIds.push(documentId);
    return;
  }
  if (caseType === "repair") {
    data.repairs[caseId].documentIds.push(documentId);
    return;
  }
  data.donations[caseId].documentIds.push(documentId);
}

function reconcileOrderStock(data: PortalData, order: Order, status: OrderStatus): void {
  const line = order.lineItems[0];
  if (!line) {
    return;
  }
  if (status === "in_voorbereiding") {
    applyStockDelta(data, line.productId, -line.quantity, "order_reservation");
  }
  if (status === "afgewezen") {
    applyStockDelta(data, line.productId, line.quantity, "order_reservation");
  }
  if (status === "geleverd") {
    applyStockDelta(data, line.productId, 0, "shipment");
  }
}

function applyStockDelta(
  data: PortalData,
  productId: string,
  delta: number,
  reason: StockMutationInput["reason"],
): void {
  const product = mustFind(data.products, productId, "Product");
  product.stockOnHand += delta;
  if (reason === "order_reservation") {
    product.stockReserved += delta < 0 ? Math.abs(delta) : -delta;
  }
  const inventoryItem = Object.values(data.inventoryItems).find(
    (item) => item.productId === productId && !item.serialNumber,
  );
  if (inventoryItem) {
    inventoryItem.quantity += delta;
    inventoryItem.availableQuantity += delta;
    inventoryItem.lastMutationAt = new Date().toISOString();
  }
}

function getStockBadge(data: PortalData, productId: string): Order["stockBadge"] {
  const product = data.products[productId];
  if (!product || product.stockOnHand <= 0) {
    return "out_of_stock";
  }
  if (product.stockOnHand <= 10) {
    return "limited";
  }
  return "in_stock";
}

function assertTransition(
  caseType: CaseType,
  from: WorkflowStatus,
  to: WorkflowStatus,
  role: Role,
): void {
  const collection =
    caseType === "order"
      ? orderTransitions
      : caseType === "repair"
        ? repairTransitions
        : donationTransitions;

  const match = collection.find(
    (edge) => edge.from === from && edge.to === to && edge.roles.includes(role),
  );
  if (!match) {
    throw new Error(`Transition ${caseType}:${from} -> ${to} not allowed for ${role}.`);
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function mustFind<T>(record: Record<string, T>, id: string, label: string): T {
  const value = record[id];
  if (!value) {
    throw new Error(`${label} ${id} not found.`);
  }
  return value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
