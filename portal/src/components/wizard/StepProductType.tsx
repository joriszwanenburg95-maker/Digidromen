import React from "react";

import { listRules, type ProductScenario } from "../../lib/productRules";

export type { ProductScenario } from "../../lib/productRules";

interface Props {
  error?: string;
  selected: ProductScenario | null;
  onSelect: (scenario: ProductScenario) => void;
}

export const StepProductType: React.FC<Props> = ({
  error,
  selected,
  onSelect,
}) => (
  <div className="space-y-5">
    <div>
      <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
        Wat is er nodig?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-digidromen-dark/58">
        Kies het product of onderdeel. Daarna vragen we alleen de gegevens die daarvoor nodig zijn.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {listRules().map(({ scenario, label, description, icon: Icon }) => {
        const isSelected = selected === scenario;
        const isPackage = scenario === "new_request";

        return (
          <button
            key={scenario}
            type="button"
            onClick={() => onSelect(scenario)}
            className={`group flex min-h-[128px] items-start gap-4 rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              isSelected
                ? "border-digidromen-orange bg-digidromen-orange-light shadow-sm"
                : "border-digidromen-cream bg-white hover:border-digidromen-orange/25 hover:shadow-sm"
            }`}
          >
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                isSelected
                  ? "bg-white text-digidromen-orange"
                  : isPackage
                    ? "bg-digidromen-yellow/35 text-digidromen-dark"
                    : "bg-digidromen-orange-light text-digidromen-orange"
              }`}
            >
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-digidromen-dark">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-digidromen-dark/55">{description}</p>
              {isPackage ? (
                <span className="mt-3 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-digidromen-orange">
                  Meest gebruikt
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>

    {error ? <p className="text-sm text-red-600">{error}</p> : null}
  </div>
);
