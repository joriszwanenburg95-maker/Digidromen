import {
  Backpack,
  Battery,
  Cable,
  Headphones,
  Laptop,
  Mouse,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface ProductFieldValues {
  motivation: string;
  serial_number: string;
  defect_description: string;
  replacement_reason: string;
  connector_type: string;
  connector_wattage: string;
  defect_photo_urls: string[];
  quantity: number;
}

export type ProductScenario =
  | "new_request"
  | "laptop_replacement"
  | "cable_replacement"
  | "powerbank_replacement"
  | "mouse_replacement"
  | "backpack_replacement"
  | "headset_replacement";

/**
 * Hoe het aantal in de UI werkt:
 * - "package": aantal laptoppakketten.
 * - "single": per artikel, omdat een verplicht serienummer 1-op-1 bij één
 *   apparaat hoort. Aantal staat vast op 1.
 * - "multiple": vrij aantal invullen (bijv. 3 muizen of 3 kabels van hetzelfde type).
 */
export type QuantityMode = "package" | "single" | "multiple";

export type ProductLookupRow = {
  active: boolean;
  category: string;
  id: string;
  is_orderable: boolean;
  is_package: boolean;
  is_replacement_product: boolean;
  name: string;
};

export type FieldErrors = Partial<Record<keyof ProductFieldValues, string>>;

export interface ProductRule {
  scenario: ProductScenario;
  label: string;
  description: string;
  icon: LucideIcon;
  /** order_lines.line_type for this scenario. */
  lineType: "new_request" | "rma_defect";
  /** RMA category for replacements; null voor new_request. */
  rmaCategory: string | null;
  /** Hoe het aantal werkt voor dit scenario. */
  quantityMode: QuantityMode;
  /**
   * Toont een optioneel "reden van vervanging"-veld. Nooit verplicht: bedoeld
   * voor accessoires waarbij een toelichting handig maar niet nodig is.
   */
  optionalReason: boolean;
  /** Match a product from the catalog. */
  matchProduct: (products: ProductLookupRow[]) => ProductLookupRow | null;
  /** Validate ProductFieldValues for this scenario. */
  validate: (values: ProductFieldValues) => FieldErrors;
}

function byId(id: string) {
  return (p: ProductLookupRow) => p.id === id;
}

function nameContains(needle: string) {
  const lower = needle.toLowerCase();
  return (p: ProductLookupRow) =>
    p.active && p.is_orderable && p.name.toLowerCase().includes(lower);
}

/** Validatie voor accessoires: enkel een geldig aantal (>= 1), reden is optioneel. */
function validateQuantityOnly(values: ProductFieldValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.quantity || values.quantity < 1) {
    errors.quantity = "Minimaal 1";
  }
  return errors;
}

function findFirst<T>(
  list: T[] | undefined,
  ...predicates: Array<(item: T) => boolean>
): T | null {
  if (!list?.length) return null;
  for (const predicate of predicates) {
    const hit = list.find(predicate);
    if (hit) return hit;
  }
  return null;
}

const RULES: Record<ProductScenario, ProductRule> = {
  new_request: {
    scenario: "new_request",
    label: "Nieuwe aanvraag",
    description: "Laptoppakket voor een kind of jongere.",
    icon: Package,
    lineType: "new_request",
    rmaCategory: null,
    quantityMode: "package",
    optionalReason: false,
    matchProduct: (products) =>
      findFirst(
        products,
        (p) =>
          p.active &&
          p.is_orderable &&
          p.is_package &&
          p.category === "laptop",
      ),
    validate: (values) => {
      const errors: FieldErrors = {};
      if (!values.quantity || values.quantity < 1) {
        errors.quantity = "Minimaal 1";
      }
      return errors;
    },
  },
  laptop_replacement: {
    scenario: "laptop_replacement",
    label: "Vervanging laptop",
    description: "Defecte laptop vervangen. SRN en klacht zijn verplicht.",
    icon: Laptop,
    lineType: "rma_defect",
    rmaCategory: "laptop",
    quantityMode: "single",
    optionalReason: false,
    matchProduct: (products) =>
      findFirst(
        products,
        byId("prod-laptop"),
        (p) =>
          p.active &&
          p.is_orderable &&
          p.category === "laptop" &&
          !p.is_package,
      ),
    validate: (values) => {
      const errors: FieldErrors = {};
      if (!values.serial_number.trim()) {
        errors.serial_number = "SRN is verplicht";
      }
      if (!values.defect_description.trim()) {
        errors.defect_description = "Klachtomschrijving is verplicht";
      }
      return errors;
    },
  },
  cable_replacement: {
    scenario: "cable_replacement",
    label: "Vervanging voedingskabel",
    description: "Defecte kabel vervangen. Kies connectortype en wattage; aantal mag per type.",
    icon: Cable,
    lineType: "rma_defect",
    rmaCategory: "voedingskabel",
    quantityMode: "multiple",
    optionalReason: true,
    matchProduct: (products) =>
      findFirst(products, byId("prod-voedingskabel"), nameContains("voedingskabel")),
    validate: (values) => {
      const errors: FieldErrors = {};
      // Geen serienummer verplicht: een kabel hoort niet 1-op-1 bij één apparaat.
      // Het aantal geldt per connectortype + wattage, dus die zijn wél verplicht.
      if (!values.connector_type.trim() || !values.connector_wattage.trim()) {
        errors.connector_type = "Vul zowel connectortype als wattage in";
      }
      if (!values.quantity || values.quantity < 1) {
        errors.quantity = "Minimaal 1";
      }
      return errors;
    },
  },
  powerbank_replacement: {
    scenario: "powerbank_replacement",
    label: "Vervanging powerbank",
    description: "Defecte powerbank vervangen. Vul het aantal in; reden mag, hoeft niet.",
    icon: Battery,
    lineType: "rma_defect",
    rmaCategory: "powerbank",
    quantityMode: "multiple",
    optionalReason: true,
    matchProduct: (products) =>
      findFirst(products, byId("prod-powerbank"), nameContains("powerbank")),
    validate: validateQuantityOnly,
  },
  mouse_replacement: {
    scenario: "mouse_replacement",
    label: "Vervanging muis",
    description: "Defecte of ontbrekende muis vervangen. Vul het aantal in; reden mag, hoeft niet.",
    icon: Mouse,
    lineType: "rma_defect",
    rmaCategory: "muis",
    quantityMode: "multiple",
    optionalReason: true,
    matchProduct: (products) =>
      findFirst(products, byId("prod-muis"), nameContains("muis")),
    validate: validateQuantityOnly,
  },
  backpack_replacement: {
    scenario: "backpack_replacement",
    label: "Vervanging rugzak",
    description: "Defecte of ontbrekende rugzak vervangen. Vul het aantal in; reden mag, hoeft niet.",
    icon: Backpack,
    lineType: "rma_defect",
    rmaCategory: "rugzak",
    quantityMode: "multiple",
    optionalReason: true,
    matchProduct: (products) =>
      findFirst(products, byId("prod-rugzak"), nameContains("rugzak")),
    validate: validateQuantityOnly,
  },
  headset_replacement: {
    scenario: "headset_replacement",
    label: "Vervanging headset",
    description: "Defecte of ontbrekende headset vervangen. Vul het aantal in; reden mag, hoeft niet.",
    icon: Headphones,
    lineType: "rma_defect",
    rmaCategory: "headset",
    quantityMode: "multiple",
    optionalReason: true,
    matchProduct: (products) =>
      findFirst(
        products,
        byId("prod-headset"),
        (p) =>
          p.active &&
          p.is_orderable &&
          (p.name.toLowerCase().includes("headset") ||
            p.name.toLowerCase().includes("koptelefoon")),
      ),
    validate: validateQuantityOnly,
  },
};

export const PRODUCT_SCENARIOS: ProductScenario[] = [
  "new_request",
  "laptop_replacement",
  "cable_replacement",
  "powerbank_replacement",
  "mouse_replacement",
  "backpack_replacement",
  "headset_replacement",
];

export function getRule(scenario: ProductScenario): ProductRule {
  return RULES[scenario];
}

export function listRules(): ProductRule[] {
  return PRODUCT_SCENARIOS.map((s) => RULES[s]);
}

export function resolveProductId(
  products: ProductLookupRow[] | undefined,
  scenario: ProductScenario,
): string | null {
  if (!products) return null;
  return RULES[scenario].matchProduct(products)?.id ?? null;
}

export function validateForScenario(
  scenario: ProductScenario,
  values: ProductFieldValues,
): FieldErrors {
  return RULES[scenario].validate(values);
}
