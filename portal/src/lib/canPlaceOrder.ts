import type { Role } from "../types";

type WindowSlice = { isOpen: boolean; bypassActive: boolean };

/**
 * Digidromen staff/admin mag altijd bestellen, ongeacht het maandvenster.
 * Alleen help_org wordt begrensd door het actieve bestelvenster (of laadstatus).
 */
export function canPlaceOrder(role: Role | undefined, window: WindowSlice | undefined): boolean {
  if (role === "digidromen_admin" || role === "digidromen_staff") {
    return true;
  }
  if (role !== "help_org") {
    return true;
  }
  if (!window) {
    return true;
  }
  return window.isOpen || window.bypassActive;
}
