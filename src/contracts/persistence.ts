import type { PortalData, Role } from "./domain";

export const LOCAL_STORAGE_KEYS = {
  role: "digidromen-poc-role",
  data: "digidromen-poc-data",
  ui: "digidromen-poc-ui",
} as const;

export interface PersistedUiState {
  routeFilters: Record<string, string[]>;
  activeTabs: Record<string, string>;
  dismissedNotificationIds: string[];
  expandedCaseIds: string[];
}

export interface PersistedPortalEnvelope {
  version: number;
  savedAt: string;
  activeRole: Role;
  data: PortalData;
}

export interface PersistenceContract {
  loadRole(): Role | null;
  saveRole(role: Role): void;
  loadData(): PersistedPortalEnvelope | null;
  saveData(envelope: PersistedPortalEnvelope): void;
  loadUiState(): PersistedUiState | null;
  saveUiState(uiState: PersistedUiState): void;
  clearAll(): void;
}

export const CURRENT_PERSISTENCE_VERSION = 1;
