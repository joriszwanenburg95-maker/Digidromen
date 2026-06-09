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
}) => {
  const rules = listRules();
  const hero = rules.find((r) => r.scenario === "new_request");
  const replacements = rules.filter((r) => r.scenario !== "new_request");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Wat heb je nodig?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-digidromen-dark/58">
          Kies een product. Daarna vragen we alleen de gegevens die daarvoor nodig zijn.
        </p>
      </div>

      {hero ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-digidromen-dark/40">
            Nieuw aanvragen
          </p>
          <button
            type="button"
            onClick={() => onSelect(hero.scenario)}
            className={`group flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
              selected === hero.scenario
                ? "border-digidromen-orange bg-digidromen-orange-light shadow-sm"
                : "border-digidromen-cream bg-white hover:border-digidromen-orange/25 hover:shadow-sm"
            }`}
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-digidromen-yellow/35 text-digidromen-dark">
              <hero.icon size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-digidromen-dark">Laptoppakket</p>
                <span className="rounded-full bg-digidromen-yellow/40 px-2 py-0.5 text-[10px] font-semibold text-digidromen-dark">
                  Meest gekozen
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-digidromen-dark/60">
                Compleet pakket: laptop, muis, headset en rugzak voor een kind of jongere.
              </p>
            </div>
          </button>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-digidromen-dark/40">
          Vervanging van een onderdeel
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {replacements.map(({ scenario, label, description, icon: Icon }) => {
            const isSelected = selected === scenario;
            return (
              <button
                key={scenario}
                type="button"
                onClick={() => onSelect(scenario)}
                className={`group flex min-h-[120px] items-start gap-4 rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-digidromen-orange bg-digidromen-orange-light shadow-sm"
                    : "border-digidromen-cream bg-white hover:border-digidromen-orange/25 hover:shadow-sm"
                }`}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                    isSelected
                      ? "bg-white text-digidromen-orange"
                      : "bg-digidromen-orange-light text-digidromen-orange"
                  }`}
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-digidromen-dark">{label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-digidromen-dark/55">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};
