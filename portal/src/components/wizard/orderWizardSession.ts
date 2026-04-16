import type { DeliveryValues } from "./StepDelivery";
import type { ProductFieldValues } from "./StepProductFields";
import type { ProductScenario } from "./StepProductType";

const PREFIX = "digidromen_order_wizard_v1:";
const PENDING = "__pending__";

export interface OrderWizardPersistedState {
  v: 1;
  step: number;
  orderOrganizationId: string;
  scenario: ProductScenario | null;
  productFields: ProductFieldValues;
  delivery: DeliveryValues;
}

function storageKey(draftId: string | null): string {
  return `${PREFIX}${draftId ?? PENDING}`;
}

export function loadOrderWizardSession(
  draftId: string | null,
): OrderWizardPersistedState | null {
  try {
    const primary = sessionStorage.getItem(storageKey(draftId));
    const raw = primary ?? sessionStorage.getItem(storageKey(null));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderWizardPersistedState;
    if (parsed?.v !== 1 || typeof parsed.step !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOrderWizardSession(
  draftId: string | null,
  state: OrderWizardPersistedState,
): void {
  try {
    sessionStorage.setItem(storageKey(draftId), JSON.stringify(state));
  } catch {
    // Quota / private mode
  }
}

/** Na nieuw concept-id: pending-state kopiëren zodat stap 1+ behouden blijft. */
export function migratePendingWizardSessionToDraft(draftId: string): void {
  try {
    const pending = sessionStorage.getItem(storageKey(null));
    if (!pending) return;
    if (sessionStorage.getItem(storageKey(draftId))) {
      sessionStorage.removeItem(storageKey(null));
      return;
    }
    sessionStorage.setItem(storageKey(draftId), pending);
    sessionStorage.removeItem(storageKey(null));
  } catch {
    // ignore
  }
}

export function clearOrderWizardSession(draftId: string | null): void {
  try {
    sessionStorage.removeItem(storageKey(draftId));
    sessionStorage.removeItem(storageKey(null));
  } catch {
    // ignore
  }
}
