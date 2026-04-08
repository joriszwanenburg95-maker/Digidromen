import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { queryKeys } from "../../lib/queryKeys";
import { getSupabaseClient } from "../../lib/supabase";
import { useOrderDraft } from "../../hooks/useOrderDraft";
import { StepConfirm } from "./StepConfirm";
import {
  StepDelivery,
  type DeliveryValues,
  validateDelivery,
} from "./StepDelivery";
import {
  StepProductFields,
  type ProductFieldValues,
  validateProductFields,
} from "./StepProductFields";
import {
  StepProductType,
  type ProductScenario,
} from "./StepProductType";

const STEP_LABELS = ["Type", "Gegevens", "Levering", "Bevestigen"];

const EMPTY_PRODUCT_FIELDS: ProductFieldValues = {
  motivation: "",
  serial_number: "",
  defect_description: "",
  replacement_reason: "",
  connector_type: "",
  connector_wattage: "",
  defect_photo_urls: [],
  quantity: 1,
};

const EMPTY_DELIVERY: DeliveryValues = {
  delivery_address: "",
  postal_code: "",
  city: "",
  preferred_delivery_date: "",
};

type ProductLookupRow = {
  active: boolean;
  category: string;
  id: string;
  is_orderable: boolean;
  is_package: boolean;
  is_replacement_product: boolean;
  name: string;
};

interface Props {
  onClose: () => void;
}

function resolveProductId(
  products: ProductLookupRow[] | undefined,
  scenario: ProductScenario,
): string | null {
  if (!products?.length) {
    return null;
  }

  if (scenario === "new_request") {
    return (
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          product.is_package &&
          product.category === "laptop",
      )?.id ?? null
    );
  }

  if (scenario === "laptop_replacement") {
    return (
      products.find((product) => product.id === "prod-laptop")?.id ??
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          product.category === "laptop" &&
          !product.is_package,
      )?.id ??
      null
    );
  }

  if (scenario === "cable_replacement") {
    return (
      products.find((product) => product.id === "prod-voedingskabel")?.id ??
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          product.name.toLowerCase().includes("voedingskabel"),
      )?.id ??
      null
    );
  }

  return (
    products.find((product) => product.id === "prod-powerbank")?.id ??
    products.find(
      (product) =>
        product.active &&
        product.is_orderable &&
        product.name.toLowerCase().includes("powerbank"),
    )?.id ??
    null
  );
}

export const OrderWizard: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const { draftId, isSaving, saveDraft, scheduleSave, submitDraft } =
    useOrderDraft();

  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<ProductScenario | null>(null);
  const [productFields, setProductFields] =
    useState<ProductFieldValues>(EMPTY_PRODUCT_FIELDS);
  const [delivery, setDelivery] = useState<DeliveryValues>(EMPTY_DELIVERY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: products } = useQuery({
    queryKey: queryKeys.products.active(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("products")
        .select("id, name, category, active, is_orderable, is_package, is_replacement_product")
        .eq("active", true);

      if (error) {
        throw error;
      }

      return (data ?? []) as ProductLookupRow[];
    },
  });

  const updateProductField = (
    field: keyof ProductFieldValues,
    value: string | number | string[],
  ) => {
    const nextValues = { ...productFields, [field]: value };
    setProductFields(nextValues);
    setErrors((current) => ({ ...current, [field]: "" }));

    scheduleSave({
      motivation: nextValues.motivation,
      delivery_address: delivery.delivery_address,
      preferred_delivery_date: delivery.preferred_delivery_date || null,
    });
  };

  const updateDelivery = (field: keyof DeliveryValues, value: string) => {
    const nextValues = { ...delivery, [field]: value };
    setDelivery(nextValues);
    setErrors((current) => ({ ...current, [field]: "" }));

    scheduleSave({
      delivery_address: `${nextValues.delivery_address}, ${nextValues.postal_code} ${nextValues.city}`.trim(),
      preferred_delivery_date: nextValues.preferred_delivery_date || null,
    });
  };

  const handleNext = async () => {
    setSubmitError(null);

    if (step === 0) {
      if (!scenario) {
        setErrors({ scenario: "Kies een type bestelling" });
        return;
      }

      await saveDraft({
        motivation: "",
        delivery_address: "",
        preferred_delivery_date: null,
        lines: [],
      });
      setErrors({});
      setStep(1);
      return;
    }

    if (step === 1 && scenario) {
      const nextErrors = validateProductFields(scenario, productFields);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors as Record<string, string>);
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const nextErrors = validateDelivery(delivery);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors as Record<string, string>);
        return;
      }
      setErrors({});
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!scenario) {
      return;
    }

    const productId = resolveProductId(products, scenario);
    if (!productId) {
      setSubmitError(
        "Er is geen passend product ingericht voor dit type bestelling. Werk eerst de productcatalogus bij.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const rmaCategory =
        scenario === "laptop_replacement"
          ? "laptop"
          : scenario === "cable_replacement"
            ? "voedingskabel"
            : scenario === "powerbank_replacement"
              ? "powerbank"
              : undefined;

      const lines = [
        {
          product_id: productId,
          quantity: productFields.quantity,
          line_type:
            scenario === "new_request"
              ? ("new_request" as const)
              : ("rma_defect" as const),
          rma_category: rmaCategory,
          serial_number: productFields.serial_number || undefined,
          defect_description: productFields.defect_description || undefined,
          replacement_reason: productFields.replacement_reason || undefined,
          connector_type: productFields.connector_type || undefined,
          connector_wattage: productFields.connector_wattage || undefined,
          defect_photo_urls: productFields.defect_photo_urls,
        },
      ];

      const savedId = await saveDraft({
        motivation: productFields.motivation,
        delivery_address: `${delivery.delivery_address}, ${delivery.postal_code} ${delivery.city}`,
        preferred_delivery_date: delivery.preferred_delivery_date || null,
        lines,
      });

      const orderId = await submitDraft(lines, savedId);
      navigate(`/orders/${orderId}`);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Er is een fout opgetreden bij het indienen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs text-slate-500">Nieuwe bestelling</p>
            <p className="text-sm font-semibold text-slate-800">
              {STEP_LABELS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {STEP_LABELS.map((label, index) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-digidromen-primary" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5">
          {step === 0 ? (
            <StepProductType
              selected={scenario}
              error={errors.scenario}
              onSelect={(nextScenario) => {
                setScenario(nextScenario);
                setErrors({});
              }}
            />
          ) : null}

          {step === 1 && scenario ? (
            <StepProductFields
              scenario={scenario}
              values={productFields}
              onChange={updateProductField}
              errors={
                errors as Partial<Record<keyof ProductFieldValues, string>>
              }
            />
          ) : null}

          {step === 2 ? (
            <StepDelivery
              values={delivery}
              onChange={updateDelivery}
              errors={errors as Partial<Record<keyof DeliveryValues, string>>}
            />
          ) : null}

          {step === 3 && scenario ? (
            <StepConfirm
              scenario={scenario}
              productFields={productFields}
              delivery={delivery}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onSubmit={() => {
                void handleSubmit();
              }}
            />
          ) : null}

          {draftId ? (
            <p className="mt-4 text-xs text-slate-400">
              Concept-id: {draftId}
              {isSaving ? " · opslaan..." : ""}
            </p>
          ) : null}
        </div>

        {step < 3 ? (
          <div className="flex justify-between border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={step === 0 ? onClose : () => setStep((current) => current - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {step === 0 ? "Annuleren" : "Vorige"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleNext();
              }}
              className="rounded-xl bg-digidromen-primary px-5 py-2 text-sm font-semibold text-digidromen-dark hover:opacity-90"
            >
              Volgende
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
