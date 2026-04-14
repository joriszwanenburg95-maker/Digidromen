import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useOrderingWindow } from "../../hooks/useOrderingWindow";
import type { DeliveryValues } from "./StepDelivery";
import type { ProductFieldValues } from "./StepProductFields";
import type { ProductScenario } from "./StepProductType";

const SCENARIO_LABELS: Record<ProductScenario, string> = {
  new_request: "Nieuwe aanvraag",
  laptop_replacement: "Vervanging laptop",
  cable_replacement: "Vervanging voedingskabel",
  powerbank_replacement: "Vervanging powerbank",
  mouse_replacement: "Vervanging muis",
  backpack_replacement: "Vervanging rugzak",
};

interface Props {
  organizationLabel: string;
  scenario: ProductScenario;
  productFields: ProductFieldValues;
  delivery: DeliveryValues;
  isSubmitting: boolean;
  submitError?: string | null;
  onSubmit: () => void;
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="max-w-[60%] text-right font-medium text-slate-800">
      {value}
    </span>
  </div>
);

export const StepConfirm: React.FC<Props> = ({
  organizationLabel,
  scenario,
  productFields,
  delivery,
  isSubmitting,
  submitError,
  onSubmit,
}) => {
  const { user } = useAuth();
  const { data: window } = useOrderingWindow();
  /** Zelfde regel als Orders.tsx: alleen help_org zit achter het bestelvenster; staff/admin mogen altijd indienen. */
  const canSubmit =
    user?.role !== "help_org" ||
    !window ||
    window.isOpen ||
    window.bypassActive;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-800">Overzicht</h2>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        <Row label="Organisatie" value={organizationLabel} />
        <Row label="Type" value={SCENARIO_LABELS[scenario]} />
        {productFields.quantity > 1 ? (
          <Row label="Aantal" value={String(productFields.quantity)} />
        ) : null}
        {productFields.motivation ? (
          <Row label="Motivatie" value={productFields.motivation} />
        ) : null}
        {productFields.serial_number ? (
          <Row label="Serienummer" value={productFields.serial_number} />
        ) : null}
        {productFields.defect_description ? (
          <Row label="Klacht" value={productFields.defect_description} />
        ) : null}
        {productFields.connector_type ? (
          <Row
            label="Connector"
            value={`${productFields.connector_type} ${productFields.connector_wattage}`.trim()}
          />
        ) : null}
        <Row
          label="Adres"
          value={`${delivery.delivery_address}, ${delivery.postal_code} ${delivery.city}`}
        />
        {delivery.preferred_delivery_date ? (
          <Row
            label="Gewenste datum"
            value={delivery.preferred_delivery_date}
          />
        ) : null}
      </div>

      {!canSubmit && window ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Bestellen is niet mogelijk buiten het bestelvenster. Het venster
            opent op {window.nextOpenDate}.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Bestelling is gereed om in te dienen.</span>
        </div>
      )}

      {submitError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {submitError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
        className="w-full rounded-xl bg-digidromen-primary px-6 py-3 text-sm font-semibold text-digidromen-dark transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? "Bezig met indienen..." : "Bestelling indienen"}
      </button>
    </div>
  );
};
