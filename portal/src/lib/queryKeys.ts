export const queryKeys = {
  orders: {
    all: ["orders"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["orders", "list", filters ?? {}] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  orderLines: {
    byOrder: (orderId: string) => ["order-lines", orderId] as const,
  },
  repairs: {
    all: ["repairs"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["repairs", "list", filters ?? {}] as const,
    detail: (id: string) => ["repairs", "detail", id] as const,
    logs: (repairCaseId: string) => ["repair-logs", repairCaseId] as const,
  },
  donations: {
    all: ["donations"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["donations", "list", filters ?? {}] as const,
    detail: (id: string) => ["donations", "detail", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["inventory", "list", filters ?? {}] as const,
    byLocation: (locationId: string) =>
      ["inventory", "location", locationId] as const,
  },
  stockLocations: {
    all: ["stock-locations"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["organizations", "list", filters ?? {}] as const,
    detail: (id: string) => ["organizations", "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["users", "list", filters ?? {}] as const,
  },
  products: {
    all: ["products"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["products", "list", filters ?? {}] as const,
    active: () => ["products", "active"] as const,
  },
  portalConfig: {
    all: ["portal-config"] as const,
    key: (key: string) => ["portal-config", key] as const,
  },
  documents: {
    byCase: (caseId: string) => ["documents", "case", caseId] as const,
  },
  messages: {
    byCase: (caseId: string) => ["messages", "case", caseId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unread: () => ["notifications", "unread"] as const,
  },
  auditLog: {
    byRecord: (tableId: string, recordId: string) =>
      ["audit-log", tableId, recordId] as const,
  },
  forecast: {
    latest: () => ["forecast", "latest"] as const,
  },
} as const;
