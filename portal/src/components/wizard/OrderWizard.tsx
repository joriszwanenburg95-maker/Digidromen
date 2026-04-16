import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { queryKeys } from "../../lib/queryKeys";
import { getSupabaseClient } from "../../lib/supabase";
import { useOrderDraft } from "../../hooks/useOrderDraft";
import { StepConfirm } from "./StepConfirm";
import { StepOrganization } from "./StepOrganization";
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
import {
  clearOrderWizardSession,
  loadOrderWizardSession,
  migratePendingWizardSessionToDraft,
  saveOrderWizardSession,
  type OrderWizardPersistedState,
} from "./orderWizardSession";

const STEP_LABELS = [
  "Organisatie",
  "Type",
  "Gegevens",
  "Levering",
  "Bevestigen",
];

const STAFF_ORDER_ROLES = ["digidromen_staff", "digidromen_admin"] as const;

function formatOrderSubmitError(message: string): string {
  const m = message.trim();
  if (m.includes("Voedingskabel defect vereist")) {
    return (
      "Voedingskabel: het serienummer (SRN) van de laptop ontbreekt, of connectortype en wattage zijn niet beide ingevuld. " +
      "Vul alle drie in en dien opnieuw in."
    );
  }
  if (m.includes("Laptop defect vereist")) {
    return "Laptopvervanging: serienummer en klachtomschrijving zijn verplicht.";
  }
  return m;
}

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

  if (scenario === "mouse_replacement") {
    return (
      products.find((product) => product.id === "prod-muis")?.id ??
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          product.name.toLowerCase().includes("muis"),
      )?.id ??
      null
    );
  }

  if (scenario === "backpack_replacement") {
    return (
      products.find((product) => product.id === "prod-rugzak")?.id ??
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          product.name.toLowerCase().includes("rugzak"),
      )?.id ??
      null
    );
  }

  if (scenario === "headset_replacement") {
    return (
      products.find((product) => product.id === "prod-headset")?.id ??
      products.find(
        (product) =>
          product.active &&
          product.is_orderable &&
          (product.name.toLowerCase().includes("headset") ||
            product.name.toLowerCase().includes("koptelefoon")),
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
  const { user } = useAuth();
  const { draftId, isSaving, saveDraft, scheduleSave, submitDraft } =
    useOrderDraft();

  const role = user?.role ?? "help_org";
  const isStaffOrderer = STAFF_ORDER_ROLES.includes(
    role as (typeof STAFF_ORDER_ROLES)[number],
  );

  const [step, setStep] = useState(0);
  const [orderOrganizationId, setOrderOrganizationId] = useState("");
  const [scenario, setScenario] = useState<ProductScenario | null>(null);
  const [productFields, setProductFields] =
    useState<ProductFieldValues>(EMPTY_PRODUCT_FIELDS);
  const [delivery, setDelivery] = useState<DeliveryValues>(EMPTY_DELIVERY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionRestoredRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistWizardSession = useCallback(() => {
    const snapshot: OrderWizardPersistedState = {
      v: 1,
      step,
      orderOrganizationId,
      scenario,
      productFields,
      delivery,
    };
    saveOrderWizardSession(draftId, snapshot);
  }, [
    draftId,
    delivery,
    orderOrganizationId,
    productFields,
    scenario,
    step,
  ]);

  useEffect(() => {
    if (sessionRestoredRef.current || !user) return;
    const saved = loadOrderWizardSession(draftId);
    sessionRestoredRef.current = true;
    if (saved) {
      let stepToApply = saved.step;
      if (stepToApply >= 2 && !saved.scenario) {
        stepToApply = 1;
      }
      if (
        stepToApply >= 0 &&
        stepToApply <= 4 &&
        (stepToApply > 0 || saved.scenario)
      ) {
        setStep(stepToApply);
        if (saved.orderOrganizationId) {
          setOrderOrganizationId(saved.orderOrganizationId);
        }
        setScenario(saved.scenario);
        setProductFields({
          ...EMPTY_PRODUCT_FIELDS,
          ...saved.productFields,
          quantity: Math.max(1, Number(saved.productFields.quantity) || 1),
        });
        setDelivery({ ...EMPTY_DELIVERY, ...saved.delivery });
      }
    }
  }, [user, draftId]);

  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(persistWizardSession, 200);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [persistWizardSession]);

  useEffect(() => {
    const flush = () => {
      persistWizardSession();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [persistWizardSession]);

  useEffect(() => {
    if (scenario == null) return;
    setProductFields(EMPTY_PRODUCT_FIELDS);
    setErrors({});
  }, [scenario]);

  const ORG_SELECT = "id, name, city, address, postal_code, target_group_description" as const;

  const { data: helpOrganizations = [], isLoading: helpOrgsLoading } = useQuery({
    queryKey: queryKeys.organizations.list({ type: "help_org", active: true }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select(ORG_SELECT)
        .eq("type", "help_org")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && isStaffOrderer,
  });

  const { data: ownHelpOrg, isLoading: ownOrgLoading } = useQuery({
    queryKey: queryKeys.organizations.detail(user?.organizationId ?? ""),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select(ORG_SELECT)
        .eq("id", user!.organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && user.role === "help_org" && !!user.organizationId,
  });

  type OrgOption = {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    postal_code: string | null;
    target_group_description: string | null;
  };

  const organizationOptions = useMemo((): OrgOption[] => {
    if (!user) return [];
    if (isStaffOrderer) {
      return helpOrganizations.map((o) => ({
        id: o.id,
        name: o.name,
        city: o.city,
        address: o.address,
        postal_code: o.postal_code,
        target_group_description: o.target_group_description,
      }));
    }
    if (ownHelpOrg) {
      return [
        {
          id: ownHelpOrg.id,
          name: ownHelpOrg.name,
          city: ownHelpOrg.city,
          address: ownHelpOrg.address,
          postal_code: ownHelpOrg.postal_code,
          target_group_description: ownHelpOrg.target_group_description,
        },
      ];
    }
    return user.organizationId
      ? [
          {
            id: user.organizationId,
            name: "Jouw organisatie",
            city: null,
            address: null,
            postal_code: null,
            target_group_description: null,
          },
        ]
      : [];
  }, [user, helpOrganizations, ownHelpOrg, isStaffOrderer]);

  const orgLoading = isStaffOrderer ? helpOrgsLoading : ownOrgLoading;

  useEffect(() => {
    if (!user) return;
    if (user.role === "help_org" && user.organizationId) {
      setOrderOrganizationId(user.organizationId);
    }
  }, [user]);

  // Pre-fill delivery + doelgroepomschrijving when organization changes
  useEffect(() => {
    if (!orderOrganizationId) return;
    const org = organizationOptions.find((o) => o.id === orderOrganizationId);
    if (!org) return;

    // Pre-fill delivery address from organization
    if (org.address || org.city || org.postal_code) {
      setDelivery((prev) => ({
        delivery_address: prev.delivery_address || org.address || "",
        postal_code: prev.postal_code || org.postal_code || "",
        city: prev.city || org.city || "",
        preferred_delivery_date: prev.preferred_delivery_date,
      }));
    }

  }, [orderOrganizationId, organizationOptions]);

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

  const orgTargetGroupForOrder = () =>
    (
      organizationOptions.find((o) => o.id === orderOrganizationId)
        ?.target_group_description ?? ""
    ).trim();

  const updateProductField = (
    field: keyof ProductFieldValues,
    value: string | number | string[],
  ) => {
    const nextValues = { ...productFields, [field]: value };
    setProductFields(nextValues);
    setErrors((current) => ({ ...current, [field]: "" }));

    scheduleSave({
      organization_id: orderOrganizationId,
      motivation:
        scenario === "new_request"
          ? orgTargetGroupForOrder()
          : nextValues.motivation,
      delivery_address: delivery.delivery_address,
      preferred_delivery_date: delivery.preferred_delivery_date || null,
    });
  };

  const updateDelivery = (field: keyof DeliveryValues, value: string) => {
    const nextValues = { ...delivery, [field]: value };
    setDelivery(nextValues);
    setErrors((current) => ({ ...current, [field]: "" }));

    scheduleSave({
      organization_id: orderOrganizationId,
      motivation:
        scenario === "new_request"
          ? orgTargetGroupForOrder()
          : productFields.motivation,
      delivery_address: `${nextValues.delivery_address}, ${nextValues.postal_code} ${nextValues.city}`.trim(),
      preferred_delivery_date: nextValues.preferred_delivery_date || null,
    });
  };

  const handleNext = async () => {
    setSubmitError(null);

    if (step === 0) {
      const effectiveOrgId =
        role === "help_org"
          ? (user?.organizationId ?? orderOrganizationId)
          : orderOrganizationId;
      if (!effectiveOrgId?.trim()) {
        setErrors({
          organization:
            role === "help_org"
              ? "Je account heeft geen organisatie. Neem contact op met Digidromen."
              : "Kies voor welke organisatie deze bestelling is.",
        });
        return;
      }
      if (role === "help_org" && user?.organizationId) {
        setOrderOrganizationId(user.organizationId);
      }

      const newDraftId = await saveDraft({
        organization_id: effectiveOrgId,
        motivation: "",
        delivery_address: "",
        preferred_delivery_date: null,
        lines: [],
      });
      migratePendingWizardSessionToDraft(newDraftId);
      setErrors({});
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!scenario) {
        setErrors({ scenario: "Kies een type bestelling" });
        return;
      }

      await saveDraft({
        organization_id:
          role === "help_org"
            ? (user?.organizationId ?? orderOrganizationId)
            : orderOrganizationId,
        motivation: "",
        delivery_address: "",
        preferred_delivery_date: null,
        lines: [],
      });
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2 && scenario) {
      if (scenario === "new_request" && !orgTargetGroupForOrder()) {
        setErrors({
          motivation:
            "Vul de doelgroepomschrijving in onder Instellingen · Profiel. Die gebruiken we standaard bij laptoppakketten.",
        });
        return;
      }
      const nextErrors = validateProductFields(scenario, productFields);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors as Record<string, string>);
        return;
      }
      setErrors({});
      setStep(3);
      return;
    }

    if (step === 3) {
      const nextErrors = validateDelivery(delivery);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors as Record<string, string>);
        return;
      }
      setErrors({});
      setStep(4);
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

    const orgMotivation = orgTargetGroupForOrder();
    if (scenario === "new_request" && !orgMotivation) {
      setSubmitError(
        "Vul de doelgroepomschrijving in onder Instellingen · Profiel voordat je indient.",
      );
      return;
    }

    const serialTrim = productFields.serial_number.trim();
    const defectTrim = productFields.defect_description.trim();
    const connectorTypeTrim = productFields.connector_type.trim();
    const connectorWattageTrim = productFields.connector_wattage.trim();
    const replacementReasonTrim = productFields.replacement_reason.trim();

    if (scenario === "laptop_replacement" && (!serialTrim || !defectTrim)) {
      setSubmitError("Serienummer en klachtomschrijving zijn verplicht.");
      return;
    }

    if (scenario === "cable_replacement") {
      if (!serialTrim) {
        setSubmitError("Serienummer (SRN) van de laptop is verplicht.");
        return;
      }
      if (!connectorTypeTrim || !connectorWattageTrim) {
        setSubmitError(
          "Connectortype en wattage zijn verplicht voor een voedingskabel.",
        );
        return;
      }
    }

    const effectiveOrgId =
      role === "help_org"
        ? (user?.organizationId ?? orderOrganizationId)
        : orderOrganizationId;
    if (!effectiveOrgId?.trim()) {
      setSubmitError("Geen organisatie geselecteerd.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const rmaCategoryMap: Record<string, string> = {
        laptop_replacement: "laptop",
        cable_replacement: "voedingskabel",
        powerbank_replacement: "powerbank",
        mouse_replacement: "muis",
        backpack_replacement: "rugzak",
        headset_replacement: "headset",
      };
      const rmaCategory = rmaCategoryMap[scenario];

      const lines = [
        {
          product_id: productId,
          quantity: productFields.quantity,
          line_type:
            scenario === "new_request"
              ? ("new_request" as const)
              : ("rma_defect" as const),
          rma_category:
            scenario === "new_request" ? null : rmaCategory,
          serial_number:
            scenario === "new_request"
              ? null
              : serialTrim
                ? serialTrim
                : null,
          defect_description:
            scenario === "new_request"
              ? null
              : defectTrim
                ? defectTrim
                : null,
          replacement_reason:
            scenario === "laptop_replacement"
              ? null
              : replacementReasonTrim.length > 0
                ? replacementReasonTrim
                : null,
          connector_type:
            scenario === "cable_replacement"
              ? connectorTypeTrim || null
              : null,
          connector_wattage:
            scenario === "cable_replacement"
              ? connectorWattageTrim || null
              : null,
          defect_photo_urls: [...(productFields.defect_photo_urls ?? [])],
        },
      ];

      const savedId = await saveDraft({
        organization_id: effectiveOrgId,
        motivation:
          scenario === "new_request"
            ? orgMotivation
            : productFields.motivation.trim(),
        delivery_address: `${delivery.delivery_address}, ${delivery.postal_code} ${delivery.city}`,
        preferred_delivery_date: delivery.preferred_delivery_date || null,
        lines,
      });

      const orderId = await submitDraft(lines, savedId);
      clearOrderWizardSession(savedId);
      navigate(`/orders/${orderId}`);
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error);
      setSubmitError(
        formatOrderSubmitError(
          msg || "Er is een fout opgetreden bij het indienen.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmOrganizationLabel =
    organizationOptions.find((o) => o.id === orderOrganizationId)?.name ??
    ownHelpOrg?.name ??
    "—";

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
            <StepOrganization
              mode={isStaffOrderer ? "select" : "fixed"}
              options={organizationOptions}
              selectedId={
                isStaffOrderer
                  ? orderOrganizationId
                  : (user?.organizationId ?? orderOrganizationId)
              }
              onChange={(id) => {
                setOrderOrganizationId(id);
                setErrors((current) => ({ ...current, organization: "" }));
              }}
              error={errors.organization}
              isLoading={orgLoading}
            />
          ) : null}

          {step === 1 ? (
            <StepProductType
              selected={scenario}
              error={errors.scenario}
              onSelect={(nextScenario) => {
                setScenario(nextScenario);
                setErrors({});
              }}
            />
          ) : null}

          {step === 2 && scenario ? (
            <StepProductFields
              scenario={scenario}
              values={productFields}
              onChange={updateProductField}
              errors={
                errors as Partial<Record<keyof ProductFieldValues, string>>
              }
            />
          ) : null}

          {step === 3 ? (
            <StepDelivery
              values={delivery}
              onChange={updateDelivery}
              errors={errors as Partial<Record<keyof DeliveryValues, string>>}
            />
          ) : null}

          {step === 4 && scenario ? (
            <StepConfirm
              organizationLabel={confirmOrganizationLabel}
              scenario={scenario}
              productFields={productFields}
              targetGroupFromOrg={
                scenario === "new_request"
                  ? orgTargetGroupForOrder() || null
                  : null
              }
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

        {step < 4 ? (
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
