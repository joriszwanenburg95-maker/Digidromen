import React from "react";

export interface DeliveryValues {
  delivery_address: string;
  postal_code: string;
  city: string;
  preferred_delivery_date: string;
}

interface Props {
  values: DeliveryValues;
  onChange: (field: keyof DeliveryValues, value: string) => void;
  errors: Partial<Record<keyof DeliveryValues, string>>;
}

export const StepDelivery: React.FC<Props> = ({
  values,
  onChange,
  errors,
}) => {
  const field = (
    label: string,
    key: keyof DeliveryValues,
    required = false,
    type = "text",
  ) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={values[key]}
        onChange={(event) => onChange(key, event.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40 ${
          errors[key] ? "border-red-400" : "border-slate-300"
        }`}
      />
      {errors[key] ? <p className="text-xs text-red-500">{errors[key]}</p> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">
        Aflevergegevens
      </h2>

      {field("Straat + huisnummer", "delivery_address", true)}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("Postcode", "postal_code", true)}
        {field("Stad", "city", true)}
      </div>

      {field(
        "Gewenste leveringsdatum (optioneel)",
        "preferred_delivery_date",
        false,
        "date",
      )}

      <p className="text-xs text-slate-500">
        De exacte bezorgdatum wordt later door de servicepartner ingevuld en is
        daarna zichtbaar in de bestelling.
      </p>
    </div>
  );
};

export function validateDelivery(
  values: DeliveryValues,
): Partial<Record<keyof DeliveryValues, string>> {
  const errors: Partial<Record<keyof DeliveryValues, string>> = {};

  if (!values.delivery_address.trim()) {
    errors.delivery_address = "Verplicht";
  }
  if (!values.postal_code.trim()) {
    errors.postal_code = "Verplicht";
  } else if (!/^\d{4}\s?[A-Z]{2}$/i.test(values.postal_code.trim())) {
    errors.postal_code = "Ongeldig NL postcodeformaat (bijv. 1234 AB)";
  }
  if (!values.city.trim()) {
    errors.city = "Verplicht";
  }

  return errors;
}
