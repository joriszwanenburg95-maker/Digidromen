import type {
  DashboardAction,
  DashboardMetric,
  DashboardView,
  DocumentRecord,
  DonationBatch,
  Message,
  Notification,
  Order,
  Organization,
  PortalData,
  Product,
  RepairCase,
  Role,
  User,
  WorkflowEvent,
} from "../contracts";
import type { PersistedUiState } from "../contracts";

const SERVICE_PARTNER_ID = "org-aces-direct";

function iso(day: number, time: string): string {
  return `2026-03-${String(day).padStart(2, "0")}T${time}:00:00.000Z`;
}

function createId(prefix: string, value: string): string {
  return `${prefix}-${value}`;
}

export const DEFAULT_ACTIVE_ROLE: Role = "help_org";

export const DEFAULT_UI_STATE: PersistedUiState = {
  routeFilters: {},
  activeTabs: {},
  dismissedNotificationIds: [],
  expandedCaseIds: [],
};

export const DEMO_USER_BY_ROLE: Record<Role, string> = {
  help_org: "user-help-amsterdam",
  digidromen_staff: "user-digidromen-operations",
  digidromen_admin: "user-digidromen-admin",
  service_partner: "user-aces-logistics",
};

export function createSeedData(): PortalData {
  const data: PortalData = {
    organizations: {},
    users: {},
    products: {},
    inventoryItems: {},
    orders: {},
    repairs: {},
    donations: {},
    documents: {},
    messages: {},
    notifications: {},
    workflowEvents: {},
    crmSync: {
      jobs: {},
      queueOrder: [],
      health: "degraded",
      lastSweepAt: iso(10, "08"),
    },
  };

  const organizations: Organization[] = [
    { id: "org-digidromen", name: "Digidromen", type: "digidromen", city: "Den Bosch", contactName: "Karin van der Leest", contactEmail: "portal@digidromen.nl", active: true, crmRelationId: "CRM-REL-DD-001" },
    { id: "org-help-amsterdam", name: "Jeugdfonds Amsterdam", type: "help_org", city: "Amsterdam", contactName: "Sanne de Vries", contactEmail: "sanne@jeugdfonds.nl", active: true, crmRelationId: "CRM-REL-HO-101" },
    { id: "org-help-rotterdam", name: "Buurtteam Rotterdam Zuid", type: "help_org", city: "Rotterdam", contactName: "Mourad El Idrissi", contactEmail: "mourad@buurtteam.nl", active: true, crmRelationId: "CRM-REL-HO-102" },
    { id: "org-help-eindhoven", name: "Stichting Leerkans Eindhoven", type: "help_org", city: "Eindhoven", contactName: "Linda van Dijk", contactEmail: "linda@leerkans.nl", active: true, crmRelationId: "CRM-REL-HO-103" },
    { id: SERVICE_PARTNER_ID, name: "Aces Direct Service Desk", type: "service_partner", city: "Tilburg", contactName: "Tom van Aalst", contactEmail: "operations@acesdirect.nl", active: true, crmRelationId: "CRM-REL-SP-201" },
    { id: "org-techforgood", name: "Tech for Good BV", type: "sponsor", city: "Utrecht", contactName: "Eva Bosman", contactEmail: "impact@techforgood.nl", active: true, crmRelationId: "CRM-REL-DO-301" },
    { id: "org-nexbyte", name: "Nexbyte Nederland", type: "sponsor", city: "Amersfoort", contactName: "Rick van Hout", contactEmail: "donaties@nexbyte.nl", active: true, crmRelationId: "CRM-REL-DO-302" },
    { id: "org-philips", name: "Philips Foundation", type: "sponsor", city: "Eindhoven", contactName: "Maaike Smit", contactEmail: "foundation@philips.com", active: true, crmRelationId: "CRM-REL-DO-303" },
  ];

  const users: User[] = [
    { id: "user-help-amsterdam", organizationId: "org-help-amsterdam", name: "Sanne de Vries", email: "sanne@jeugdfonds.nl", role: "help_org", title: "Casebegeleider" },
    { id: "user-help-rotterdam", organizationId: "org-help-rotterdam", name: "Mourad El Idrissi", email: "mourad@buurtteam.nl", role: "help_org", title: "Coordinator" },
    { id: "user-help-eindhoven", organizationId: "org-help-eindhoven", name: "Linda van Dijk", email: "linda@leerkans.nl", role: "help_org", title: "Projectleider" },
    { id: "user-digidromen-operations", organizationId: "org-digidromen", name: "Noah Janssen", email: "operations@digidromen.nl", role: "digidromen_staff", title: "Operations" },
    { id: "user-digidromen-admin", organizationId: "org-digidromen", name: "Karin van der Leest", email: "karin@digidromen.nl", role: "digidromen_admin", title: "Beheerder" },
    { id: "user-aces-logistics", organizationId: SERVICE_PARTNER_ID, name: "Tom van Aalst", email: "tom.vanaalst@acesdirect.nl", role: "service_partner", title: "Logistics" },
  ];

  const products: Product[] = [
    { id: "product-dell-14", sku: "LAT-14-EDU", name: "Dell Latitude 14 Education", category: "laptop", description: "Refurbished 14 inch laptop voor onderwijsgebruik.", stockOnHand: 24, stockReserved: 6, specificationSummary: ["14 inch", "Intel i5", "8GB RAM", "256GB SSD"], active: true },
    { id: "product-lenovo-13", sku: "TP-13-REF", name: "Lenovo ThinkPad 13 Refurb", category: "laptop", description: "Compacte refurbished laptop voor leerlinguitlevering.", stockOnHand: 7, stockReserved: 4, specificationSummary: ["13 inch", "Intel i5", "8GB RAM", "256GB SSD"], active: true },
    { id: "product-hp-840", sku: "HP-840-G5", name: "HP EliteBook 840 G5", category: "laptop", description: "Zakelijke laptop met robuuste behuizing.", stockOnHand: 18, stockReserved: 5, specificationSummary: ["14 inch", "Intel i5", "8GB RAM", "256GB SSD"], active: true },
    { id: "product-sleeve-14", sku: "ACC-SLV-14", name: "Laptop Sleeve 14 inch", category: "accessory", description: "Beschermhoes voor 14 inch laptops.", stockOnHand: 42, stockReserved: 8, specificationSummary: ["vilt", "14 inch"], active: true },
    { id: "product-mouse-wireless", sku: "ACC-MSE-WL", name: "Wireless Mouse", category: "accessory", description: "Draadloze muis voor thuisgebruik.", stockOnHand: 31, stockReserved: 5, specificationSummary: ["2.4GHz", "USB receiver"], active: true },
    { id: "product-charger-65w", sku: "ACC-CHR-65W", name: "USB-C Charger 65W", category: "accessory", description: "Universele 65W USB-C oplader.", stockOnHand: 8, stockReserved: 2, specificationSummary: ["USB-C", "65W"], active: true },
  ];

  organizations.forEach((item) => { data.organizations[item.id] = item; });
  users.forEach((item) => { data.users[item.id] = item; });
  products.forEach((item) => { data.products[item.id] = item; });

  [
    { id: "inventory-dell-14", productId: "product-dell-14", warehouseLocation: "Warehouse Den Bosch", condition: "refurbished", quantity: 24, availableQuantity: 24, lastMutationAt: iso(10, "08") },
    { id: "inventory-lenovo-13", productId: "product-lenovo-13", warehouseLocation: "Warehouse Den Bosch", condition: "reserved", quantity: 7, availableQuantity: 7, lastMutationAt: iso(10, "08") },
    { id: "inventory-hp-840", productId: "product-hp-840", warehouseLocation: "Warehouse Den Bosch", condition: "refurbished", quantity: 18, availableQuantity: 18, lastMutationAt: iso(10, "08") },
    { id: "inventory-sleeve", productId: "product-sleeve-14", warehouseLocation: "Warehouse Den Bosch", condition: "new", quantity: 42, availableQuantity: 42, lastMutationAt: iso(10, "08") },
    { id: "inventory-mouse", productId: "product-mouse-wireless", warehouseLocation: "Warehouse Den Bosch", condition: "new", quantity: 31, availableQuantity: 31, lastMutationAt: iso(10, "08") },
    { id: "inventory-charger", productId: "product-charger-65w", warehouseLocation: "Warehouse Den Bosch", condition: "new", quantity: 8, availableQuantity: 8, lastMutationAt: iso(10, "08") },
  ].forEach((item) => { data.inventoryItems[item.id] = item; });

  const orders: Order[] = [
    { id: "order-1001", organizationId: "org-help-amsterdam", requesterUserId: "user-help-amsterdam", status: "IN_BEHANDELING", priority: "high", preferredDeliveryDate: "2026-03-15", requestedAt: iso(3, "09"), motivation: "Tien leerlingen hebben nog geen eigen laptop voor online huiswerk.", deliveryAddress: "Sarphatistraat 10, 1018 GL Amsterdam", lineItems: [{ id: "orderline-1001", productId: "product-dell-14", quantity: 10 }], stockBadge: "in_stock", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(10, "08"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-101", crmCaseId: "CRM-CAS-1001", crmTaskId: "CRM-TASK-1001" },
    { id: "order-1002", organizationId: "org-help-rotterdam", requesterUserId: "user-help-rotterdam", status: "BEOORDEELD", priority: "urgent", preferredDeliveryDate: "2026-03-13", requestedAt: iso(4, "11"), motivation: "Spoeduitgifte voor examenkandidaten.", deliveryAddress: "Hillevliet 95, 3073 KD Rotterdam", lineItems: [{ id: "orderline-1002", productId: "product-hp-840", quantity: 6 }], stockBadge: "in_stock", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(10, "07"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-102", crmCaseId: "CRM-CAS-1002", crmTaskId: "CRM-TASK-1002" },
    { id: "order-1003", organizationId: "org-help-eindhoven", requesterUserId: "user-help-eindhoven", status: "INGEDIEND", priority: "normal", preferredDeliveryDate: "2026-03-22", requestedAt: iso(8, "13"), motivation: "Nieuwe intakegroep start volgende week.", deliveryAddress: "Insulindelaan 58, 5612 AZ Eindhoven", lineItems: [{ id: "orderline-1003", productId: "product-lenovo-13", quantity: 4 }], stockBadge: "limited", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(10, "06"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-103", crmCaseId: "CRM-CAS-1003", crmTaskId: "CRM-TASK-1003" },
    { id: "order-1004", organizationId: "org-help-amsterdam", requesterUserId: "user-help-amsterdam", status: "VERZONDEN", priority: "high", preferredDeliveryDate: "2026-03-12", requestedAt: iso(2, "10"), motivation: "Aanvulling voor huiswerkbegeleiding.", deliveryAddress: "Sarphatistraat 10, 1018 GL Amsterdam", lineItems: [{ id: "orderline-1004", productId: "product-hp-840", quantity: 5 }], stockBadge: "in_stock", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(9, "17"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-101", crmCaseId: "CRM-CAS-1004", crmTaskId: "CRM-TASK-1004" },
    { id: "order-1005", organizationId: "org-help-rotterdam", requesterUserId: "user-help-rotterdam", status: "GELEVERD", priority: "normal", preferredDeliveryDate: "2026-03-08", requestedAt: iso(1, "12"), motivation: "Voor wijklokaal en digitale training.", deliveryAddress: "Hillevliet 95, 3073 KD Rotterdam", lineItems: [{ id: "orderline-1005", productId: "product-dell-14", quantity: 3 }], stockBadge: "in_stock", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(8, "16"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-102", crmCaseId: "CRM-CAS-1005", crmTaskId: "CRM-TASK-1005" },
    { id: "order-1006", organizationId: "org-help-eindhoven", requesterUserId: "user-help-eindhoven", status: "AFGESLOTEN", priority: "low", preferredDeliveryDate: "2026-03-01", requestedAt: iso(1, "08"), motivation: "Kleine uitbreiding voor mentorprogramma.", deliveryAddress: "Insulindelaan 58, 5612 AZ Eindhoven", lineItems: [{ id: "orderline-1006", productId: "product-lenovo-13", quantity: 2 }], stockBadge: "limited", assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(7, "15"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-103", crmCaseId: "CRM-CAS-1006", crmTaskId: "CRM-TASK-1006" },
  ];

  const repairs: RepairCase[] = [
    { id: "repair-2001", organizationId: "org-help-amsterdam", requesterUserId: "user-help-amsterdam", status: "DIAGNOSE", subtype: "GENERAL_REPAIR", serialNumber: "SN-DD-1001", issueType: "screen", notes: "Beeld flikkert sinds gisteren.", photoPlaceholderCount: 2, receivedAt: iso(7, "09"), assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(10, "08"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-101", crmCaseId: "CRM-REP-2001", crmTaskId: "CRM-TASK-R-2001" },
    { id: "repair-2002", organizationId: "org-help-rotterdam", requesterUserId: "user-help-rotterdam", status: "IN_REPARATIE", subtype: "GENERAL_REPAIR", serialNumber: "SN-HP-3001", issueType: "battery", notes: "Batterij laadt niet meer op.", photoPlaceholderCount: 1, receivedAt: iso(6, "10"), assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(10, "07"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-102", crmCaseId: "CRM-REP-2002", crmTaskId: "CRM-TASK-R-2002" },
    { id: "repair-2003", organizationId: "org-help-eindhoven", requesterUserId: "user-help-eindhoven", status: "TEST", subtype: "ACCESSORY_ISSUE", serialNumber: "ACC-CHR-9001", issueType: "accessoireprobleem", notes: "Oplader wordt te heet; vervangend exemplaar nodig.", photoPlaceholderCount: 1, receivedAt: iso(5, "14"), assignedServicePartnerId: SERVICE_PARTNER_ID, replacementOffered: true, lastUpdatedAt: iso(10, "07"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-103", crmCaseId: "CRM-REP-2003", crmTaskId: "CRM-TASK-R-2003" },
    { id: "repair-2004", organizationId: "org-help-amsterdam", requesterUserId: "user-help-amsterdam", status: "RETOUR", subtype: "GENERAL_REPAIR", serialNumber: "SN-LN-2202", issueType: "software", notes: "Windows herinstallatie afgerond.", photoPlaceholderCount: 0, receivedAt: iso(3, "15"), assignedServicePartnerId: SERVICE_PARTNER_ID, lastUpdatedAt: iso(9, "11"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-HO-101", crmCaseId: "CRM-REP-2004", crmTaskId: "CRM-TASK-R-2004" },
  ];

  const donations: DonationBatch[] = [
    { id: "donation-3001", sponsorOrganizationId: "org-techforgood", status: "IN_VERWERKING", deviceCountPromised: 40, pickupAddress: "Jaarbeursplein 12, Utrecht", pickupContactName: "Eva Bosman", pickupContactEmail: "impact@techforgood.nl", pickupWindow: "11 maart 09:00-12:00", registeredAt: iso(2, "09"), assignedServicePartnerId: SERVICE_PARTNER_ID, refurbishReadyCount: 28, rejectedCount: 3, notes: "Combinatie van laptops en accessoires.", lastUpdatedAt: iso(10, "08"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-DO-301", crmCaseId: "CRM-DON-3001", crmTaskId: "CRM-TASK-D-3001" },
    { id: "donation-3002", sponsorOrganizationId: "org-nexbyte", status: "TOEGEZEGD", deviceCountPromised: 25, pickupAddress: "Stationsstraat 21, Amersfoort", pickupContactName: "Rick van Hout", pickupContactEmail: "donaties@nexbyte.nl", pickupWindow: "18 maart 13:00-15:00", registeredAt: iso(9, "12"), assignedServicePartnerId: SERVICE_PARTNER_ID, notes: "Ophaalbevestiging nog open.", lastUpdatedAt: iso(9, "12"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-DO-302", crmCaseId: "CRM-DON-3002", crmTaskId: "CRM-TASK-D-3002" },
    { id: "donation-3003", sponsorOrganizationId: "org-philips", status: "RAPPORTAGE_GEREED", deviceCountPromised: 32, pickupAddress: "High Tech Campus 32, Eindhoven", pickupContactName: "Maaike Smit", pickupContactEmail: "foundation@philips.com", pickupWindow: "5 maart 10:00-12:00", registeredAt: iso(1, "16"), assignedServicePartnerId: SERVICE_PARTNER_ID, refurbishReadyCount: 20, rejectedCount: 4, notes: "Wacht op formele vrijgave naar voorraad.", lastUpdatedAt: iso(10, "07"), workflowEventIds: [], messageIds: [], documentIds: [], crmRelationId: "CRM-REL-DO-303", crmCaseId: "CRM-DON-3003", crmTaskId: "CRM-TASK-D-3003" },
  ];

  orders.forEach((item) => { data.orders[item.id] = item; });
  repairs.forEach((item) => { data.repairs[item.id] = item; });
  donations.forEach((item) => { data.donations[item.id] = item; });

  seedArtifacts(data);

  return data;
}

export function buildDashboardView(data: PortalData, role: Role): DashboardView {
  const orders = visibleCaseIds(data, "order", role);
  const repairs = visibleCaseIds(data, "repair", role);
  const donations = role === "help_org" ? [] : visibleCaseIds(data, "donation", role);
  const metrics: DashboardMetric[] =
    role === "help_org"
      ? [
          { id: "open-orders", label: "Open bestellingen", value: String(orders.filter((id) => !["AFGESLOTEN", "GEANNULEERD"].includes(data.orders[id].status)).length) },
          { id: "open-repairs", label: "Open reparaties", value: String(repairs.filter((id) => data.repairs[id].status !== "AFGESLOTEN").length) },
          { id: "docs", label: "Recente documenten", value: String(latestDocumentIds(data, role).length) },
          { id: "notifications", label: "Nieuwe meldingen", value: String(selectNotifications(data, role).length) },
        ]
      : role === "service_partner"
        ? [
            { id: "shipments", label: "Zendingen", value: String(orders.length) },
            { id: "repairs", label: "Open repairs", value: String(repairs.length) },
            { id: "donations", label: "Pickup batches", value: String(donations.length) },
            { id: "sync", label: "Queue alerts", value: String(Object.values(data.crmSync.jobs).filter((job) => job.state !== "synced").length) },
          ]
        : [
            { id: "orders", label: "Open orders", value: String(orders.filter((id) => !["AFGESLOTEN", "GEANNULEERD"].includes(data.orders[id].status)).length) },
            { id: "repairs", label: "Open repairs", value: String(repairs.filter((id) => data.repairs[id].status !== "AFGESLOTEN").length) },
            { id: "donations", label: "Open donations", value: String(donations.filter((id) => data.donations[id].status !== "OP_VOORRAAD").length) },
            { id: "crm", label: "CRM failures", value: String(Object.values(data.crmSync.jobs).filter((job) => job.state === "failed").length) },
          ];
  const pendingActions: DashboardAction[] = [
    orders[0] ? { id: "order-action", label: "Open order", route: `/orders/${orders[0]}`, relatedCaseType: "order", relatedCaseId: orders[0] } : null,
    repairs[0] ? { id: "repair-action", label: "Open repair", route: `/repairs/${repairs[0]}`, relatedCaseType: "repair", relatedCaseId: repairs[0] } : null,
    donations[0] ? { id: "donation-action", label: "Open donation", route: `/donations/${donations[0]}`, relatedCaseType: "donation", relatedCaseId: donations[0] } : null,
  ].filter((item): item is DashboardAction => Boolean(item));
  return {
    role,
    metrics,
    pendingActions,
    recentDocumentIds: latestDocumentIds(data, role),
    spotlightCaseIds: [...orders.slice(0, 2), ...repairs.slice(0, 1), ...donations.slice(0, 1)].slice(0, 4),
  };
}

function seedArtifacts(data: PortalData): void {
  const addEvent = (caseType: WorkflowEvent["caseType"], caseId: string, status: WorkflowEvent["status"], title: string, description: string, createdAt: string, actorRole: WorkflowEvent["actorRole"], actorName: string) => {
    const eventId = createId("event", `${caseId}-${Object.keys(data.workflowEvents).length + 1}`);
    data.workflowEvents[eventId] = { id: eventId, caseType, caseId, status, title, description, createdAt, actorRole, actorName };
    getCase(data, caseType, caseId).workflowEventIds.push(eventId);
  };
  const addMessage = (message: Omit<Message, "id">) => {
    const id = createId("message", `${message.caseId}-${Object.keys(data.messages).length + 1}`);
    data.messages[id] = { id, ...message };
    getCase(data, message.caseType, message.caseId).messageIds.push(id);
  };
  const addDocument = (document: Omit<DocumentRecord, "id">) => {
    const id = createId("document", `${document.caseId}-${Object.keys(data.documents).length + 1}`);
    data.documents[id] = { id, ...document };
    getCase(data, document.caseType, document.caseId).documentIds.push(id);
  };
  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = createId("notification", String(Object.keys(data.notifications).length + 1));
    data.notifications[id] = { id, ...notification };
  };

  addEvent("order", "order-1001", "INGEDIEND", "Order ontvangen", "Order is in het portaal ontvangen.", iso(3, "09"), "help_org", "Sanne de Vries");
  addEvent("order", "order-1001", "BEOORDEELD", "Order beoordeeld", "Order is beoordeeld door operations.", iso(4, "11"), "digidromen_staff", "Noah Janssen");
  addEvent("order", "order-1001", "IN_BEHANDELING", "Order in behandeling", "Picken gestart voor levering.", iso(10, "08"), "digidromen_staff", "Noah Janssen");
  addEvent("order", "order-1002", "BEOORDEELD", "Spoedorder beoordeeld", "Spoedorder vraagt snelle opvolging.", iso(10, "07"), "digidromen_staff", "Noah Janssen");
  addEvent("order", "order-1004", "VERZONDEN", "Zending aangemeld", "Pakket is aangemeld bij vervoerder.", iso(9, "17"), "service_partner", "Tom van Aalst");
  addEvent("order", "order-1005", "GELEVERD", "Bestelling geleverd", "Levering bevestigd door servicepartner.", iso(8, "16"), "service_partner", "Tom van Aalst");
  addEvent("repair", "repair-2001", "DIAGNOSE", "Diagnose gestart", "Schermdefect wordt onderzocht.", iso(10, "08"), "digidromen_staff", "Noah Janssen");
  addEvent("repair", "repair-2002", "IN_REPARATIE", "Batterij vervangen", "Nieuwe accu wordt ingebouwd.", iso(10, "07"), "service_partner", "Tom van Aalst");
  addEvent("repair", "repair-2003", "TEST", "Vervangende oplader getest", "Adapter wordt gevalideerd.", iso(10, "07"), "service_partner", "Tom van Aalst");
  addEvent("repair", "repair-2004", "RETOUR", "Retourzending", "Apparaat klaar voor terugsturen.", iso(9, "11"), "service_partner", "Tom van Aalst");
  addEvent("donation", "donation-3001", "IN_VERWERKING", "Intake gestart", "Eerste 20 apparaten zijn beoordeeld.", iso(10, "08"), "service_partner", "Tom van Aalst");
  addEvent("donation", "donation-3002", "TOEGEZEGD", "Donatie toegezegd", "Batch wacht op pickup planning.", iso(9, "12"), "digidromen_staff", "Noah Janssen");
  addEvent("donation", "donation-3003", "RAPPORTAGE_GEREED", "Rapport gereed", "Refurbishrapport wacht op vrijgave.", iso(10, "07"), "service_partner", "Tom van Aalst");

  addMessage({ caseType: "order", caseId: "order-1001", authorUserId: "user-digidromen-operations", authorRole: "digidromen_staff", authorName: "Noah Janssen", kind: "manual", body: "We plannen levering voor begin volgende week.", createdAt: iso(10, "08") });
  addMessage({ caseType: "repair", caseId: "repair-2003", authorUserId: "user-aces-logistics", authorRole: "service_partner", authorName: "Tom van Aalst", kind: "manual", body: "We sturen een vervangende oplader mee zodra de test is afgerond.", createdAt: iso(10, "07") });
  addMessage({ caseType: "donation", caseId: "donation-3001", authorUserId: "user-aces-logistics", authorRole: "service_partner", authorName: "Tom van Aalst", kind: "manual", body: "Van de eerste 20 apparaten zijn er 15 direct inzetbaar.", createdAt: iso(10, "08") });

  addDocument({ caseType: "order", caseId: "order-1001", fileName: "aanvraag-order-1001.pdf", fileSizeLabel: "1.2 MB", mimeType: "application/pdf", uploadedAt: iso(3, "09"), uploadedByUserId: "user-help-amsterdam", uploadedByName: "Sanne de Vries", kind: "request_attachment", storageMode: "metadata_only" });
  addDocument({ caseType: "repair", caseId: "repair-2002", fileName: "repair-report-2002.pdf", fileSizeLabel: "860 KB", mimeType: "application/pdf", uploadedAt: iso(10, "07"), uploadedByUserId: "user-aces-logistics", uploadedByName: "Tom van Aalst", kind: "repair_report", storageMode: "metadata_only" });
  addDocument({ caseType: "donation", caseId: "donation-3003", fileName: "refurbish-report-3003.pdf", fileSizeLabel: "1.8 MB", mimeType: "application/pdf", uploadedAt: iso(10, "07"), uploadedByUserId: "user-aces-logistics", uploadedByName: "Tom van Aalst", kind: "donation_report", storageMode: "metadata_only" });

  addNotification({ roleScope: ["help_org"], title: "Orderstatus bijgewerkt", body: "Order order-1001 staat nu in behandeling.", createdAt: iso(10, "08"), channel: "email", level: "info", readByRole: {}, relatedCaseType: "order", relatedCaseId: "order-1001" });
  addNotification({ roleScope: ["digidromen_staff", "digidromen_admin"], title: "Spoedorder vraagt aandacht", body: "Order order-1002 wacht op vervolgactie.", createdAt: iso(10, "07"), channel: "portal", level: "warning", readByRole: {}, relatedCaseType: "order", relatedCaseId: "order-1002" });
  addNotification({ roleScope: ["service_partner"], title: "Nieuwe donatiebatch", body: "Donatie donation-3002 wacht op pickup planning.", createdAt: iso(9, "12"), channel: "portal", level: "info", readByRole: {}, relatedCaseType: "donation", relatedCaseId: "donation-3002" });

  [
    { id: "crm-order-1001", caseType: "order", caseId: "order-1001", state: "synced", entityName: "order", bufferedChanges: [], lastAttemptAt: iso(10, "08"), lastSuccessfulSyncAt: iso(10, "08"), retryCount: 0 },
    { id: "crm-order-1002", caseType: "order", caseId: "order-1002", state: "queued", entityName: "order", bufferedChanges: ["Orderstatus naar BEOORDEELD", "Prioriteit op urgent gezet"], lastAttemptAt: iso(10, "07"), retryCount: 0 },
    { id: "crm-repair-2001", caseType: "repair", caseId: "repair-2001", state: "failed", entityName: "repair", bufferedChanges: ["Reparatiestatus naar DIAGNOSE"], lastAttemptAt: iso(10, "08"), failureReason: "CRM-relatie niet gevonden voor gekoppelde hulporganisatie.", retryCount: 0 },
    { id: "crm-donation-3001", caseType: "donation", caseId: "donation-3001", state: "retrying", entityName: "donation", bufferedChanges: ["Intake geupdate", "Warehouse aankomst bevestigd"], lastAttemptAt: iso(10, "08"), failureReason: "Timeout tijdens documentkoppeling.", retryCount: 1 },
    { id: "crm-donation-3003", caseType: "donation", caseId: "donation-3003", state: "synced", entityName: "donation", bufferedChanges: [], lastAttemptAt: iso(10, "07"), lastSuccessfulSyncAt: iso(10, "07"), retryCount: 0 },
  ].forEach((job) => {
    data.crmSync.jobs[job.id] = job;
    if (job.state === "queued" || job.state === "retrying") {
      data.crmSync.queueOrder.push(job.id);
    }
  });
  data.crmSync.health = "blocked";
}

function getCase(data: PortalData, caseType: "order" | "repair" | "donation", caseId: string) {
  if (caseType === "order") return data.orders[caseId];
  if (caseType === "repair") return data.repairs[caseId];
  return data.donations[caseId];
}

function latestDocumentIds(data: PortalData, role: Role): string[] {
  return Object.values(data.documents)
    .filter((document) => {
      if (role !== "help_org") return true;
      const order = data.orders[document.caseId];
      const repair = data.repairs[document.caseId];
      return order?.organizationId === "org-help-amsterdam" || repair?.organizationId === "org-help-amsterdam";
    })
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .slice(0, 4)
    .map((document) => document.id);
}

function selectNotifications(data: PortalData, role: Role): Notification[] {
  return Object.values(data.notifications).filter((item) => item.roleScope.includes(role));
}

function visibleCaseIds(data: PortalData, caseType: "order" | "repair" | "donation", role: Role): string[] {
  const collection = caseType === "order" ? Object.values(data.orders) : caseType === "repair" ? Object.values(data.repairs) : Object.values(data.donations);
  if (role === "help_org") {
    return collection
      .filter((item) => "organizationId" in item && item.organizationId === "org-help-amsterdam")
      .map((item) => item.id);
  }
  if (role === "service_partner") {
    return collection
      .filter((item) => item.assignedServicePartnerId === SERVICE_PARTNER_ID)
      .map((item) => item.id);
  }
  return collection.map((item) => item.id);
}
