export const crmPreparationConfig = {
  liveSyncEnabled: false,
  statusLabel: "Niet gekoppeld",
  pageTitle: "CRM voorbereiding",
  summary:
    "De portal draait voorlopig volledig zelfstandig. CRM-velden en mutaties blijven alleen bewaard als voorbereiding op een latere integratiefase.",
  futureCapabilities: [
    "Gereserveerde CRM-referenties per organisatie en dossier",
    "Voorbereide mutaties die later naar een adapter gestuurd kunnen worden",
    "Heldere adaptergrenzen voor sync-jobs, webhooks en mapping",
  ],
  deferredCapabilities: [
    "Geen live outbound sync",
    "Geen webhook-verwerking",
    "Geen vendor-specifieke adapter",
  ],
  modeLabel: "Voorbereiding",
};

type CrmReferenceRecord = {
  crmRelationId?: string;
  crmCaseId?: string;
  crmTaskId?: string;
};

type CrmQueueRecord = {
  id?: string;
  status?: string;
  retryCount?: number;
  bufferedChanges?: string[];
  failureReason?: string;
  updatedAt?: string;
};

export type CrmPreparationState = {
  id: string;
  status: string;
  retryCount: number;
  bufferedChanges: string[];
  failureReason?: string;
  updatedAt?: string;
};

function countPreparedReferences(items: CrmReferenceRecord[]): number {
  return items.filter((item) => item.crmRelationId || item.crmCaseId || item.crmTaskId).length;
}

function countOpenQueueItems(items: CrmQueueRecord[]): number {
  return items.filter((item) => item.status && item.status !== "synced").length;
}

export function getPreparedMutationCount(items: CrmQueueRecord[]): number {
  return items.reduce((total, item) => total + (item.bufferedChanges?.length ?? 0), 0);
}

export function getCrmPreparationSummary(data: any) {
  const organizations = Object.values(data.organizations ?? {}) as CrmReferenceRecord[];
  const orders = Object.values(data.orders ?? {}) as CrmReferenceRecord[];
  const repairs = Object.values(data.repairs ?? {}) as CrmReferenceRecord[];
  const donations = Object.values(data.donations ?? {}) as CrmReferenceRecord[];
  const queueItems = Object.values(data.crmSyncStates ?? {}) as CrmQueueRecord[];

  const coverage = [
    {
      key: "organizations",
      label: "Organisaties",
      count: countPreparedReferences(organizations),
      description: "crmRelationId gereserveerd",
    },
    {
      key: "orders",
      label: "Orders",
      count: countPreparedReferences(orders),
      description: "case- en taakreferenties voorbereid",
    },
    {
      key: "repairs",
      label: "Reparaties",
      count: countPreparedReferences(repairs),
      description: "case- en taakreferenties voorbereid",
    },
    {
      key: "donations",
      label: "Donaties",
      count: countPreparedReferences(donations),
      description: "case- en taakreferenties voorbereid",
    },
  ];

  return {
    liveSyncEnabled: crmPreparationConfig.liveSyncEnabled,
    preparedReferenceCount: coverage.reduce((total, item) => total + item.count, 0),
    preparedQueueCount: queueItems.length,
    openQueueCount: countOpenQueueItems(queueItems),
    coverage,
  };
}

export function formatCrmReference(value?: string): string {
  return value?.trim() ? value : "Nog niet gereserveerd";
}

export function getCrmPreparationStatus(status: string): string {
  switch (status) {
    case "synced":
      return "Mock status: eerder verwerkt";
    case "queued":
      return "Voorbereid voor latere sync";
    case "retrying":
      return "Voorbereid met open aandachtspunt";
    case "failed":
      return "Voorbereiding vraagt aandacht";
    default:
      return `Mock status: ${status}`;
  }
}
