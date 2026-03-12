import { useSyncExternalStore } from "react";

import type {
  DonationStatus,
  OrderStatus,
  PortalData,
  RepairStatus,
  Role,
} from "../../../src/contracts/domain";
import { donationTransitions, orderTransitions, repairTransitions, statusLabels } from "../../../src/contracts/workflows";
import { exportDonationsCsv, exportOrdersCsv, exportRepairsCsv } from "../../../src/data/csv";
import { getViewerContext } from "../../../src/data/selectors";
import { createPortalStore } from "../../../src/store/portal-store";
import {
  createRemoteDocument,
  createRemoteDonation,
  createRemoteMessage,
  createRemoteOrder,
  createRemoteRepair,
  loadRemotePortalData,
  recordRemoteStockMutation,
  type RemoteViewer,
  updateRemoteCaseStatus,
} from "./portal-remote";

const baseStore = createPortalStore();

type SubjectType = "order" | "repair" | "donation";

interface LegacySnapshot {
  role: Role;
  data: any;
  metrics: {
    openOrders: number;
    openRepairs: number;
    openDonations: number;
    syncHealth: {
      synced: number;
      queued: number;
      failed: number;
    };
    lowStockProducts: Array<{ productId: string; name: string; availableQuantity: number }>;
  };
}

let cachedLegacySnapshot: LegacySnapshot | null = null;
let cachedStoreVersion = -1;
const remoteListeners = new Set<() => void>();

let remoteViewer: RemoteViewer | null = null;
let remoteData: PortalData | null = null;
let remoteError: string | null = null;

function emitRemote(): void {
  remoteListeners.forEach((listener) => listener());
}

function isRemoteMode(): boolean {
  return Boolean(remoteViewer && remoteData);
}

export async function configureRemotePortal(viewer: RemoteViewer): Promise<void> {
  remoteViewer = viewer;
  remoteData = await loadRemotePortalData();
  remoteError = null;
  emitRemote();
}

export function clearRemotePortal(): void {
  remoteViewer = null;
  remoteData = null;
  remoteError = null;
  emitRemote();
}

export async function refreshRemotePortal(): Promise<void> {
  if (!remoteViewer) {
    return;
  }

  remoteData = await loadRemotePortalData();
  remoteError = null;
  emitRemote();
}

export function getPortalRuntimeState() {
  return {
    remoteViewer,
    remoteData,
    remoteError,
  };
}

function createMutationMeta(role: Role, user: { id?: string; name?: string }, reason?: string) {
  return {
    actorRole: role,
    actorName: user.name ?? "Demo gebruiker",
    actorUserId: user.id,
    reason,
    timestamp: new Date().toISOString(),
  };
}

function createClientId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizePriority(priority?: string): "low" | "normal" | "high" | "urgent" {
  if (priority === "laag") {
    return "low";
  }
  if (priority === "hoog") {
    return "high";
  }
  if (priority === "spoed") {
    return "urgent";
  }
  return "normal";
}

function buildLegacySnapshotFromRaw(rawData: PortalData, role: Role): LegacySnapshot {
  const raw = {
    data: rawData,
    activeRole: role,
  };
  const firstProductId = Object.keys(raw.data.products)[0] ?? undefined;

  const products = Object.fromEntries(
    Object.values(raw.data.products).map((item) => {
      const availableQuantity = Math.max(0, item.stockOnHand - item.stockReserved);
      const stockBadge =
        item.stockOnHand <= 0 ? "out_of_stock" : item.stockOnHand <= 10 ? "limited" : "in_stock";
      return [
        item.id,
        {
          ...item,
          brand: item.sku.split("-")[0]?.toUpperCase() ?? "NVT",
          specsSummary: item.specificationSummary.join(" | "),
          availableQuantity,
          stockBadge,
        },
      ];
    }),
  );

  const users = Object.fromEntries(
    Object.values(raw.data.users).map((item) => [item.id, { ...item, fullName: item.name }]),
  );

  const inventoryItems = Object.fromEntries(
    Object.values(raw.data.inventoryItems).map((item) => [
      item.id,
      {
        ...item,
        locationName: item.warehouseLocation,
        reservedQuantity: Math.max(0, item.quantity - item.availableQuantity),
        inTransitQuantity: 0,
        updatedAt: item.lastMutationAt,
      },
    ]),
  );

  const orders = Object.fromEntries(
    Object.values(raw.data.orders).map((item) => [
      item.id,
      {
        ...item,
        createdAt: item.requestedAt,
        updatedAt: item.lastUpdatedAt,
        timelineEventIds: item.workflowEventIds,
        servicePartnerOrganizationId: item.assignedServicePartnerId,
        shippingAddress: {
          contactName: "Contactpersoon",
          street: item.deliveryAddress,
          postalCode: "",
          city: "",
          country: "NL",
        },
        lineItems: item.lineItems.map((line) => ({
          ...line,
          accessoryProductIds: [] as string[],
        })),
      },
    ]),
  );

  const repairs = Object.fromEntries(
    Object.values(raw.data.repairs).map((item) => [
      item.id,
      {
        ...item,
        productId: firstProductId,
        createdAt: item.receivedAt,
        updatedAt: item.lastUpdatedAt,
        timelineEventIds: item.workflowEventIds,
        servicePartnerOrganizationId: item.assignedServicePartnerId,
        photoPlaceholders: Array.from({ length: item.photoPlaceholderCount }, (_, idx) => `photo-${idx + 1}.jpg`),
      },
    ]),
  );

  const donations = Object.fromEntries(
    Object.values(raw.data.donations).map((item) => {
      const refurbishableCount =
        item.refurbishReadyCount ?? Math.max(0, item.deviceCountPromised - (item.rejectedCount ?? 0));
      return [
        item.id,
        {
          ...item,
          donorOrganizationId: item.sponsorOrganizationId,
          deviceCount: item.deviceCountPromised,
          estimatedPickupDate: item.pickupWindow,
          createdAt: item.registeredAt,
          updatedAt: item.lastUpdatedAt,
          timelineEventIds: item.workflowEventIds,
          refurbishableCount,
          stockImpactQuantity: item.refurbishReadyCount ?? refurbishableCount,
          contactEmail: item.pickupContactEmail,
          pickupAddress: {
            contactName: item.pickupContactName,
            street: item.pickupAddress,
            postalCode: "",
            city: "",
            country: "NL",
          },
        },
      ];
    }),
  );

  const documents = Object.fromEntries(
    Object.values(raw.data.documents).map((item) => [
      item.id,
      {
        ...item,
        createdAt: item.uploadedAt,
        sizeLabel: item.fileSizeLabel,
      },
    ]),
  );

  const workflowEvents = Object.fromEntries(
    Object.values(raw.data.workflowEvents).map((item) => [
      item.id,
      {
        ...item,
        subjectType: item.caseType,
        subjectId: item.caseId,
        summary: item.description || item.title,
        toStatus: item.status,
        kind: "status_changed",
      },
    ]),
  );

  const messages = Object.fromEntries(
    Object.values(raw.data.messages).map((item) => [
      item.id,
      {
        ...item,
        subjectType: item.caseType,
        subjectId: item.caseId,
      },
    ]),
  );

  const notifications = Object.fromEntries(
    Object.values(raw.data.notifications).map((item) => [
      item.id,
      {
        ...item,
        status: item.readByRole[role] ? "read" : "unread",
      },
    ]),
  );

  const crmSyncStates = Object.fromEntries(
    Object.values(raw.data.crmSync.jobs).map((item) => [
      item.id,
      {
        ...item,
        subjectType: item.caseType,
        subjectId: item.caseId,
        status: item.state,
        updatedAt: item.lastAttemptAt ?? item.lastSuccessfulSyncAt ?? "",
      },
    ]),
  );

  const syncJobs = Object.values(raw.data.crmSync.jobs);
  const metrics = {
    openOrders: Object.values(raw.data.orders).filter((item) => !["AFGESLOTEN", "GEANNULEERD"].includes(item.status)).length,
    openRepairs: Object.values(raw.data.repairs).filter((item) => item.status !== "AFGESLOTEN").length,
    openDonations: Object.values(raw.data.donations).filter((item) => item.status !== "OP_VOORRAAD").length,
    syncHealth: {
      synced: syncJobs.filter((item) => item.state === "synced").length,
      queued: syncJobs.filter((item) => item.state === "queued" || item.state === "retrying").length,
      failed: syncJobs.filter((item) => item.state === "failed").length,
    },
    lowStockProducts: Object.values(raw.data.products)
      .filter((item) => item.stockOnHand <= 10)
      .map((item) => ({
        productId: item.id,
        name: item.name,
        availableQuantity: Math.max(0, item.stockOnHand - item.stockReserved),
      })),
  };

  return {
    role,
    data: {
      ...raw.data,
      schemaVersion: 1,
      users,
      products,
      inventoryItems,
      orders,
      repairs,
      donations,
      documents,
      messages,
      notifications,
      workflowEvents,
      crmSyncStates,
    },
    metrics,
  };
}

function buildLegacySnapshot(): LegacySnapshot {
  const raw = baseStore.getSnapshot();
  return buildLegacySnapshotFromRaw(raw.data, raw.activeRole);
}

function getLegacySnapshot(): LegacySnapshot {
  const raw = baseStore.getSnapshot();
  if (cachedLegacySnapshot && raw.version === cachedStoreVersion) {
    return cachedLegacySnapshot;
  }
  const next = buildLegacySnapshot();
  cachedLegacySnapshot = next;
  cachedStoreVersion = raw.version;
  return next;
}

function buildViewer(role: Role, data: PortalData) {
  return getViewerContext(data, role);
}

export const portalStore = {
  subscribe(listener: () => void) {
    const unsubscribeBase = baseStore.subscribe(listener);
    remoteListeners.add(listener);

    return () => {
      unsubscribeBase();
      remoteListeners.delete(listener);
    };
  },
  getSnapshot(): LegacySnapshot {
    if (remoteViewer && remoteData) {
      return buildLegacySnapshotFromRaw(remoteData, remoteViewer.role);
    }
    return getLegacySnapshot();
  },
  setRole(role: Role) {
    if (remoteViewer) {
      return;
    }
    baseStore.setActiveRole(role);
  },
  async createOrder(input: {
    organizationId: string;
    requesterUserId: string;
    servicePartnerOrganizationId?: string;
    priority?: string;
    preferredDeliveryDate?: string;
    motivation: string;
    shippingAddress?: {
      contactName?: string;
      street?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    lineItems: Array<{ productId: string; quantity: number; accessoryProductIds?: string[] }>;
  }) {
    if (remoteViewer) {
      const id = await createRemoteOrder(input, remoteViewer);
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.orders[id];
    }

    const line = input.lineItems[0];
    if (!line) {
      throw new Error("Order vereist minimaal 1 orderregel.");
    }
    return baseStore.createOrder(
      {
        organizationId: input.organizationId,
        requesterUserId: input.requesterUserId,
        productId: line.productId,
        quantity: line.quantity,
        preferredDeliveryDate: input.preferredDeliveryDate,
        motivation: input.motivation,
        deliveryAddress: input.shippingAddress?.street ?? "Onbekend",
        priority: normalizePriority(input.priority),
      },
      createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.requesterUserId, name: "Portal gebruiker" }, "UI createOrder"),
    );
  },
  async createRepair(input: {
    organizationId: string;
    requesterUserId: string;
    servicePartnerOrganizationId?: string;
    productId?: string;
    serialNumber: string;
    issueType: string;
    notes: string;
    photoPlaceholders?: string[];
  }) {
    if (remoteViewer) {
      const id = await createRemoteRepair(input, remoteViewer);
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.repairs[id];
    }

    return baseStore.createRepair(
      {
        organizationId: input.organizationId,
        requesterUserId: input.requesterUserId,
        serialNumber: input.serialNumber,
        issueType: input.issueType,
        notes: input.notes,
        subtype: input.issueType === "accessoireprobleem" ? "ACCESSORY_ISSUE" : "GENERAL_REPAIR",
        photoPlaceholderCount: input.photoPlaceholders?.length ?? 0,
      },
      createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.requesterUserId, name: "Portal gebruiker" }, "UI createRepair"),
    );
  },
  async createDonation(input: {
    donorOrganizationId: string;
    servicePartnerOrganizationId?: string;
    deviceCount: number;
    contactName?: string;
    contactEmail: string;
    estimatedPickupDate?: string;
    street?: string;
    pickupAddress?: {
      contactName?: string;
      street?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    notes?: string;
    intakeByUserId?: string;
  }) {
    if (remoteViewer) {
      const id = await createRemoteDonation(
        {
          donorOrganizationId: input.donorOrganizationId,
          servicePartnerOrganizationId: input.servicePartnerOrganizationId,
          deviceCount: input.deviceCount,
          estimatedPickupDate: input.estimatedPickupDate,
          contactName: input.pickupAddress?.contactName ?? input.contactName,
          contactEmail: input.contactEmail,
          street: input.pickupAddress?.street ?? input.street,
          notes: input.notes,
        },
        remoteViewer,
      );
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.donations[id];
    }

    return baseStore.createDonation(
      {
        sponsorOrganizationId: input.donorOrganizationId,
        deviceCountPromised: input.deviceCount,
        pickupAddress: input.pickupAddress?.street ?? input.street ?? "Onbekend",
        pickupContactName: input.pickupAddress?.contactName ?? input.contactName ?? "Onbekend",
        pickupContactEmail: input.contactEmail,
        pickupWindow: input.estimatedPickupDate,
        notes: input.notes,
      },
      createMutationMeta(baseStore.getSnapshot().activeRole, { name: "Portal gebruiker" }, "UI createDonation"),
    );
  },
  async transitionOrder(orderId: string, input: { nextStatus: OrderStatus; actorUserId?: string; summary?: string }) {
    if (remoteViewer) {
      await updateRemoteCaseStatus("order", orderId, input.nextStatus, remoteViewer);
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.orders[orderId];
    }

    return baseStore.updateOrderStatus(
      orderId,
      input.nextStatus,
      createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.actorUserId, name: "Portal gebruiker" }, "UI transitionOrder"),
    );
  },
  async transitionRepair(repairId: string, input: { nextStatus: RepairStatus; actorUserId?: string; summary?: string }) {
    if (remoteViewer) {
      await updateRemoteCaseStatus("repair", repairId, input.nextStatus, remoteViewer);
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.repairs[repairId];
    }

    return baseStore.updateRepairStatus(
      repairId,
      input.nextStatus,
      createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.actorUserId, name: "Portal gebruiker" }, "UI transitionRepair"),
    );
  },
  async transitionDonation(
    donationId: string,
    input: {
      nextStatus: DonationStatus;
      actorUserId?: string;
      summary?: string;
      refurbishableCount?: number;
      rejectedCount?: number;
      stockImpactQuantity?: number;
    },
  ) {
    if (remoteViewer) {
      await updateRemoteCaseStatus("donation", donationId, input.nextStatus, remoteViewer, {
        refurbishableCount: input.refurbishableCount,
        rejectedCount: input.rejectedCount,
      });
      await refreshRemotePortal();
      return portalStore.getSnapshot().data.donations[donationId];
    }

    if (input.refurbishableCount !== undefined || input.rejectedCount !== undefined) {
      baseStore.servicePartner.pushRefurbishUpdate(
        {
          donationId,
          nextStatus: input.nextStatus,
          refurbishReadyCount: input.refurbishableCount,
          rejectedCount: input.rejectedCount,
        },
        createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.actorUserId, name: "Portal gebruiker" }, "UI transitionDonation"),
      );
      return baseStore.getSnapshot().data.donations[donationId];
    }
    return baseStore.updateDonationStatus(
      donationId,
      input.nextStatus,
      createMutationMeta(baseStore.getSnapshot().activeRole, { id: input.actorUserId, name: "Portal gebruiker" }, "UI transitionDonation"),
    );
  },
  async addMessage(input: {
    subjectType: SubjectType;
    subjectId: string;
    authorUserId?: string;
    authorOrganizationId?: string;
    visibleToRoles?: Role[];
    body: string;
  }) {
    if (remoteViewer) {
      await createRemoteMessage(
        {
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          authorUserId: input.authorUserId,
          body: input.body,
        },
        remoteViewer,
      );
      await refreshRemotePortal();
      const messages = selectSubjectMessages(
        portalStore.getSnapshot().data,
        remoteViewer.role,
        input.subjectType,
        input.subjectId,
      );
      return messages[messages.length - 1];
    }

    const snap = getLegacySnapshot();
    const role = snap.role;
    const author = input.authorUserId ? snap.data.users[input.authorUserId] : undefined;
    return baseStore.addMessage({
      id: createClientId("message"),
      caseType: input.subjectType,
      caseId: input.subjectId,
      authorUserId: input.authorUserId,
      authorRole: role,
      authorName: author?.fullName ?? "Portal gebruiker",
      kind: "manual",
      body: input.body,
      createdAt: new Date().toISOString(),
      internalOnly: false,
    });
  },
  async addDocument(input: {
    subjectType: SubjectType;
    subjectId: string;
    uploadedByUserId?: string;
    category?: string;
    fileName: string;
    mimeType?: string;
    sizeLabel?: string;
  }) {
    if (remoteViewer) {
      await createRemoteDocument(
        {
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          uploadedByUserId: input.uploadedByUserId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeLabel: input.sizeLabel,
        },
        remoteViewer,
      );
      await refreshRemotePortal();
      const documents = Object.values(portalStore.getSnapshot().data.documents).filter(
        (item: any) => item.subjectType === input.subjectType && item.subjectId === input.subjectId,
      );
      return documents[documents.length - 1];
    }

    const snap = getLegacySnapshot();
    const uploader = input.uploadedByUserId ? snap.data.users[input.uploadedByUserId] : undefined;
    return baseStore.addDocument(
      {
        id: createClientId("document"),
        caseType: input.subjectType,
        caseId: input.subjectId,
        fileName: input.fileName,
        fileSizeLabel: input.sizeLabel ?? "Metadata only",
        mimeType: input.mimeType ?? "application/pdf",
        uploadedAt: new Date().toISOString(),
        uploadedByUserId: input.uploadedByUserId,
        uploadedByName: uploader?.fullName ?? "Portal gebruiker",
        kind: "other",
        storageMode: "metadata_only",
      },
      createMutationMeta(snap.role, { id: input.uploadedByUserId, name: uploader?.fullName }, "UI addDocument"),
    );
  },
  exportOrdersCsv: () => (remoteData ? exportOrdersCsv(remoteData) : baseStore.exportOrdersCsv()),
  exportRepairsCsv: () => (remoteData ? exportRepairsCsv(remoteData) : baseStore.exportRepairsCsv()),
  exportDonationsCsv: () => (remoteData ? exportDonationsCsv(remoteData) : baseStore.exportDonationsCsv()),
  crm: {
    async flushQueue() {
      if (remoteViewer) {
        await refreshRemotePortal();
        return [];
      }
      return baseStore.crm.flushQueue(new Date().toISOString());
    },
    async retrySync(subjectType: SubjectType, subjectId: string) {
      if (remoteViewer) {
        await refreshRemotePortal();
        return null;
      }
      const job = Object.values(baseStore.getSnapshot().data.crmSync.jobs).find(
        (item) => item.caseType === subjectType && item.caseId === subjectId,
      );
      if (!job) {
        return null;
      }
      return baseStore.crm.retry(job.id, new Date().toISOString());
    },
  },
  servicePartner: {
    async shipmentUpdate(input: { orderId: string; actorUserId?: string; nextStatus?: OrderStatus; summary?: string }) {
      if (remoteViewer) {
        await updateRemoteCaseStatus(
          "order",
          input.orderId,
          input.nextStatus === "GELEVERD" ? "GELEVERD" : "VERZONDEN",
          remoteViewer,
        );
        await refreshRemotePortal();
        return portalStore.getSnapshot().data.orders[input.orderId];
      }

      return baseStore.servicePartner.pushShipmentUpdate(
        {
          orderId: input.orderId,
          deliveredAt: input.nextStatus === "GELEVERD" ? new Date().toISOString() : undefined,
          notes: input.summary,
        },
        createMutationMeta("service_partner", { id: input.actorUserId, name: "Servicepartner" }, "UI shipmentUpdate"),
      );
    },
    async repairUpdate(input: { repairId: string; actorUserId?: string; nextStatus: RepairStatus; summary?: string }) {
      if (remoteViewer) {
        await updateRemoteCaseStatus("repair", input.repairId, input.nextStatus, remoteViewer);
        await refreshRemotePortal();
        return portalStore.getSnapshot().data.repairs[input.repairId];
      }

      return baseStore.servicePartner.pushRepairUpdate(
        {
          repairId: input.repairId,
          nextStatus: input.nextStatus,
          notes: input.summary,
        },
        createMutationMeta("service_partner", { id: input.actorUserId, name: "Servicepartner" }, "UI repairUpdate"),
      );
    },
    async refurbishUpdate(input: {
      donationId: string;
      actorUserId?: string;
      nextStatus: DonationStatus;
      summary?: string;
      refurbishableCount?: number;
      rejectedCount?: number;
      stockImpactQuantity?: number;
    }) {
      if (remoteViewer) {
        await updateRemoteCaseStatus("donation", input.donationId, input.nextStatus, remoteViewer, {
          refurbishableCount: input.refurbishableCount,
          rejectedCount: input.rejectedCount,
        });
        await refreshRemotePortal();
        return portalStore.getSnapshot().data.donations[input.donationId];
      }

      return baseStore.servicePartner.pushRefurbishUpdate(
        {
          donationId: input.donationId,
          nextStatus: input.nextStatus,
          refurbishReadyCount: input.refurbishableCount,
          rejectedCount: input.rejectedCount,
          notes: input.summary,
        },
        createMutationMeta("service_partner", { id: input.actorUserId, name: "Servicepartner" }, "UI refurbishUpdate"),
      );
    },
    async stockMutation(input: { productId: string; actorUserId?: string; availableDelta?: number; reason?: string }) {
      if (remoteViewer) {
        await recordRemoteStockMutation(input.productId, input.availableDelta ?? 0);
        await refreshRemotePortal();
        return;
      }

      return baseStore.servicePartner.recordStockMutation(
        {
          productId: input.productId,
          delta: input.availableDelta ?? 0,
          reason: "donation_intake",
        },
        createMutationMeta("service_partner", { id: input.actorUserId, name: "Servicepartner" }, input.reason),
      );
    },
  },
};

export function usePortalSnapshot(): LegacySnapshot {
  return useSyncExternalStore(
    portalStore.subscribe,
    portalStore.getSnapshot,
    portalStore.getSnapshot,
  );
}

export function usePortalContext(): {
  snapshot: LegacySnapshot;
  viewer: { role: Role; userId: string; organizationId: string };
  user: any;
  organization: any;
  orders: any[];
  repairs: any[];
  donations: any[];
  inventory: any[];
  notifications: any[];
} {
  const snapshot = usePortalSnapshot();
  const viewer =
    remoteViewer ?? buildViewer(snapshot.role, snapshot.data as PortalData);
  const user = snapshot.data.users[viewer.userId];
  const organization = snapshot.data.organizations[viewer.organizationId];

  const orders = Object.values(snapshot.data.orders)
    .filter((item: any) => {
      if (snapshot.role === "help_org") {
        return item.organizationId === viewer.organizationId;
      }
      if (snapshot.role === "service_partner") {
        return item.servicePartnerOrganizationId === viewer.organizationId;
      }
      return true;
    })
    .sort((left: any, right: any) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));

  const repairs = Object.values(snapshot.data.repairs)
    .filter((item: any) => {
      if (snapshot.role === "help_org") {
        return item.organizationId === viewer.organizationId;
      }
      if (snapshot.role === "service_partner") {
        return item.servicePartnerOrganizationId === viewer.organizationId;
      }
      return true;
    })
    .sort((left: any, right: any) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));

  const donations = Object.values(snapshot.data.donations)
    .filter((item: any) => {
      if (snapshot.role === "help_org") {
        return false;
      }
      if (snapshot.role === "service_partner") {
        return item.assignedServicePartnerId === viewer.organizationId;
      }
      return true;
    })
    .sort((left: any, right: any) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));

  const inventory = Object.values(snapshot.data.inventoryItems).sort((left: any, right: any) =>
    (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
  );
  const notifications = Object.values(snapshot.data.notifications).filter((item: any) =>
    item.roleScope.includes(snapshot.role),
  );

  return {
    snapshot,
    viewer,
    user,
    organization,
    orders,
    repairs,
    donations,
    inventory,
    notifications,
  };
}

export function selectSubjectMessages(
  data: any,
  role: Role,
  subjectType: SubjectType,
  subjectId: string,
): any[] {
  return Object.values(data.messages)
    .filter((item: any) => item.subjectType === subjectType && item.subjectId === subjectId)
    .filter((item: any) => !item.internalOnly || role !== "help_org")
    .sort((left: any, right: any) => left.createdAt.localeCompare(right.createdAt));
}

export function getWorkflowEvents(data: any, ids: string[]): any[] {
  return ids
    .map((id) => data.workflowEvents[id])
    .filter((item) => Boolean(item))
    .sort((left: any, right: any) => left.createdAt.localeCompare(right.createdAt));
}

export function getCaseSyncStates(data: any, subjectType: SubjectType, subjectId: string): any[] {
  return Object.values(data.crmSyncStates)
    .filter((item: any) => item.subjectType === subjectType && item.subjectId === subjectId)
    .sort((left: any, right: any) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getOrderNextStatuses(role: Role, status: OrderStatus): OrderStatus[] {
  return orderTransitions
    .filter((edge) => edge.from === status && edge.roles.includes(role))
    .map((edge) => edge.to);
}

export function getRepairNextStatuses(role: Role, status: RepairStatus): RepairStatus[] {
  return repairTransitions
    .filter((edge) => edge.from === status && edge.roles.includes(role))
    .map((edge) => edge.to);
}

export function getDonationNextStatuses(role: Role, status: DonationStatus): DonationStatus[] {
  return donationTransitions
    .filter((edge) => edge.from === status && edge.roles.includes(role))
    .map((edge) => edge.to);
}

export function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  if (typeof document === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatStatus(status: string): string {
  return statusLabels[status] ?? status;
}

export function statusClasses(status: string): string {
  if (
    status === "AFGESLOTEN" ||
    status === "GELEVERD" ||
    status === "OP_VOORRAAD" ||
    status === "RAPPORTAGE_GEREED"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "GEANNULEERD" || status === "IRREPARABEL" || status === "failed") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "VERZONDEN" || status === "IN_REPARATIE" || status === "queued") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "retrying") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-sky-100 text-sky-700";
}
