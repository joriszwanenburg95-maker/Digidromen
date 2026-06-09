import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { translateError } from "../../lib/errors";
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
import { StepProductType } from "./StepProductType";
import {
  getRule,
  resolveProductId,
  type ProductLookupRow,
  type ProductScenario,
} from "../../lib/productRules";
import {
  clearOrderWizardSession,
  loadOrderWizardSession,
  migratePendingWizardSessionToDraft,
  saveOrderWizardSession,
  type OrderWizardPersistedState,
} from "./orderWizardSession";

const STEP_LABELS = ["Organisatie", "Product", "Details", "Levering", "Controle"];

const STAFF_ORDER_ROLES = ["digidromen_staff", "digidromen_admin"] as const;

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

interface Props {
  onClose: () => void;
  /** Product/scenario dat al gekozen is (bijv. via een producttegel in de winkel). */
  initialScenario?: ProductScenario | null;
}

export const OrderWizard: React.FC<Props> = ({ onClose, initialScenario = null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draftId, isSaving, saveDraft, scheduleSave, submitDraft, discardDraft } =
    useOrderDraft();

  const wizardBootstrapped = useRef(false);

  // Stale concept + sessionStorage (na mislukte indiening): synchroon wissen vóór session-restore.
  useLayoutEffect(() => {
    if (wizardBootstrapped.current) return;
    wizardBootstrapped.current = true;
    clearOrderWizardSession(null);
    clearOrderWizardSession(draftId);
    void discardDraft();
    // draftId = eerste render (localStorage concept); één keer per wizard-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = user?.role ?? "help_org";
  const isStaffOrderer = STAFF_ORDER_ROLES.includes(
    role as (typeof STAFF_ORDER_ROLES)[number],
  );

  // Hulporganisaties zijn al bekend via login: sla de "Voor wie?"-stap over.
  // Staff/admin bestellen namens anderen en kiezen die organisatie wél eerst.
  const firstStep = isStaffOrderer ? 0 : 1;
  const [step, setStep] = useState(
    isStaffOrderer ? 0 : initialScenario ? 2 : 1,
  );
  const [orderOrganizationId, setOrderOrganizationId] = useState("");
  const [scenario, setScenario] = useState<ProductScenario | null>(initialScenario);
  const [productFields, setProductFields] =
    useState<ProductFieldValues>(EMPTY_PRODUCT_FIELDS);
  const [delivery, setDelivery] = useState<DeliveryValues>(EMPTY_DELIVERY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionRestoredRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    documentElement.style.overscrollBehavior = "contain";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

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

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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
      // Serienummer is optioneel: het aantal geldt per connectortype/wattage.
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
      const rule = getRule(scenario);

      const lines = [
        {
          product_id: productId,
          quantity: productFields.quantity,
          line_type: rule.lineType,
          rma_category: rule.rmaCategory,
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
      setSubmitError(
        translateError(error, "Er is een fout opgetreden bij het indienen."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmOrganizationLabel =
    organizationOptions.find((o) => o.id === orderOrganizationId)?.name ??
    ownHelpOrg?.name ??
    "—";

  const wizardDialog = (
    <div className="fixed inset-0 z-[1000] flex h-dvh w-screen items-center justify-center overflow-hidden bg-digidromen-dark/45 p-3 backdrop-blur-sm sm:p-6">
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl translate-y-0 flex-col overflow-hidden rounded-[30px] border border-digidromen-cream bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-wizard-title"
      >
        <div className="shrink-0 border-b border-digidromen-cream bg-[linear-gradient(135deg,#fff9ea_0%,#ffffff_62%)] px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-digidromen-orange">Nieuwe aanvraag</p>
            <p id="order-wizard-title" className="mt-1 font-heading text-lg font-semibold text-digidromen-dark">
              {STEP_LABELS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-digidromen-dark/45 hover:bg-white hover:text-digidromen-dark"
            aria-label="Aanvraag sluiten"
          >
            <X className="size-5" />
          </button>
          </div>
        </div>

        <div ref={contentScrollRef} className="min-h-0 flex-1 overscroll-contain overflow-y-auto">
          <div className="flex gap-1 px-5 pt-4 sm:px-7">
            {STEP_LABELS.slice(firstStep).map((label, i) => {
              const absIndex = i + firstStep;
              return (
                <div
                  key={label}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    absIndex <= step ? "bg-digidromen-orange" : "bg-digidromen-cream"
                  }`}
                />
              );
            })}
          </div>

          <div className="px-5 py-6 sm:px-7">
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
              <p className="mt-4 text-xs text-digidromen-dark/35">
                Concept-id: {draftId}
                {isSaving ? " · opslaan..." : ""}
              </p>
            ) : null}
          </div>
        </div>

        {step < 4 ? (
          <div className="shrink-0 border-t border-digidromen-cream bg-white px-5 py-4 sm:px-7">
            <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={step === firstStep ? onClose : () => setStep((current) => current - 1)}
              className="min-h-11 rounded-[18px] border border-digidromen-cream px-4 py-2 text-sm font-medium text-digidromen-dark/62 hover:bg-digidromen-cream/60"
            >
              {step === firstStep ? "Annuleren" : "Vorige"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleNext();
              }}
              className="min-h-11 rounded-[18px] bg-digidromen-orange px-5 py-2 text-sm font-semibold text-white hover:bg-digidromen-orange-hover"
            >
              Volgende
            </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(wizardDialog, document.body);
};
