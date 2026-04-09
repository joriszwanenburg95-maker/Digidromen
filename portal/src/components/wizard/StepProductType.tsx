import React from "react";
import {
  Backpack,
  Battery,
  Cable,
  Laptop,
  Mouse,
  Package,
  type LucideIcon,
} from "lucide-react";

export type ProductScenario =
  | "new_request"
  | "laptop_replacement"
  | "cable_replacement"
  | "powerbank_replacement"
  | "mouse_replacement"
  | "backpack_replacement";

interface Props {
  error?: string;
  selected: ProductScenario | null;
  onSelect: (scenario: ProductScenario) => void;
}

const OPTIONS: Array<{
  scenario: ProductScenario;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    scenario: "new_request",
    label: "Nieuwe aanvraag",
    description: "Laptoppakket voor een kind of jongere.",
    icon: Package,
  },
  {
    scenario: "laptop_replacement",
    label: "Vervanging laptop",
    description: "Defecte laptop vervangen. SRN en klacht zijn verplicht.",
    icon: Laptop,
  },
  {
    scenario: "cable_replacement",
    label: "Vervanging voedingskabel",
    description: "Defecte kabel vervangen. SRN en productspecificatie vereist.",
    icon: Cable,
  },
  {
    scenario: "powerbank_replacement",
    label: "Vervanging powerbank",
    description: "Defecte powerbank vervangen. SRN en klacht zijn verplicht.",
    icon: Battery,
  },
  {
    scenario: "mouse_replacement",
    label: "Vervanging muis",
    description: "Defecte of ontbrekende muis vervangen.",
    icon: Mouse,
  },
  {
    scenario: "backpack_replacement",
    label: "Vervanging rugzak",
    description: "Defecte of ontbrekende rugzak vervangen.",
    icon: Backpack,
  },
];

export const StepProductType: React.FC<Props> = ({
  error,
  selected,
  onSelect,
}) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-base font-semibold text-slate-800">
        Wat wil je bestellen?
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Kies het type aanvraag zodat we de juiste velden en validatie tonen.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map(({ scenario, label, description, icon: Icon }) => {
        const isSelected = selected === scenario;

        return (
          <button
            key={scenario}
            type="button"
            onClick={() => onSelect(scenario)}
            className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-digidromen-primary bg-digidromen-primary/5"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <Icon
              size={20}
              className={`mt-0.5 shrink-0 ${
                isSelected ? "text-digidromen-primary" : "text-slate-400"
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </div>
          </button>
        );
      })}
    </div>

    {error ? <p className="text-sm text-red-600">{error}</p> : null}
  </div>
);
