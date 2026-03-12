import type {
  CaseType,
  DashboardAction,
  DashboardView,
  DonationBatch,
  DocumentKind,
  DocumentRecord,
  InventoryItem,
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
  WorkflowStatus,
  CrmSyncJob,
} from "../contracts";
import type { PersistedUiState } from "../contracts";

export const DEFAULT_ACTIVE_ROLE: Role = "help_org";

export const DEFAULT_UI_STATE: PersistedUiState = {
  routeFilters: {},
  activeTabs: {},
  dismissedNotificationIds: [],
  expandedCaseIds: [],
};

export const DEMO_USER_BY_ROLE: Record<Role, string> = {
  help_org: "user-help-amsterdam",
  digidromen_staff: "user-digidromen-staff",
  digidromen_admin: "user-digidromen-admin",
  service_partner: "user-service-partner",
};

type EventSeed = {
  at: string;
  status: WorkflowStatus;
  actorRole: Role | "system";
  actorName: string;
  title: string;
  description: string;
  actorUserId?: string;
};

type MessageSeed = {
  at: string;
  authorRole: Role | "system";
  authorName: string;
  body: string;
  authorUserId?: string;
  kind?: Message["kind"];
  internalOnly?: boolean;
};

type DocumentSeed = {
  at: string;
  uploadedByName: string;
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  kind: DocumentKind;
  uploadedByUserId?: string;
};

function ts(day: number, time: string): string {
  return `2026-03-${String(day).padStart(2, "0")}T${time}:00.000Z`;
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function seedEvent(
  at: string,
  status: WorkflowStatus,
  actorRole: Role | "system",
  actorName: string,
  title: string,
  description: string,
  actorUserId?: string,
): EventSeed {
  return { at, status, actorRole, actorName, title, description, actorUserId };
}

function buildArtifacts(
  caseType: CaseType,
  caseId: string,
  events: EventSeed[],
  messages: MessageSeed[] = [],
  documents: DocumentSeed[] = [],
  roleScope: Role[] = ["help_org", "digidromen_staff", "digidromen_admin"],
) {
  const workflowEvents: WorkflowEvent[] = events.map((event, index) => ({
    id: `${caseId}-event-${index + 1}`,
    caseType,
    caseId,
    status: event.status,
    title: event.title,
    description: event.description,
    createdAt: event.at,
    actorRole: event.actorRole,
    actorName: event.actorName,
    metadata: event.actorUserId ? { actorUserId: event.actorUserId } : undefined,
  }));

  const notifications: Notification[] = events.slice(1).map((event, index) => ({
    id: `${caseId}-notification-${index + 1}`,
    roleScope,
    title: `${caseType} update`,
    body: event.title,
    createdAt: event.at,
    channel: index % 2 === 0 ? "portal" : "email",
    level: "info",
    readByRole: {},
    relatedCaseType: caseType,
    relatedCaseId: caseId,
  }));

  const mappedMessages: Message[] = messages.map((message, index) => ({
    id: `${caseId}-message-${index + 1}`,
    caseType,
    caseId,
    authorUserId: message.authorUserId,
    authorRole: message.authorRole,
    authorName: message.authorName,
    kind: message.kind ?? "manual",
    body: message.body,
    createdAt: message.at,
    internalOnly: message.internalOnly,
  }));

  const mappedDocuments: DocumentRecord[] = documents.map((document, index) => ({
    id: `${caseId}-document-${index + 1}`,
    caseType,
    caseId,
    fileName: document.fileName,
    fileSizeLabel: document.fileSizeLabel,
    mimeType: document.mimeType,
    uploadedAt: document.at,
    uploadedByUserId: document.uploadedByUserId,
    uploadedByName: document.uploadedByName,
    kind: document.kind,
    storageMode: "metadata_only",
  }));

  return {
    workflowEvents,
    notifications,
    messages: mappedMessages,
    documents: mappedDocuments,
  };
}

export function createSeedData(): PortalData {
  orderArtifacts.length = 0;
  repairArtifacts.length = 0;
  donationArtifacts.length = 0;

  const organizations: Organization[] = [
    { id: "org-digidromen", name: "Digidromen", type: "digidromen", city: "Den Bosch", contactName: "Karin van der Leest", contactEmail: "karin@digidromen.nl", active: true, crmRelationId: "CRM-REL-DIGI-001" },
    { id: "org-help-amsterdam", name: "Jeugdfonds Amsterdam", type: "help_org", city: "Amsterdam", contactName: "Sanne de Vries", contactEmail: "sanne@jeugdfonds.nl", active: true, crmRelationId: "CRM-REL-HO-101" },
    { id: "org-help-rotterdam", name: "Buurtteam Rotterdam Zuid", type: "help_org", city: "Rotterdam", contactName: "Mourad El Idrissi", contactEmail: "mourad@buurtteam.nl", active: true, crmRelationId: "CRM-REL-HO-102" },
    { id: "org-help-eindhoven", name: "Stichting Leerkans Eindhoven", type: "help_org", city: "Eindhoven", contactName: "Linda van Dijk", contactEmail: "linda@leerkans.nl", active: true, crmRelationId: "CRM-REL-HO-103" },
    { id: "org-servicepartner", name: "Aces Direct Service Desk", type: "service_partner", city: "Tilburg", contactName: "Tom van Aalst", contactEmail: "tom@acesdirect.nl", active: true, crmRelationId: "CRM-REL-SP-201" },
    { id: "org-sponsor-techforgood", name: "Tech for Good BV", type: "sponsor", city: "Utrecht", contactName: "Eva Bos", contactEmail: "impact@techforgood.nl", active: true, crmRelationId: "CRM-REL-SPONSOR-301" },
    { id: "org-sponsor-nexbyte", name: "Nexbyte Nederland", type: "sponsor", city: "Amersfoort", contactName: "Job Meurs", contactEmail: "donaties@nexbyte.nl", active: true, crmRelationId: "CRM-REL-SPONSOR-302" },
  ];

  const users: User[] = [
    { id: "user-help-amsterdam", organizationId: "org-help-amsterdam", name: "Sanne de Vries", email: "sanne@jeugdfonds.nl", role: "help_org", title: "Coordinatie", avatarLabel: "SD" },
    { id: "user-help-rotterdam", organizationId: "org-help-rotterdam", name: "Mourad El Idrissi", email: "mourad@buurtteam.nl", role: "help_org", title: "Maatschappelijk werker", avatarLabel: "ME" },
    { id: "user-help-eindhoven", organizationId: "org-help-eindhoven", name: "Linda van Dijk", email: "linda@leerkans.nl", role: "help_org", title: "Projectleider", avatarLabel: "LD" },
    { id: "user-digidromen-staff", organizationId: "org-digidromen", name: "Noah Janssen", email: "operations@digidromen.nl", role: "digidromen_staff", title: "Operations", avatarLabel: "NJ" },
    { id: "user-digidromen-admin", organizationId: "org-digidromen", name: "Karin van der Leest", email: "karin@digidromen.nl", role: "digidromen_admin", title: "Beheer", avatarLabel: "KL" },
    { id: "user-service-partner", organizationId: "org-servicepartner", name: "Tom van Aalst", email: "tom@acesdirect.nl", role: "service_partner", title: "Fulfilment lead", avatarLabel: "TV" },
  ];

  const products: Product[] = [
    { id: "product-dell-14", sku: "LAT-14-EDU", name: "Dell Latitude 14 Education", category: "laptop", description: "Refurbished Dell laptop voor onderwijsgebruik.", stockOnHand: 24, stockReserved: 4, specificationSummary: ["14 inch", "i5", "8GB", "256GB SSD"], active: true },
    { id: "product-lenovo-13", sku: "TP-13-REF", name: "Lenovo ThinkPad 13 Refurb", category: "laptop", description: "Compacte refurbished laptop.", stockOnHand: 7, stockReserved: 3, specificationSummary: ["13 inch", "i5", "8GB", "256GB SSD"], active: true },
    { id: "product-sleeve-14", sku: "ACC-SLV-14", name: "Laptop Sleeve 14 inch", category: "accessory", description: "Beschermhoes voor uitlevering.", stockOnHand: 42, stockReserved: 5, specificationSummary: ["14 inch", "grijs vilt"], active: true },
    { id: "product-mouse", sku: "ACC-MSE-WL", name: "Wireless Mouse", category: "accessory", description: "Draadloze muis voor accessoirevervanging.", stockOnHand: 31, stockReserved: 2, specificationSummary: ["2.4GHz", "USB dongle"], active: true },
  ];

  const inventoryItems: InventoryItem[] = [
    { id: "inventory-dell-bulk", productId: "product-dell-14", warehouseLocation: "Tilburg-A1", condition: "refurbished", quantity: 24, availableQuantity: 24, lastMutationAt: ts(9, "16:00") },
    { id: "inventory-lenovo-bulk", productId: "product-lenovo-13", warehouseLocation: "Tilburg-A2", condition: "reserved", quantity: 10, availableQuantity: 7, lastMutationAt: ts(9, "15:30") },
    { id: "inventory-mouse-bulk", productId: "product-mouse", warehouseLocation: "Tilburg-C3", condition: "new", quantity: 31, availableQuantity: 31, lastMutationAt: ts(8, "11:50") },
    { id: "inventory-repair-tp13002", productId: "product-lenovo-13", serialNumber: "TP-13002", warehouseLocation: "Tilburg-Repair", condition: "in_repair", quantity: 1, availableQuantity: 0, lastMutationAt: ts(9, "08:25") },
  ];

  const orders: Order[] = [
    createOrder("order-1001", "org-help-amsterdam", "user-help-amsterdam", "IN_BEHANDELING", "high", ts(17, "09:00"), ts(2, "08:30"), "Nieuwe uitgifte voor vijf brugklasleerlingen.", "Wibautstraat 101, 1091 GL Amsterdam", "limited", [{ id: "orderline-1001-1", productId: "product-dell-14", quantity: 5 }], "org-servicepartner", "CRM-REL-HO-101", "CRM-CASE-ORD-1001", "CRM-TASK-ORD-1001", [
      seedEvent(ts(2, "08:30"), "INGEDIEND", "help_org", "Sanne de Vries", "Aanvraag ingediend", "Aanvraag voor 5 laptops ontvangen.", "user-help-amsterdam"),
      seedEvent(ts(3, "09:20"), "BEOORDEELD", "digidromen_staff", "Noah Janssen", "Aanvraag beoordeeld", "Aanvraag is compleet en akkoord bevonden.", "user-digidromen-staff"),
      seedEvent(ts(5, "10:15"), "IN_BEHANDELING", "digidromen_staff", "Noah Janssen", "Order in behandeling", "Order is ingepland voor fulfilment.", "user-digidromen-staff"),
    ], [{ at: ts(3, "09:30"), authorRole: "digidromen_staff", authorName: "Noah Janssen", body: "Wij hebben de aanvraag gecontroleerd en pakken deze op.", authorUserId: "user-digidromen-staff" }], [{ at: ts(2, "08:31"), uploadedByUserId: "user-help-amsterdam", uploadedByName: "Sanne de Vries", fileName: "aanvraag-cohort-amsterdam.pdf", fileSizeLabel: "184 KB", mimeType: "application/pdf", kind: "request_attachment" }]),
    createOrder("order-1002", "org-help-rotterdam", "user-help-rotterdam", "IN_VOORBEREIDING", "urgent", ts(12, "09:00"), ts(4, "11:10"), "Spoeduitvraag voor twee examenkandidaten.", "Putselaan 12, 3074 JB Rotterdam", "limited", [{ id: "orderline-1002-1", productId: "product-lenovo-13", quantity: 2 }], "org-servicepartner", "CRM-REL-HO-102", "CRM-CASE-ORD-1002", "CRM-TASK-ORD-1002", [
      seedEvent(ts(4, "11:10"), "INGEDIEND", "help_org", "Mourad El Idrissi", "Spoedaanvraag ingediend", "Aanvraag voor 2 laptops is ingestuurd.", "user-help-rotterdam"),
      seedEvent(ts(4, "13:00"), "BEOORDEELD", "digidromen_staff", "Noah Janssen", "Aanvraag beoordeeld", "Aanvraag is als urgent gemarkeerd.", "user-digidromen-staff"),
      seedEvent(ts(5, "09:10"), "IN_BEHANDELING", "digidromen_staff", "Noah Janssen", "Order ingepland", "Order is ingepland voor levering.", "user-digidromen-staff"),
      seedEvent(ts(9, "14:45"), "IN_VOORBEREIDING", "service_partner", "Tom van Aalst", "Picking gestart", "Servicepartner heeft de order gepickt.", "user-service-partner"),
    ]),
    createOrder("order-1003", "org-help-eindhoven", "user-help-eindhoven", "VERZONDEN", "normal", ts(8, "09:00"), ts(1, "15:10"), "Aanvulling voor drie leerlingen in bovenbouw.", "Kanaaldijk 4, 5611 AC Eindhoven", "in_stock", [{ id: "orderline-1003-1", productId: "product-dell-14", quantity: 3 }], "org-servicepartner", "CRM-REL-HO-103", "CRM-CASE-ORD-1003", "CRM-TASK-ORD-1003", [
      seedEvent(ts(1, "15:10"), "INGEDIEND", "help_org", "Linda van Dijk", "Aanvraag ingediend", "Aanvraag voor 3 laptops is ingestuurd.", "user-help-eindhoven"),
      seedEvent(ts(2, "10:05"), "BEOORDEELD", "digidromen_staff", "Noah Janssen", "Aanvraag goedgekeurd", "Aanvraag is akkoord voor fulfilment.", "user-digidromen-staff"),
      seedEvent(ts(3, "10:45"), "IN_BEHANDELING", "digidromen_staff", "Noah Janssen", "Order ingepland", "Order is ingepland voor uitlevering.", "user-digidromen-staff"),
      seedEvent(ts(6, "08:50"), "IN_VOORBEREIDING", "service_partner", "Tom van Aalst", "Pakket samengesteld", "Order is gepickt.", "user-service-partner"),
      seedEvent(ts(8, "13:35"), "VERZONDEN", "service_partner", "Tom van Aalst", "Pakket verzonden", "Track & trace is gedeeld.", "user-service-partner"),
    ]),
    createOrder("order-1004", "org-help-amsterdam", "user-help-amsterdam", "GELEVERD", "normal", ts(5, "09:00"), ts(1, "11:05"), "Herlevering na instroom nieuwe gezinnen.", "Wibautstraat 101, 1091 GL Amsterdam", "limited", [{ id: "orderline-1004-1", productId: "product-lenovo-13", quantity: 1 }], "org-servicepartner", "CRM-REL-HO-101", "CRM-CASE-ORD-1004", "CRM-TASK-ORD-1004", [
      seedEvent(ts(1, "11:05"), "INGEDIEND", "help_org", "Sanne de Vries", "Aanvraag ingediend", "Nieuwe aanvraag ontvangen.", "user-help-amsterdam"),
      seedEvent(ts(2, "09:45"), "BEOORDEELD", "digidromen_staff", "Noah Janssen", "Aanvraag beoordeeld", "Aanvraag is beoordeeld.", "user-digidromen-staff"),
      seedEvent(ts(3, "10:20"), "IN_BEHANDELING", "digidromen_staff", "Noah Janssen", "Order ingepland", "Fulfilment staat klaar.", "user-digidromen-staff"),
      seedEvent(ts(4, "14:00"), "IN_VOORBEREIDING", "service_partner", "Tom van Aalst", "Pakket samengesteld", "Pakket is gepickt.", "user-service-partner"),
      seedEvent(ts(5, "09:40"), "VERZONDEN", "service_partner", "Tom van Aalst", "Pakket verzonden", "Zending is onderweg.", "user-service-partner"),
      seedEvent(ts(7, "16:10"), "GELEVERD", "service_partner", "Tom van Aalst", "Ontvangst bevestigd", "Ontvangst is bevestigd door hulporganisatie.", "user-service-partner"),
    ], [], [{ at: ts(7, "16:20"), uploadedByUserId: "user-help-amsterdam", uploadedByName: "Sanne de Vries", fileName: "pakbon-order-1004.pdf", fileSizeLabel: "98 KB", mimeType: "application/pdf", kind: "shipping_note" }]),
    createOrder("order-1005", "org-help-rotterdam", "user-help-rotterdam", "AFGESLOTEN", "low", ts(28, "09:00"), ts(1, "09:00"), "Batch voor naschoolse begeleiding.", "Putselaan 12, 3074 JB Rotterdam", "in_stock", [{ id: "orderline-1005-1", productId: "product-dell-14", quantity: 4 }], "org-servicepartner", "CRM-REL-HO-102", "CRM-CASE-ORD-1005", "CRM-TASK-ORD-1005", [
      seedEvent(ts(1, "09:00"), "INGEDIEND", "help_org", "Mourad El Idrissi", "Aanvraag ingediend", "Nieuwe batchaanvraag ontvangen.", "user-help-rotterdam"),
      seedEvent(ts(1, "13:20"), "BEOORDEELD", "digidromen_staff", "Noah Janssen", "Aanvraag beoordeeld", "Order is akkoord.", "user-digidromen-staff"),
      seedEvent(ts(2, "09:50"), "IN_BEHANDELING", "digidromen_staff", "Noah Janssen", "Order ingepland", "Order staat in planning.", "user-digidromen-staff"),
      seedEvent(ts(2, "15:00"), "IN_VOORBEREIDING", "service_partner", "Tom van Aalst", "Pakket samengesteld", "Picking gereed.", "user-service-partner"),
      seedEvent(ts(3, "08:00"), "VERZONDEN", "service_partner", "Tom van Aalst", "Pakket verzonden", "Zending onderweg.", "user-service-partner"),
      seedEvent(ts(4, "14:40"), "GELEVERD", "service_partner", "Tom van Aalst", "Levering afgerond", "Zending ontvangen.", "user-service-partner"),
      seedEvent(ts(6, "17:30"), "AFGESLOTEN", "digidromen_staff", "Noah Janssen", "Dossier afgesloten", "CRM-registratie is afgerond.", "user-digidromen-staff"),
    ]),
    createOrder("order-1006", "org-help-eindhoven", "user-help-eindhoven", "GEANNULEERD", "normal", ts(14, "09:00"), ts(8, "09:40"), "Dubbele aanvraag die later is ingetrokken.", "Kanaaldijk 4, 5611 AC Eindhoven", "out_of_stock", [{ id: "orderline-1006-1", productId: "product-lenovo-13", quantity: 1 }], "org-servicepartner", "CRM-REL-HO-103", "CRM-CASE-ORD-1006", "CRM-TASK-ORD-1006", [
      seedEvent(ts(8, "09:40"), "INGEDIEND", "help_org", "Linda van Dijk", "Aanvraag ingediend", "Nieuwe aanvraag ontvangen.", "user-help-eindhoven"),
      seedEvent(ts(8, "12:00"), "GEANNULEERD", "digidromen_staff", "Noah Janssen", "Aanvraag geannuleerd", "Dubbele aanvraag is geannuleerd.", "user-digidromen-staff"),
    ]),
  ];

  const repairs: RepairCase[] = [
    createRepair("repair-2001", "org-help-amsterdam", "user-help-amsterdam", "DIAGNOSE", "GENERAL_REPAIR", "DL-14002", "battery", "Laptop valt na 20 minuten uit.", 2, ts(6, "09:15"), "org-servicepartner", "CRM-REL-HO-101", "CRM-CASE-REP-2001", "CRM-TASK-REP-2001", [
      seedEvent(ts(6, "09:15"), "ONTVANGEN", "help_org", "Sanne de Vries", "Reparatieverzoek ontvangen", "Batterijprobleem gemeld.", "user-help-amsterdam"),
      seedEvent(ts(9, "11:30"), "DIAGNOSE", "service_partner", "Tom van Aalst", "Diagnose gestart", "Servicepartner onderzoekt het batterijprobleem.", "user-service-partner"),
    ], [], [{ at: ts(6, "09:16"), uploadedByUserId: "user-help-amsterdam", uploadedByName: "Sanne de Vries", fileName: "fotos-batterij-probleem.zip", fileSizeLabel: "2.4 MB", mimeType: "application/zip", kind: "request_attachment" }]),
    createRepair("repair-2002", "org-help-rotterdam", "user-help-rotterdam", "IN_REPARATIE", "GENERAL_REPAIR", "TP-13002", "screen", "Scherm flikkert en toont strepen.", 1, ts(4, "16:10"), "org-servicepartner", "CRM-REL-HO-102", "CRM-CASE-REP-2002", "CRM-TASK-REP-2002", [
      seedEvent(ts(4, "16:10"), "ONTVANGEN", "help_org", "Mourad El Idrissi", "Reparatieverzoek ontvangen", "Schermprobleem gemeld.", "user-help-rotterdam"),
      seedEvent(ts(7, "10:35"), "DIAGNOSE", "service_partner", "Tom van Aalst", "Diagnose bevestigd", "Displaydefect vastgesteld.", "user-service-partner"),
      seedEvent(ts(9, "08:25"), "IN_REPARATIE", "service_partner", "Tom van Aalst", "Reparatie gestart", "Displayvervanging is gestart.", "user-service-partner"),
    ]),
    createRepair("repair-2003", "org-help-eindhoven", "user-help-eindhoven", "RETOUR", "ACCESSORY_ISSUE", "DL-14006", "accessoireprobleem", "Muis werkt niet meer; vervanging gewenst.", 1, ts(3, "12:20"), "org-servicepartner", "CRM-REL-HO-103", "CRM-CASE-REP-2003", "CRM-TASK-REP-2003", [
      seedEvent(ts(3, "12:20"), "ONTVANGEN", "help_org", "Linda van Dijk", "Accessoireprobleem gemeld", "Defecte muis gemeld.", "user-help-eindhoven"),
      seedEvent(ts(4, "09:40"), "DIAGNOSE", "service_partner", "Tom van Aalst", "Diagnose afgerond", "Defecte muis bevestigd.", "user-service-partner"),
      seedEvent(ts(5, "13:10"), "IN_REPARATIE", "service_partner", "Tom van Aalst", "Vervanging klaargezet", "Nieuwe accessoire klaargezet.", "user-service-partner"),
      seedEvent(ts(6, "10:00"), "TEST", "service_partner", "Tom van Aalst", "Accessoire getest", "Vervangende accessoire is getest.", "user-service-partner"),
      seedEvent(ts(8, "15:05"), "RETOUR", "service_partner", "Tom van Aalst", "Retour gestart", "Vervangende accessoire is onderweg.", "user-service-partner"),
    ], [], [], true),
    createRepair("repair-2004", "org-help-amsterdam", "user-help-amsterdam", "IRREPARABEL", "GENERAL_REPAIR", "TP-13004", "hardware", "Moederbordschade na vochtincident.", 1, ts(5, "14:20"), "org-servicepartner", "CRM-REL-HO-101", "CRM-CASE-REP-2004", "CRM-TASK-REP-2004", [
      seedEvent(ts(5, "14:20"), "ONTVANGEN", "help_org", "Sanne de Vries", "Reparatieverzoek ontvangen", "Hardware defect gemeld.", "user-help-amsterdam"),
      seedEvent(ts(8, "09:50"), "DIAGNOSE", "service_partner", "Tom van Aalst", "Schadeonderzoek afgerond", "Onderzoek naar hardwarefout afgerond.", "user-service-partner"),
      seedEvent(ts(9, "13:10"), "IRREPARABEL", "service_partner", "Tom van Aalst", "Laptop irreparabel", "Laptop kan niet worden hersteld.", "user-service-partner"),
    ], [], [{ at: ts(9, "13:15"), uploadedByUserId: "user-service-partner", uploadedByName: "Tom van Aalst", fileName: "rapport-irrepairabel-2004.pdf", fileSizeLabel: "146 KB", mimeType: "application/pdf", kind: "repair_report" }]),
  ];

  const donations: DonationBatch[] = [
    createDonation("donation-3001", "org-sponsor-techforgood", "OPHAALAFSPRAAK_GEPLAND", 24, "Dataweg 8, 3528 BG Utrecht", "Eva Bos", "impact@techforgood.nl", "2026-03-12 ochtend", ts(4, "10:00"), "org-servicepartner", "CRM-REL-SPONSOR-301", "CRM-CASE-DON-3001", "CRM-TASK-DON-3001", [
      seedEvent(ts(4, "10:00"), "TOEGEZEGD", "digidromen_staff", "Noah Janssen", "Donatie geregistreerd", "Donatie van 24 devices geregistreerd.", "user-digidromen-staff"),
      seedEvent(ts(9, "12:00"), "OPHAALAFSPRAAK_GEPLAND", "service_partner", "Tom van Aalst", "Pickup gepland", "Ophaalmoment gepland voor 12 maart.", "user-service-partner"),
    ], [], [], ["digidromen_staff", "digidromen_admin", "service_partner"], "Kantoorvervanging Q1."),
    createDonation("donation-3002", "org-sponsor-nexbyte", "IN_VERWERKING", 18, "Stationsplein 1, 3818 LE Amersfoort", "Job Meurs", "donaties@nexbyte.nl", "2026-03-06 middag", ts(2, "11:25"), "org-servicepartner", "CRM-REL-SPONSOR-302", "CRM-CASE-DON-3002", "CRM-TASK-DON-3002", [
      seedEvent(ts(2, "11:25"), "TOEGEZEGD", "digidromen_staff", "Noah Janssen", "Donatie geregistreerd", "Donatie van 18 devices geregistreerd.", "user-digidromen-staff"),
      seedEvent(ts(3, "10:10"), "OPHAALAFSPRAAK_GEPLAND", "service_partner", "Tom van Aalst", "Pickup ingepland", "Ophaalmoment is ingepland.", "user-service-partner"),
      seedEvent(ts(6, "09:00"), "OPGEHAALD", "service_partner", "Tom van Aalst", "Batch opgehaald", "Batch is opgehaald op locatie.", "user-service-partner"),
      seedEvent(ts(7, "11:05"), "AANGEKOMEN_WAREHOUSE", "service_partner", "Tom van Aalst", "Batch warehouse", "Batch is ontvangen in het warehouse.", "user-service-partner"),
      seedEvent(ts(8, "16:20"), "IN_VERWERKING", "service_partner", "Tom van Aalst", "Refurbish gestart", "Intake en refurbish zijn gestart.", "user-service-partner"),
    ], [], [], ["digidromen_staff", "digidromen_admin", "service_partner"], "Batch na office refresh."),
    createDonation("donation-3003", "org-sponsor-techforgood", "OP_VOORRAAD", 15, "Dataweg 8, 3528 BG Utrecht", "Eva Bos", "impact@techforgood.nl", "2026-02-26 middag", ts(1, "12:00"), "org-servicepartner", "CRM-REL-SPONSOR-301", "CRM-CASE-DON-3003", "CRM-TASK-DON-3003", [
      seedEvent(ts(1, "12:00"), "TOEGEZEGD", "digidromen_admin", "Karin van der Leest", "Donatie geregistreerd", "Donatie van 15 devices geregistreerd.", "user-digidromen-admin"),
      seedEvent(ts(2, "08:45"), "OPHAALAFSPRAAK_GEPLAND", "service_partner", "Tom van Aalst", "Pickup ingepland", "Ophaalmoment is ingepland.", "user-service-partner"),
      seedEvent(ts(3, "14:00"), "OPGEHAALD", "service_partner", "Tom van Aalst", "Batch opgehaald", "Batch is opgehaald.", "user-service-partner"),
      seedEvent(ts(4, "09:25"), "AANGEKOMEN_WAREHOUSE", "service_partner", "Tom van Aalst", "Batch warehouse", "Batch is ontvangen in het warehouse.", "user-service-partner"),
      seedEvent(ts(5, "15:10"), "IN_VERWERKING", "service_partner", "Tom van Aalst", "Refurbish gestart", "Refurbish intake is gestart.", "user-service-partner"),
      seedEvent(ts(6, "16:15"), "RAPPORTAGE_GEREED", "service_partner", "Tom van Aalst", "Rapportage gereed", "12 geschikt, 3 afgekeurd.", "user-service-partner"),
      seedEvent(ts(7, "09:55"), "OP_VOORRAAD", "digidromen_staff", "Noah Janssen", "Op voorraad", "12 laptops toegevoegd aan voorraad.", "user-digidromen-staff"),
    ], [], [{ at: ts(6, "16:20"), uploadedByUserId: "user-service-partner", uploadedByName: "Tom van Aalst", fileName: "refurbish-rapport-3003.xlsx", fileSizeLabel: "72 KB", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "donation_report" }], ["digidromen_staff", "digidromen_admin", "service_partner"], "Batch al afgerond en toegevoegd aan voorraad.", 12, 3),
  ];

  const workflowEvents = [...orderArtifacts.flatMap((item) => item.workflowEvents), ...repairArtifacts.flatMap((item) => item.workflowEvents), ...donationArtifacts.flatMap((item) => item.workflowEvents)];
  const notifications = [...orderArtifacts.flatMap((item) => item.notifications), ...repairArtifacts.flatMap((item) => item.notifications), ...donationArtifacts.flatMap((item) => item.notifications)];
  const messages = [...orderArtifacts.flatMap((item) => item.messages), ...repairArtifacts.flatMap((item) => item.messages), ...donationArtifacts.flatMap((item) => item.messages)];
  const documents = [...orderArtifacts.flatMap((item) => item.documents), ...repairArtifacts.flatMap((item) => item.documents), ...donationArtifacts.flatMap((item) => item.documents)];

  const crmJobs: CrmSyncJob[] = [
    { id: "crm-job-order-1001", caseType: "order", caseId: "order-1001", state: "synced", entityName: "order", bufferedChanges: [], lastAttemptAt: ts(5, "10:16"), lastSuccessfulSyncAt: ts(5, "10:16"), retryCount: 0 },
    { id: "crm-job-order-1002", caseType: "order", caseId: "order-1002", state: "queued", entityName: "order", bufferedChanges: ["Status gewijzigd naar IN_VOORBEREIDING"], lastAttemptAt: ts(9, "14:46"), retryCount: 0 },
    { id: "crm-job-repair-2001", caseType: "repair", caseId: "repair-2001", state: "failed", entityName: "repair", bufferedChanges: ["Status gewijzigd naar DIAGNOSE"], lastAttemptAt: ts(9, "11:35"), failureReason: "CRM time-out tijdens bijwerken dossier.", retryCount: 1 },
    { id: "crm-job-donation-3001", caseType: "donation", caseId: "donation-3001", state: "retrying", entityName: "donation", bufferedChanges: ["Pickup gepland voor 12 maart"], lastAttemptAt: ts(9, "12:05"), failureReason: "API rate limit bereikt, retry actief.", retryCount: 2 },
    { id: "crm-job-donation-3003", caseType: "donation", caseId: "donation-3003", state: "synced", entityName: "donation", bufferedChanges: [], lastAttemptAt: ts(7, "10:00"), lastSuccessfulSyncAt: ts(7, "10:00"), retryCount: 0 },
  ];

  return {
    organizations: toRecord(organizations),
    users: toRecord(users),
    products: toRecord(products),
    inventoryItems: toRecord(inventoryItems),
    orders: toRecord(orders),
    repairs: toRecord(repairs),
    donations: toRecord(donations),
    documents: toRecord(documents),
    messages: toRecord(messages),
    notifications: toRecord(notifications),
    workflowEvents: toRecord(workflowEvents),
    crmSync: {
      jobs: toRecord(crmJobs),
      queueOrder: crmJobs.filter((item) => item.state !== "synced").map((item) => item.id),
      lastSweepAt: ts(10, "08:45"),
      health: "degraded",
    },
  };

  function createOrder(
    id: string,
    organizationId: string,
    requesterUserId: string,
    status: Order["status"],
    priority: Order["priority"],
    preferredDeliveryDate: string,
    requestedAt: string,
    motivation: string,
    deliveryAddress: string,
    stockBadge: Order["stockBadge"],
    lineItems: Order["lineItems"],
    assignedServicePartnerId: string,
    crmRelationId: string,
    crmCaseId: string,
    crmTaskId: string,
    events: EventSeed[],
    messageSeeds: MessageSeed[] = [],
    documentSeeds: DocumentSeed[] = [],
  ): Order {
    const artifacts = buildArtifacts("order", id, events, messageSeeds, documentSeeds);
    orderArtifacts.push(artifacts);
    return {
      id,
      organizationId,
      requesterUserId,
      status,
      priority,
      preferredDeliveryDate,
      requestedAt,
      motivation,
      deliveryAddress,
      lineItems,
      stockBadge,
      assignedServicePartnerId,
      lastUpdatedAt: events[events.length - 1].at,
      workflowEventIds: artifacts.workflowEvents.map((item) => item.id),
      messageIds: artifacts.messages.map((item) => item.id),
      documentIds: artifacts.documents.map((item) => item.id),
      crmRelationId,
      crmCaseId,
      crmTaskId,
    };
  }

  function createRepair(
    id: string,
    organizationId: string,
    requesterUserId: string,
    status: RepairCase["status"],
    subtype: RepairCase["subtype"],
    serialNumber: string,
    issueType: string,
    notes: string,
    photoPlaceholderCount: number,
    receivedAt: string,
    assignedServicePartnerId: string,
    crmRelationId: string,
    crmCaseId: string,
    crmTaskId: string,
    events: EventSeed[],
    messageSeeds: MessageSeed[] = [],
    documentSeeds: DocumentSeed[] = [],
    replacementOffered?: boolean,
  ): RepairCase {
    const artifacts = buildArtifacts("repair", id, events, messageSeeds, documentSeeds);
    repairArtifacts.push(artifacts);
    return {
      id,
      organizationId,
      requesterUserId,
      status,
      subtype,
      serialNumber,
      issueType,
      notes,
      photoPlaceholderCount,
      receivedAt,
      assignedServicePartnerId,
      replacementOffered,
      lastUpdatedAt: events[events.length - 1].at,
      workflowEventIds: artifacts.workflowEvents.map((item) => item.id),
      messageIds: artifacts.messages.map((item) => item.id),
      documentIds: artifacts.documents.map((item) => item.id),
      crmRelationId,
      crmCaseId,
      crmTaskId,
    };
  }

  function createDonation(
    id: string,
    sponsorOrganizationId: string,
    status: DonationBatch["status"],
    deviceCountPromised: number,
    pickupAddress: string,
    pickupContactName: string,
    pickupContactEmail: string,
    pickupWindow: string,
    registeredAt: string,
    assignedServicePartnerId: string,
    crmRelationId: string,
    crmCaseId: string,
    crmTaskId: string,
    events: EventSeed[],
    messageSeeds: MessageSeed[] = [],
    documentSeeds: DocumentSeed[] = [],
    roleScope: Role[] = ["digidromen_staff", "digidromen_admin", "service_partner"],
    notes?: string,
    refurbishReadyCount?: number,
    rejectedCount?: number,
  ): DonationBatch {
    const artifacts = buildArtifacts("donation", id, events, messageSeeds, documentSeeds, roleScope);
    donationArtifacts.push(artifacts);
    return {
      id,
      sponsorOrganizationId,
      status,
      deviceCountPromised,
      pickupAddress,
      pickupContactName,
      pickupContactEmail,
      pickupWindow,
      registeredAt,
      assignedServicePartnerId,
      refurbishReadyCount,
      rejectedCount,
      notes,
      lastUpdatedAt: events[events.length - 1].at,
      workflowEventIds: artifacts.workflowEvents.map((item) => item.id),
      messageIds: artifacts.messages.map((item) => item.id),
      documentIds: artifacts.documents.map((item) => item.id),
      crmRelationId,
      crmCaseId,
      crmTaskId,
    };
  }
}

const orderArtifacts: Array<ReturnType<typeof buildArtifacts>> = [];
const repairArtifacts: Array<ReturnType<typeof buildArtifacts>> = [];
const donationArtifacts: Array<ReturnType<typeof buildArtifacts>> = [];

export function buildDashboardView(data: PortalData, role: Role): DashboardView {
  const notifications = Object.values(data.notifications);
  if (role === "help_org") {
    const organizationId = data.users[DEMO_USER_BY_ROLE.help_org].organizationId;
    const orders = Object.values(data.orders).filter((item) => item.organizationId === organizationId);
    const repairs = Object.values(data.repairs).filter((item) => item.organizationId === organizationId);
    return {
      role,
      metrics: [
        { id: "open-orders", label: "Open orders", value: String(orders.filter((item) => !["AFGESLOTEN", "GEANNULEERD"].includes(item.status)).length) },
        { id: "open-repairs", label: "Open repairs", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length) },
        { id: "pending-actions", label: "Pending acties", value: String(notifications.filter((item) => item.roleScope.includes(role)).length) },
      ],
      pendingActions: orders.slice(0, 3).map((item) => ({ id: `action-${item.id}`, label: "Bekijk order", route: `/orders/${item.id}`, relatedCaseType: "order", relatedCaseId: item.id })),
      recentDocumentIds: Object.values(data.documents).slice(0, 4).map((item) => item.id),
      spotlightCaseIds: [...orders.slice(0, 2), ...repairs.slice(0, 1)].map((item) => item.id),
    };
  }

  if (role === "service_partner") {
    const orders = Object.values(data.orders).filter((item) => item.assignedServicePartnerId === "org-servicepartner");
    const repairs = Object.values(data.repairs).filter((item) => item.assignedServicePartnerId === "org-servicepartner");
    const donations = Object.values(data.donations).filter((item) => item.assignedServicePartnerId === "org-servicepartner");
    return {
      role,
      metrics: [
        { id: "pickups", label: "Pickups", value: String(donations.filter((item) => item.status === "OPHAALAFSPRAAK_GEPLAND").length) },
        { id: "open-repairs", label: "Open repairs", value: String(repairs.filter((item) => item.status !== "AFGESLOTEN").length) },
        { id: "stock", label: "Stock mutaties", value: String(Object.values(data.products).filter((item) => item.stockReserved > 0).length) },
      ],
      pendingActions: [...orders, ...donations].slice(0, 4).map((item) => ({ id: `action-${item.id}`, label: "Werk case bij", route: `/${item.id.startsWith("donation") ? "donations" : "orders"}/${item.id}`, relatedCaseId: item.id, relatedCaseType: item.id.startsWith("donation") ? ("donation" as const) : ("order" as const) })),
      recentDocumentIds: Object.values(data.documents).slice(0, 4).map((item) => item.id),
      spotlightCaseIds: [...repairs.slice(0, 2), ...donations.slice(0, 1)].map((item) => item.id),
    };
  }

  return {
    role,
    metrics: [
      { id: "throughput", label: "Orders in flow", value: String(Object.values(data.orders).filter((item) => !["AFGESLOTEN", "GEANNULEERD"].includes(item.status)).length) },
      { id: "shortages", label: "Voorraadtekorten", value: String(Object.values(data.products).filter((item) => item.stockOnHand <= 10).length), tone: "warning" },
      { id: "sync-health", label: "Sync health", value: data.crmSync.health, tone: data.crmSync.health === "healthy" ? "good" : "warning" },
    ],
    pendingActions: [
      ...Object.values(data.orders)
        .filter((item) => item.status === "INGEDIEND")
        .map<DashboardAction>((item) => ({
          id: `action-${item.id}`,
          label: "Beoordeel order",
          route: `/orders/${item.id}`,
          relatedCaseType: "order",
          relatedCaseId: item.id,
        })),
      ...Object.values(data.crmSync.jobs)
        .filter((item) => item.state === "failed")
        .map<DashboardAction>((item) => ({
          id: `action-${item.id}`,
          label: "Herstel CRM sync",
          route: "/crm-sync",
          relatedCaseType: item.caseType,
          relatedCaseId: item.caseId,
        })),
    ].slice(0, 6),
    recentDocumentIds: Object.values(data.documents).slice(0, 5).map((item) => item.id),
    spotlightCaseIds: [...Object.values(data.orders).slice(0, 2), ...Object.values(data.donations).slice(0, 1)].map((item) => item.id),
  };
}
