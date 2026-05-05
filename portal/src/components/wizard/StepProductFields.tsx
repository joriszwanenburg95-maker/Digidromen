import React from "react";

import {
  validateForScenario,
  type ProductFieldValues,
  type ProductScenario,
} from "../../lib/productRules";

export type { ProductFieldValues } from "../../lib/productRules";

interface Props {
  scenario: ProductScenario;
  values: ProductFieldValues;
  onChange: (
    field: keyof ProductFieldValues,
    value: string | number | string[],
  ) => void;
  errors: Partial<Record<keyof ProductFieldValues, string>>;
}

function TextField({
  error,
  label,
  required,
  type = "text",
  value,
  onChange,
}: {
  error?: string;
  label: string;
  required?: boolean;
  type?: "text" | "number";
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-digidromen-dark/72">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-11 w-full rounded-[18px] border bg-white px-3 py-2 text-sm text-digidromen-dark focus:outline-none focus:ring-2 focus:ring-digidromen-orange/25 ${
          error ? "border-red-400" : "border-digidromen-cream focus:border-digidromen-orange"
        }`}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function TextAreaField({
  error,
  label,
  required,
  value,
  onChange,
}: {
  error?: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-digidromen-dark/72">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-[18px] border bg-white px-3 py-2 text-sm text-digidromen-dark focus:outline-none focus:ring-2 focus:ring-digidromen-orange/25 ${
          error ? "border-red-400" : "border-digidromen-cream focus:border-digidromen-orange"
        }`}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export const StepProductFields: React.FC<Props> = ({
  scenario,
  values,
  onChange,
  errors,
}) => {
  if (scenario === "new_request") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Aantal laptoppakketten
        </h2>
        <p className="text-sm leading-relaxed text-digidromen-dark/58">
          De doelgroepomschrijving van jullie organisatie staat onder{" "}
          <strong className="text-digidromen-dark">Mijn organisatie</strong> en wordt automatisch meegenomen.
        </p>
        {errors.motivation ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.motivation}
          </p>
        ) : null}

        <TextField
          required
          type="number"
          label="Aantal pakketten"
          value={values.quantity}
          error={errors.quantity}
          onChange={(value) =>
            onChange("quantity", Math.max(1, Number.parseInt(value, 10) || 1))
          }
        />
      </div>
    );
  }

  if (scenario === "laptop_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Gegevens defecte laptop
        </h2>

        <TextField
          required
          label="Serienummer (SRN)"
          value={values.serial_number}
          error={errors.serial_number}
          onChange={(value) => onChange("serial_number", value)}
        />

        <TextAreaField
          required
          label="Klachtomschrijving"
          value={values.defect_description}
          error={errors.defect_description}
          onChange={(value) => onChange("defect_description", value)}
        />
      </div>
    );
  }

  if (scenario === "cable_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Gegevens defecte voedingskabel
        </h2>

        <TextField
          required
          label="Serienummer (SRN) van laptop"
          value={values.serial_number}
          error={errors.serial_number}
          onChange={(value) => onChange("serial_number", value)}
        />

        <p className="rounded-2xl bg-digidromen-orange-light px-4 py-3 text-xs leading-relaxed text-digidromen-dark/68">
          Vul het <strong>connector type</strong> en <strong>wattage</strong> in.
          Foto-upload is in deze versie nog niet aangesloten.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            required
            label="Connector type"
            value={values.connector_type}
            error={errors.connector_type}
            onChange={(value) => onChange("connector_type", value)}
          />

          <TextField
            required
            label="Wattage"
            value={values.connector_wattage}
            error={errors.connector_wattage}
            onChange={(value) => onChange("connector_wattage", value)}
          />
        </div>

        {errors.connector_type ? (
          <p className="text-xs text-red-500">{errors.connector_type}</p>
        ) : null}
      </div>
    );
  }

  if (scenario === "mouse_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Vervanging muis
        </h2>
        <p className="text-sm leading-relaxed text-digidromen-dark/58">
          Voor deze bestelling hoeven geen serienummer of reden voor vervanging te worden ingevuld. Ga verder naar levering.
        </p>
      </div>
    );
  }

  if (scenario === "backpack_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Vervanging rugzak
        </h2>
        <p className="text-sm leading-relaxed text-digidromen-dark/58">
          Voor deze bestelling hoeven geen serienummer of reden voor vervanging te worden ingevuld. Ga verder naar levering.
        </p>
      </div>
    );
  }

  if (scenario === "headset_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Vervanging headset
        </h2>

        <TextField
          label="Serienummer / ordernummer (optioneel)"
          value={values.serial_number}
          error={errors.serial_number}
          onChange={(value) => onChange("serial_number", value)}
        />

        <TextAreaField
          required
          label="Reden voor vervanging"
          value={values.defect_description}
          error={errors.defect_description}
          onChange={(value) => onChange("defect_description", value)}
        />
      </div>
    );
  }

  if (scenario === "powerbank_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Vervanging powerbank
        </h2>
        <p className="text-sm leading-relaxed text-digidromen-dark/58">
          Voor deze bestelling hoeven geen serienummer of klachtomschrijving te worden ingevuld. Ga verder naar levering.
        </p>
      </div>
    );
  }

  const _exhaustive: never = scenario;
  return _exhaustive;
};

export function validateProductFields(
  scenario: ProductScenario,
  values: ProductFieldValues,
): Partial<Record<keyof ProductFieldValues, string>> {
  return validateForScenario(scenario, values);
}
