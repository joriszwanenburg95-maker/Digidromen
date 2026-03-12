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
      name: item.name,
      category: item.category,
      description: item.description,
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
      stockBadge: item.stock_badge,
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
      status: item.status,
      title: item.title,
      description: item.description,
      createdAt: item.created_at,
      actorRole: item.actor_role,
      actorName: item.actor_name,
      metadata: item.metadata ?? undefined,
    })),
  );

  const messages = toRecord(
    (messagesResult.data ?? []).map<Message>((item) => ({
      id: item.id,
      caseType: item.case_type,
      caseId: item.case_id,
      authorUserId: item.author_user_id ?? undefined,
      authorRole: item.author_role,
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
      kind: item.kind,
      storageMode: item.storage_mode,
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
  const id = makeId("order");
  const now = new Date().toISOString();
  const orderResult = await supabase.from("orders").insert({
    id,
    organization_id: input.organizationId,
    requester_user_id: input.requesterUserId,
    status: "INGEDIEND",
    priority: input.priority ?? "normal",
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
        product_id: item.productId,
        quantity: item.quantity,
      })),
    );
    assertNoError(linesResult);
  }

  const workflowResult = await supabase.from("workflow_events").insert({
    id: makeId("event"),
    case_type: "order",
    case_id: id,
    status: "INGEDIEND",
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
    status: "TOEGEZEGD",
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
    status: "TOEGEZEGD",
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

  if (kind === "order") {
    const result = await supabase
      .from("orders")
      .update({ status: nextStatus, updated_at: now })
      .eq("id", caseId);
    assertNoError(result);
  } else if (kind === "repair") {
    const result = await supabase
      .from("repair_cases")
      .update({
        status: nextStatus,
        replacement_offered: extra?.replacementOffered ?? undefined,
        updated_at: now,
      })
      .eq("id", caseId);
    assertNoError(result);
  } else {
    const result = await supabase
      .from("donation_batches")
      .update({
        status: nextStatus,
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
  const supabase = getSupabaseClient();
  const inventoryResult = await supabase
    .from("inventory_items")
    .select("id, quantity, available_quantity")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();
  assertNoError(inventoryResult);

  if (!inventoryResult.data) {
    return;
  }

  const result = await supabase
    .from("inventory_items")
    .update({
      quantity: Math.max(0, inventoryResult.data.quantity + delta),
      available_quantity: Math.max(0, inventoryResult.data.available_quantity + delta),
      last_mutation_at: new Date().toISOString(),
    })
    .eq("id", inventoryResult.data.id);
  assertNoError(result);
}
