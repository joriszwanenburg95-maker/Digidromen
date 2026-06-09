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

function QuantityField({
  error,
  label,
  helper,
  value,
  onChange,
}: {
  error?: string;
  label: string;
  helper?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const dec = () => onChange(Math.max(1, (Number(value) || 1) - 1));
  const inc = () => onChange(Math.max(1, (Number(value) || 1) + 1));
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-digidromen-dark/72">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label="Aantal verlagen"
          className="flex size-11 shrink-0 items-center justify-center rounded-[16px] border border-digidromen-cream bg-white text-lg font-semibold text-digidromen-dark hover:bg-digidromen-cream/60"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(event) =>
            onChange(Math.max(1, Number.parseInt(event.target.value, 10) || 1))
          }
          className={`min-h-11 w-20 rounded-[18px] border bg-white px-3 py-2 text-center text-sm font-semibold text-digidromen-dark [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-digidromen-orange/25 ${
            error ? "border-red-400" : "border-digidromen-cream focus:border-digidromen-orange"
          }`}
        />
        <button
          type="button"
          onClick={inc}
          aria-label="Aantal verhogen"
          className="flex size-11 shrink-0 items-center justify-center rounded-[16px] border border-digidromen-cream bg-white text-lg font-semibold text-digidromen-dark hover:bg-digidromen-cream/60"
        >
          +
        </button>
      </div>
      {helper ? (
        <p className="text-xs leading-relaxed text-digidromen-dark/52">{helper}</p>
      ) : null}
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
        {errors.motivation ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.motivation}
          </p>
        ) : null}

        <QuantityField
          label="Aantal pakketten"
          helper="Hoeveel complete laptoppakketten heb je nodig?"
          value={values.quantity}
          error={errors.quantity}
          onChange={(value) => onChange("quantity", value)}
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

        <p className="rounded-2xl bg-digidromen-warm px-4 py-3 text-xs leading-relaxed text-digidromen-dark/58">
          Omdat een laptop een uniek serienummer heeft, doe je één aanvraag per
          laptop. Meerdere laptops? Maak dan per laptop een aparte aanvraag.
        </p>
      </div>
    );
  }

  if (scenario === "cable_replacement") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
          Welke voedingskabel?
        </h2>

        <p className="rounded-2xl bg-digidromen-orange-light px-4 py-3 text-xs leading-relaxed text-digidromen-dark/68">
          Vul het <strong>connectortype</strong> en <strong>wattage</strong> in. Het
          aantal hieronder geldt <strong>per connectortype/wattage</strong>. Heb je
          kabels van verschillende types nodig? Doe dan een aparte aanvraag per type.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            required
            label="Connectortype"
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

        <QuantityField
          label="Aantal kabels (van dit type)"
          helper="Hoeveel kabels van dit connectortype/wattage heb je nodig?"
          value={values.quantity}
          error={errors.quantity}
          onChange={(value) => onChange("quantity", value)}
        />

        <TextField
          label="Serienummer laptop (optioneel)"
          value={values.serial_number}
          onChange={(value) => onChange("serial_number", value)}
        />

        <TextAreaField
          label="Reden van vervanging (optioneel)"
          value={values.replacement_reason}
          onChange={(value) => onChange("replacement_reason", value)}
        />
      </div>
    );
  }

  // Accessoires (muis, rugzak, headset, powerbank): vrij aantal + optionele reden.
  const accessoryTitles: Record<
    "mouse_replacement" | "backpack_replacement" | "headset_replacement" | "powerbank_replacement",
    { title: string; helper: string }
  > = {
    mouse_replacement: { title: "Vervanging muis", helper: "Hoeveel muizen heb je nodig?" },
    backpack_replacement: { title: "Vervanging rugzak", helper: "Hoeveel rugzakken heb je nodig?" },
    headset_replacement: { title: "Vervanging headset", helper: "Hoeveel headsets heb je nodig?" },
    powerbank_replacement: { title: "Vervanging powerbank", helper: "Hoeveel powerbanks heb je nodig?" },
  };

  const accessory = accessoryTitles[scenario];

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-semibold text-digidromen-dark">
        {accessory.title}
      </h2>

      <QuantityField
        label="Aantal"
        helper={accessory.helper}
        value={values.quantity}
        error={errors.quantity}
        onChange={(value) => onChange("quantity", value)}
      />

      <TextAreaField
        label="Reden van vervanging (optioneel)"
        value={values.replacement_reason}
        onChange={(value) => onChange("replacement_reason", value)}
      />

      <p className="rounded-2xl bg-digidromen-warm px-4 py-3 text-xs leading-relaxed text-digidromen-dark/58">
        Een reden is niet verplicht. Vul alleen iets in als het helpt bij de
        beoordeling.
      </p>
    </div>
  );
};

export function validateProductFields(
  scenario: ProductScenario,
  values: ProductFieldValues,
): Partial<Record<keyof ProductFieldValues, string>> {
  return validateForScenario(scenario, values);
}
