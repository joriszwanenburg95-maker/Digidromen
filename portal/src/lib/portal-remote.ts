import type {
  DonationBatch,
  DonationStatus,
  DocumentRecord,
  Message,
  Notification,
  Order,
  OrderStatus,
  PortalData,
  RepairCase,
  RepairStatus,
  Role,
  User,
  WorkflowEvent,
} from "../../../src/contracts/domain";
import { getSupabaseClient } from "./supabase";

export interface RemoteViewer {
  userId: string;
  role: Role;
  organizationId: string;
  name: string;
  email: string;
}

export interface InventoryImportRow {
  location: string;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  incomingEta?: string;
}

const DEFAULT_LAPTOP_PRODUCT_ID = "product-laptop";
const DEFAULT_LAPTOP_PRODUCT_SKU = "LAPTOP-CANONICAL";

function normalizePriority(priority?: string) {
  if (priority === "laag") {
    return "low";
  }
  if (priority === "hoog") {
    return "high";
  }
  if (priority === "spoed") {
    return "urgent";
  }
  if (priority === "normal" || priority === "low" || priority === "high" || priority === "urgent") {
    return priority;
  }
  return "normal";
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeServicePartnerId(id?: string) {
  if (!id || id === "org-aces-direct") {
    return undefined;
  }
  return id;
}

function assertNoError(result: { error: { message: string } | null }) {
  if (result.error) {
    throw new Error(result.error.message);
  }
}

function normalizeDate(value?: string) {
  if (!value) {
    return null;
  }
  return value.slice(0, 10);
}

async function ensureLaptopProductExists(): Promise<string> {
  const supabase = getSupabaseClient();
  const existing = await supabase
    .from("products")
    .select("id")
    .eq("id", DEFAULT_LAPTOP_PRODUCT_ID)
    .maybeSingle();
  assertNoError(existing);

  if (existing.data) {
    return DEFAULT_LAPTOP_PRODUCT_ID;
  }

  const insertResult = await supabase.from("products").insert({
    id: DEFAULT_LAPTOP_PRODUCT_ID,
    sku: DEFAULT_LAPTOP_PRODUCT_SKU,
    name: "Laptop",
    category: "laptop",
    description: "Geaggregeerde laptopvoorraad voor uitlevering en service.",
    stock_on_hand: 0,
    stock_reserved: 0,
    specification_summary: ["Laptop"],
    active: true,
  });
  assertNoError(insertResult);

  return DEFAULT_LAPTOP_PRODUCT_ID;
}

async function fetchBulkInventoryRows(productId: string) {
  const supabase = getSupabaseClient();
  const result = await supabase
    .from("inventory_items")
    .select("*")
    .eq("product_id", productId)
    .is("serial_number", null)
    .order("warehouse_location");
  assertNoError(result);
  return result.data ?? [];
}

async function updateInventoryRow(id: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  const result = await supabase.from("inventory_items").update(payload).eq("id", id);
  assertNoError(result);
}

async function syncLaptopProductStock(productId: string) {
  const rows = await fetchBulkInventoryRows(productId);
  const stockOnHand = rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const stockReserved = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.quantity ?? 0) - Number(row.available_quantity ?? 0)),
    0,
  );

  const supabase = getSupabaseClient();
  const result = await supabase
    .from("products")
    .update({
      stock_on_hand: stockOnHand,
      stock_reserved: stockReserved,
      active: true,
      category: "laptop",
      name: "Laptop",
      sku: DEFAULT_LAPTOP_PRODUCT_SKU,
    })
    .eq("id", productId);
  assertNoError(result);
}

async function reserveLaptopInventory(productId: string, quantity: number) {
  let remaining = quantity;
  const rows = await fetchBulkInventoryRows(productId);

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }
    const available = Number(row.available_quantity ?? 0);
    const reserveDelta = Math.min(available, remaining);
    if (reserveDelta <= 0) {
      continue;
    }
    await updateInventoryRow(row.id, {
      available_quantity: Math.max(0, available - reserveDelta),
      last_mutation_at: new Date().toISOString(),
    });
    remaining -= reserveDelta;
  }

  await syncLaptopProductStock(productId);
}

async function releaseLaptopInventory(productId: string, quantity: number) {
  let remaining = quantity;
  const rows = await fetchBulkInventoryRows(productId);

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }
    const total = Number(row.quantity ?? 0);
    const available = Number(row.available_quantity ?? 0);
    const reserved = Math.max(0, total - available);
    const releaseDelta = Math.min(reserved, remaining);
    if (releaseDelta <= 0) {
      continue;
    }
    await updateInventoryRow(row.id, {
      available_quantity: Math.min(total, available + releaseDelta),
      last_mutation_at: new Date().toISOString(),
    });
    remaining -= releaseDelta;
  }

  await syncLaptopProductStock(productId);
}

async function shipLaptopInventory(productId: string, quantity: number) {
  let remaining = quantity;
  const rows = await fetchBulkInventoryRows(productId);

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }
    const total = Number(row.quantity ?? 0);
    const available = Number(row.available_quantity ?? 0);
    const reserved = Math.max(0, total - available);
    const consumeReserved = Math.min(reserved, remaining);
    const consumeAvailable = Math.min(Math.max(0, remaining - consumeReserved), available);
    const totalConsumed = consumeReserved + consumeAvailable;

    if (totalConsumed <= 0) {
      continue;
    }

    await updateInventoryRow(row.id, {
      quantity: Math.max(0, total - totalConsumed),
      available_quantity: Math.max(0, available - consumeAvailable),
      last_mutation_at: new Date().toISOString(),
    });
    remaining -= totalConsumed;
  }

  await syncLaptopProductStock(productId);
}

async function reconcileRemoteOrderInventory(orderId: string, previousStatus: OrderStatus, nextStatus: OrderStatus) {
  const supabase = getSupabaseClient();
  const linesResult = await supabase
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  assertNoError(linesResult);

  const quantity = (linesResult.data ?? []).reduce((sum, line) => sum + Number(line.quantity ?? 0), 0);
  if (quantity <= 0) {
    return;
  }

  const productId = DEFAULT_LAPTOP_PRODUCT_ID;
  await ensureLaptopProductExists();

  if (nextStatus === "in_voorbereiding" && previousStatus !== "in_voorbereiding") {
    await reserveLaptopInventory(productId, quantity);
    return;
  }

  if (nextStatus === "afgewezen") {
    await releaseLaptopInventory(productId, quantity);
    return;
  }

  if (nextStatus === "geleverd" && previousStatus !== "geleverd") {
    await shipLaptopInventory(productId, quantity);
  }
}

async function upsertInventoryImportRows(productId: string, rows: InventoryImportRow[]) {
  const supabase = getSupabaseClient();
  const existingRows = await fetchBulkInventoryRows(productId);
  const existingByLocation = new Map(existingRows.map((row) => [String(row.warehouse_location).toLowerCase(), row]));
  const importedLocations = new Set<string>();

  for (const row of rows) {
    const location = row.location.trim();
    if (!location) {
      continue;
    }

    const key = location.toLowerCase();
    importedLocations.add(key);
    const quantity = Math.max(0, row.availableQuantity + row.reservedQuantity);
    const payload = {
      product_id: productId,
      serial_number: null,
      warehouse_location: location,
      condition: row.reservedQuantity > 0 && row.availableQuantity === 0 ? "reserved" : "refurbished",
      quantity,
      available_quantity: Math.max(0, row.availableQuantity),
      incoming_quantity: Math.max(0, row.incomingQuantity),
      incoming_eta: normalizeDate(row.incomingEta),
      assigned_order_id: null,
      last_mutation_at: new Date().toISOString(),
    };

    const existing = existingByLocation.get(key);
    if (existing) {
      await updateInventoryRow(existing.id, payload);
    } else {
      const insertResult = await supabase.from("inventory_items").insert({
        id: makeId("inventory"),
        ...payload,
      } as any);
      assertNoError(insertResult);
    }
  }

  const rowsToDelete = existingRows.filter(
    (row) => !importedLocations.has(String(row.warehouse_location).toLowerCase()),
  );
  if (rowsToDelete.length > 0) {
    const deleteResult = await supabase
      .from("inventory_items")
      .delete()
      .in("id", rowsToDelete.map((row) => row.id));
    assertNoError(deleteResult);
  }

  await syncLaptopProductStock(productId);
}

export async function fetchRemoteViewer(): Promise<RemoteViewer | null> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return null;
  }

  const profileResult = await supabase
    .from("user_profiles")
    .select("id, organization_id, role, name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  assertNoError(profileResult);

  if (!profileResult.data) {
    return null;
  }

  return {
    userId: profileResult.data.id,
    role: profileResult.data.role,
    organizationId: profileResult.data.organization_id,
    name: profileResult.data.name,
    email: profileResult.data.email,
  };
}

export async function loadRemotePortalData(): Promise<PortalData> {
  const supabase = getSupabaseClient();

  const [
    organizationsResult,
    profilesResult,
    productsResult,
    inventoryResult,
    ordersResult,
    orderLinesResult,
    repairsResult,
    donationsResult,
    workflowEventsResult,
    messagesResult,
    documentsResult,
    notificationsResult,
    notificationScopeResult,
    crmJobsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("*"),
    supabase.from("user_profiles").select("*"),
    supabase.from("products").select("*"),
    supabase.from("inventory_items").select("*"),
    supabase.from("orders").select("*"),
    supabase.from("order_lines").select("*"),
    supabase.from("repair_cases").select("*"),
    supabase.from("donation_batches").select("*"),
    supabase.from("workflow_events").select("*"),
    supabase.from("messages").select("*"),
    supabase.from("documents").select("*"),
    supabase.from("notifications").select("*"),
    supabase.from("notification_role_scope").select("*"),
    supabase.from("crm_sync_jobs").select("*"),
  ]);

  [
    organizationsResult,
    profilesResult,
    productsResult,
    inventoryResult,
    ordersResult,
    orderLinesResult,
    repairsResult,
    donationsResult,
    workflowEventsResult,
    messagesResult,
    documentsResult,
    notificationsResult,
    notificationScopeResult,
    crmJobsResult,
  ].forEach(assertNoError);

  const orderLinesByOrderId = (orderLinesResult.data ?? []).reduce<Record<string, any[]>>(
    (acc, item) => {
      acc[item.order_id] ??= [];
      acc[item.order_id].push(item);
      return acc;
    },
    {},
  );

  const notificationScopeById = (notificationScopeResult.data ?? []).reduce<Record<string, any[]>>(
    (acc, item) => {
      acc[item.notification_id] ??= [];
      acc[item.notification_id].push(item);
      return acc;
    },
    {},
  );

  const organizations = toRecord(
    (organizationsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      city: item.city,
      contactName: item.contact_name,
      contactEmail: item.contact_email,
      active: item.active,
      crmRelationId: item.crm_relation_id ?? undefined,
    })),
  );

  const users = toRecord(
    (profilesResult.data ?? []).map<User>((item) => ({
      id: item.id,
      organizationId: item.organization_id,
      name: item.name,
      email: item.email,
      role: item.role,
      title: item.title ?? undefined,
      phone: item.phone ?? undefined,
      avatarLabel: item.avatar_label ?? undefined,
    })),
  );

  const products = toRecord(
    (productsResult.data ?? []).map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.category === "laptop" ? "Laptop" : item.name,
      category: item.category,
      description: item.category === "laptop" ? "Laptopvoorraad voor uitlevering en service." : item.description,
      stockOnHand: item.stock_on_hand,
      stockReserved: item.stock_reserved,
      specificationSummary: item.specification_summary ?? [],
      imageUrl: item.image_url ?? undefined,
      active: item.active,
    })),
  );

  const inventoryItems = toRecord(
    (inventoryResult.data ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      serialNumber: item.serial_number ?? undefined,
      warehouseLocation: item.warehouse_location,
      condition: item.condition,
      quantity: item.quantity,
      availableQuantity: item.available_quantity,
      incomingQuantity: item.incoming_quantity ?? 0,
      incomingEta: item.incoming_eta ?? undefined,
      sourceDonationBatchId: item.source_donation_batch_id ?? undefined,
      assignedOrderId: item.assigned_order_id ?? undefined,
      lastMutationAt: item.last_mutation_at,
    })),
  );

  const orders = toRecord(
    (ordersResult.data ?? []).map<Order>((item) => ({
      id: item.id,
      organizationId: item.organization_id,
      requesterUserId: item.requester_user_id,
      status: item.status,
      priority: item.priority,
      preferredDeliveryDate: item.preferred_delivery_date ?? undefined,
      requestedAt: item.requested_at,
      motivation: item.motivation,
      deliveryAddress: item.delivery_address,
      lineItems: (orderLinesByOrderId[item.id] ?? []).map((line) => ({
        id: line.id,
        productId: line.product_id,
        quantity: line.quantity,
      })),
      stockBadge: item.stock_badge as any,
      assignedServicePartnerId: item.assigned_service_partner_id ?? undefined,
      lastUpdatedAt: item.updated_at,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
      crmRelationId: item.crm_relation_id ?? undefined,
      crmCaseId: item.crm_case_id ?? undefined,
      crmTaskId: item.crm_task_id ?? undefined,
    })),
  );

  const repairs = toRecord(
    (repairsResult.data ?? []).map<RepairCase>((item) => ({
      id: item.id,
      organizationId: item.organization_id,
      requesterUserId: item.requester_user_id,
      status: item.status,
      subtype: item.subtype,
      serialNumber: item.serial_number,
      issueType: item.issue_type,
      notes: item.notes,
      photoPlaceholderCount: item.photo_placeholder_count,
      receivedAt: item.received_at,
      assignedServicePartnerId: item.assigned_service_partner_id ?? undefined,
      replacementOffered: item.replacement_offered ?? undefined,
      lastUpdatedAt: item.updated_at,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
      crmRelationId: item.crm_relation_id ?? undefined,
      crmCaseId: item.crm_case_id ?? undefined,
      crmTaskId: item.crm_task_id ?? undefined,
    })),
  );

  const donations = toRecord(
    (donationsResult.data ?? []).map<DonationBatch>((item) => ({
      id: item.id,
      sponsorOrganizationId: item.sponsor_organization_id,
      status: item.status,
      deviceCountPromised: item.device_count_promised,
      pickupAddress: item.pickup_address,
      pickupContactName: item.pickup_contact_name,
      pickupContactEmail: item.pickup_contact_email,
      pickupWindow: item.pickup_window ?? undefined,
      registeredAt: item.registered_at,
      assignedServicePartnerId: item.assigned_service_partner_id ?? undefined,
      refurbishReadyCount: item.refurbish_ready_count ?? undefined,
      rejectedCount: item.rejected_count ?? undefined,
      notes: item.notes ?? undefined,
      lastUpdatedAt: item.updated_at,
      workflowEventIds: [],
      messageIds: [],
      documentIds: [],
      crmRelationId: item.crm_relation_id ?? undefined,
      crmCaseId: item.crm_case_id ?? undefined,
      crmTaskId: item.crm_task_id ?? undefined,
    })),
  );

  const workflowEvents = toRecord(
    (workflowEventsResult.data ?? []).map<WorkflowEvent>((item) => ({
      id: item.id,
      caseType: item.case_type,
      caseId: item.case_id,
      status: item.status as any,
      title: item.title,
      description: item.description,
      createdAt: item.created_at,
      actorRole: item.actor_role as any,
      actorName: item.actor_name,
      metadata: item.metadata as any,
    })),
  );

  const messages = toRecord(
    (messagesResult.data ?? []).map<Message>((item) => ({
      id: item.id,
      caseType: item.case_type,
      caseId: item.case_id,
      authorUserId: item.author_user_id ?? undefined,
      authorRole: item.author_role as any,
      authorName: item.author_name,
      kind: item.kind,
      body: item.body,
      createdAt: item.created_at,
      internalOnly: item.internal_only,
      attachmentDocumentIds: item.attachment_document_ids ?? [],
    })),
  );

  const documents = toRecord(
    (documentsResult.data ?? []).map<DocumentRecord>((item) => ({
      id: item.id,
      caseType: item.case_type,
      caseId: item.case_id,
      fileName: item.file_name,
      fileSizeLabel: item.file_size_label,
      mimeType: item.mime_type,
      uploadedAt: item.uploaded_at,
      uploadedByUserId: item.uploaded_by_user_id ?? undefined,
      uploadedByName: item.uploaded_by_name,
      kind: item.kind as any,
      storageMode: item.storage_mode as "metadata_only" | "crm_reference",
      crmDocumentId: item.crm_document_id ?? undefined,
      notes: item.notes ?? undefined,
    })),
  );

  const notifications = toRecord(
    (notificationsResult.data ?? []).map<Notification>((item) => {
      const scopeRows = notificationScopeById[item.id] ?? [];
      return {
        id: item.id,
        title: item.title,
        body: item.body,
        createdAt: item.created_at,
        channel: item.channel,
        level: item.level,
        roleScope: scopeRows.map((scope) => scope.role),
        readByRole: scopeRows.reduce<Record<string, boolean>>((acc, scope) => {
          acc[scope.role] = scope.is_read;
          return acc;
        }, {}),
        relatedCaseType: item.related_case_type ?? undefined,
        relatedCaseId: item.related_case_id ?? undefined,
      };
    }),
  );

  const crmJobs = toRecord(
    (crmJobsResult.data ?? []).map((item) => ({
      id: item.id,
      caseType: item.case_type,
      caseId: item.case_id,
      state: item.state,
      entityName: item.entity_name,
      bufferedChanges: item.buffered_changes ?? [],
      lastAttemptAt: item.last_attempt_at ?? undefined,
      lastSuccessfulSyncAt: item.last_successful_sync_at ?? undefined,
      failureReason: item.failure_reason ?? undefined,
      retryCount: item.retry_count,
    })),
  );

  const data: PortalData = {
    organizations,
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
    crmSync: {
      jobs: crmJobs,
      queueOrder: Object.values(crmJobs)
        .filter((item) => item.state !== "synced")
        .map((item) => item.id),
      lastSweepAt: undefined,
      health:
        Object.values(crmJobs).some((item) => item.state === "failed")
          ? "degraded"
          : Object.values(crmJobs).some((item) => item.state === "queued" || item.state === "retrying")
            ? "blocked"
            : "healthy",
    },
  };

  Object.values(workflowEvents).forEach((item) => {
    if (item.caseType === "order" && data.orders[item.caseId]) {
      data.orders[item.caseId].workflowEventIds.push(item.id);
    } else if (item.caseType === "repair" && data.repairs[item.caseId]) {
      data.repairs[item.caseId].workflowEventIds.push(item.id);
    } else if (item.caseType === "donation" && data.donations[item.caseId]) {
      data.donations[item.caseId].workflowEventIds.push(item.id);
    }
  });

  Object.values(messages).forEach((item) => {
    if (item.caseType === "order" && data.orders[item.caseId]) {
      data.orders[item.caseId].messageIds.push(item.id);
    } else if (item.caseType === "repair" && data.repairs[item.caseId]) {
      data.repairs[item.caseId].messageIds.push(item.id);
    } else if (item.caseType === "donation" && data.donations[item.caseId]) {
      data.donations[item.caseId].messageIds.push(item.id);
    }
  });

  Object.values(documents).forEach((item) => {
    if (item.caseType === "order" && data.orders[item.caseId]) {
      data.orders[item.caseId].documentIds.push(item.id);
    } else if (item.caseType === "repair" && data.repairs[item.caseId]) {
      data.repairs[item.caseId].documentIds.push(item.id);
    } else if (item.caseType === "donation" && data.donations[item.caseId]) {
      data.donations[item.caseId].documentIds.push(item.id);
    }
  });

  return data;
}

async function addPreparedSyncJob(caseType: "order" | "repair" | "donation", caseId: string, entityName: "order" | "repair" | "donation", bufferedChanges: string[]) {
  const supabase = getSupabaseClient();
  const result = await supabase.from("crm_sync_jobs").insert({
    id: makeId("crm-job"),
    case_type: caseType,
    case_id: caseId,
    state: "queued",
    entity_name: entityName,
    buffered_changes: bufferedChanges,
    retry_count: 0,
  });
  assertNoError(result);
}

export async function createRemoteOrder(
  input: {
    organizationId: string;
    requesterUserId: string;
    servicePartnerOrganizationId?: string;
    preferredDeliveryDate?: string;
    motivation: string;
    shippingAddress?: { street?: string };
    lineItems: Array<{ productId: string; quantity: number }>;
    priority?: string;
  },
  viewer: RemoteViewer,
) {
  const supabase = getSupabaseClient();
  const productId = await ensureLaptopProductExists();
  const id = makeId("order");
  const now = new Date().toISOString();
  const orderResult = await supabase.from("orders").insert({
    id,
    organization_id: input.organizationId,
    requester_user_id: input.requesterUserId,
    status: "ingediend",
    priority: normalizePriority(input.priority),
    preferred_delivery_date: input.preferredDeliveryDate ?? null,
    requested_at: now,
    motivation: input.motivation,
    delivery_address: input.shippingAddress?.street ?? "Onbekend",
    stock_badge: "in_stock",
    assigned_service_partner_id: normalizeServicePartnerId(input.servicePartnerOrganizationId),
  });
  assertNoError(orderResult);

  if (input.lineItems.length > 0) {
    const linesResult = await supabase.from("order_lines").insert(
      input.lineItems.map((item) => ({
        id: makeId("orderline"),
        order_id: id,
        product_id: productId,
        quantity: item.quantity,
      })),
    );
    assertNoError(linesResult);
  }

  const workflowResult = await supabase.from("workflow_events").insert({
    id: makeId("event"),
    case_type: "order",
    case_id: id,
    status: "ingediend",
    title: "Nieuwe orderaanvraag",
    description: "Orderaanvraag is ingediend.",
    created_at: now,
    actor_role: viewer.role,
    actor_name: viewer.name,
    metadata: { actorUserId: viewer.userId },
  });
  assertNoError(workflowResult);

  await addPreparedSyncJob("order", id, "order", ["Order aangemaakt"]);

  return id;
}

export async function createRemoteRepair(
  input: {
    organizationId: string;
    requesterUserId: string;
    servicePartnerOrganizationId?: string;
    serialNumber: string;
    issueType: string;
    notes: string;
    photoPlaceholders?: string[];
  },
  viewer: RemoteViewer,
) {
  const supabase = getSupabaseClient();
  await ensureLaptopProductExists();
  const id = makeId("repair");
  const now = new Date().toISOString();
  const result = await supabase.from("repair_cases").insert({
    id,
    organization_id: input.organizationId,
    requester_user_id: input.requesterUserId,
    status: "ONTVANGEN",
    subtype: input.issueType === "accessoireprobleem" ? "ACCESSORY_ISSUE" : "GENERAL_REPAIR",
    serial_number: input.serialNumber,
    issue_type: input.issueType,
    notes: input.notes,
    photo_placeholder_count: input.photoPlaceholders?.length ?? 0,
    received_at: now,
    assigned_service_partner_id: normalizeServicePartnerId(input.servicePartnerOrganizationId),
  });
  assertNoError(result);

  const workflowResult = await supabase.from("workflow_events").insert({
    id: makeId("event"),
    case_type: "repair",
    case_id: id,
    status: "ONTVANGEN",
    title: "Nieuw reparatieverzoek",
    description: "Reparatieverzoek is ontvangen.",
    created_at: now,
    actor_role: viewer.role,
    actor_name: viewer.name,
    metadata: { actorUserId: viewer.userId },
  });
  assertNoError(workflowResult);

  await addPreparedSyncJob("repair", id, "repair", ["Repair aangemaakt"]);

  return id;
}

export async function createRemoteDonation(
  input: {
    donorOrganizationId: string;
    servicePartnerOrganizationId?: string;
    deviceCount: number;
    estimatedPickupDate?: string;
    contactName?: string;
    contactEmail: string;
    street?: string;
    notes?: string;
  },
  viewer: RemoteViewer,
) {
  const supabase = getSupabaseClient();
  const id = makeId("donation");
  const now = new Date().toISOString();
  const result = await supabase.from("donation_batches").insert({
    id,
    sponsor_organization_id: input.donorOrganizationId,
    status: "aangemeld",
    device_count_promised: input.deviceCount,
    pickup_address: input.street ?? "Onbekend",
    pickup_contact_name: input.contactName ?? viewer.name,
    pickup_contact_email: input.contactEmail,
    pickup_window: input.estimatedPickupDate ?? null,
    registered_at: now,
    assigned_service_partner_id: normalizeServicePartnerId(input.servicePartnerOrganizationId),
    notes: input.notes ?? null,
  });
  assertNoError(result);

  const workflowResult = await supabase.from("workflow_events").insert({
    id: makeId("event"),
    case_type: "donation",
    case_id: id,
    status: "aangemeld",
    title: "Nieuwe donatiebatch",
    description: "Donatiebatch is geregistreerd.",
    created_at: now,
    actor_role: viewer.role,
    actor_name: viewer.name,
    metadata: { actorUserId: viewer.userId },
  });
  assertNoError(workflowResult);

  await addPreparedSyncJob("donation", id, "donation", ["Donatiebatch aangemaakt"]);

  return id;
}

export async function updateRemoteCaseStatus(
  kind: "order" | "repair" | "donation",
  caseId: string,
  nextStatus: OrderStatus | RepairStatus | DonationStatus,
  viewer: RemoteViewer,
  extra?: {
    refurbishableCount?: number;
    rejectedCount?: number;
    replacementOffered?: boolean;
  },
) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  let previousOrderStatus: OrderStatus | null = null;

  if (kind === "order") {
    const previousOrderResult = await supabase.from("orders").select("status").eq("id", caseId).maybeSingle();
    assertNoError(previousOrderResult);
    previousOrderStatus = previousOrderResult.data?.status ?? null;
    const result = await supabase
      .from("orders")
      .update({ status: nextStatus as any, updated_at: now })
      .eq("id", caseId);
    assertNoError(result);
  } else if (kind === "repair") {
    const result = await supabase
      .from("repair_cases")
      .update({
        status: nextStatus as any,
        replacement_offered: extra?.replacementOffered ?? undefined,
        updated_at: now,
      })
      .eq("id", caseId);
    assertNoError(result);
  } else {
    const result = await supabase
      .from("donation_batches")
      .update({
        status: nextStatus as any,
        refurbish_ready_count: extra?.refurbishableCount ?? undefined,
        rejected_count: extra?.rejectedCount ?? undefined,
        updated_at: now,
      })
      .eq("id", caseId);
    assertNoError(result);
  }

  const workflowResult = await supabase.from("workflow_events").insert({
    id: makeId("event"),
    case_type: kind,
    case_id: caseId,
    status: nextStatus,
    title: `${kind}status ${nextStatus}`,
    description: `${kind}status gewijzigd naar ${nextStatus}.`,
    created_at: now,
    actor_role: viewer.role,
    actor_name: viewer.name,
    metadata: { actorUserId: viewer.userId },
  });
  assertNoError(workflowResult);

  if (kind === "order" && previousOrderStatus) {
    await reconcileRemoteOrderInventory(caseId, previousOrderStatus, nextStatus as OrderStatus);
  }

  await addPreparedSyncJob(kind, caseId, kind, [`Status naar ${nextStatus}`]);
}

export async function createRemoteMessage(
  input: {
    subjectType: "order" | "repair" | "donation";
    subjectId: string;
    authorUserId?: string;
    body: string;
  },
  viewer: RemoteViewer,
) {
  const supabase = getSupabaseClient();
  const result = await supabase.from("messages").insert({
    id: makeId("message"),
    case_type: input.subjectType,
    case_id: input.subjectId,
    author_user_id: input.authorUserId ?? viewer.userId,
    author_role: viewer.role,
    author_name: viewer.name,
    kind: "manual",
    body: input.body,
    created_at: new Date().toISOString(),
    internal_only: false,
  });
  assertNoError(result);
}

export async function createRemoteDocument(
  input: {
    subjectType: "order" | "repair" | "donation";
    subjectId: string;
    uploadedByUserId?: string;
    fileName: string;
    mimeType?: string;
    sizeLabel?: string;
  },
  viewer: RemoteViewer,
) {
  const supabase = getSupabaseClient();
  const result = await supabase.from("documents").insert({
    id: makeId("document"),
    case_type: input.subjectType,
    case_id: input.subjectId,
    file_name: input.fileName,
    file_size_label: input.sizeLabel ?? "Metadata only",
    mime_type: input.mimeType ?? "application/pdf",
    uploaded_at: new Date().toISOString(),
    uploaded_by_user_id: input.uploadedByUserId ?? viewer.userId,
    uploaded_by_name: viewer.name,
    kind: "other",
    storage_mode: "metadata_only",
  });
  assertNoError(result);
}

export async function recordRemoteStockMutation(productId: string, delta: number) {
  const resolvedProductId =
    productId === DEFAULT_LAPTOP_PRODUCT_ID ? productId : await ensureLaptopProductExists();
  const supabase = getSupabaseClient();
  const inventoryResult = await supabase
    .from("inventory_items")
    .select("*")
    .eq("product_id", resolvedProductId)
    .is("serial_number", null)
    .limit(1)
    .maybeSingle();
  assertNoError(inventoryResult);

  if (!inventoryResult.data) {
    return;
  }

  const result = await supabase
    .from("inventory_items")
    .update({
      quantity: Math.max(0, Number(inventoryResult.data.quantity ?? 0) + delta),
      available_quantity: Math.max(0, Number(inventoryResult.data.available_quantity ?? 0) + delta),
      last_mutation_at: new Date().toISOString(),
    })
    .eq("id", inventoryResult.data.id);
  assertNoError(result);
  await syncLaptopProductStock(resolvedProductId);
}

export async function importRemoteInventory(rows: InventoryImportRow[]) {
  const productId = await ensureLaptopProductExists();
  await upsertInventoryImportRows(productId, rows);
}
