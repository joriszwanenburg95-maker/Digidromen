import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  MapPin,
  PackageCheck,
  Paperclip,
  Send,
  Wrench,
} from "lucide-react";

import CrmPreparationCard from "../components/CrmPreparationCard";
import DonationAssignmentModal from "../components/DonationAssignmentModal";
import { SkeletonDetailSection } from "../components/Skeleton";
import Timeline from "../components/Timeline";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatDateTime } from "../lib/format";
import { formatCrmReference } from "../lib/crm-preparation";
import { translateError } from "../lib/errors";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
import { donationWorkflow, type Role } from "../lib/workflow";
import type { TimelineEvent } from "../types";
import type { Database } from "../types/database";

type DonationDetailRow = Database["public"]["Tables"]["donation_batches"]["Row"] & {
  organizations: { name: string } | null;
  service_partner: { name: string } | null;
  assigned_location: { name: string; city: string | null } | null;
};

type WorkflowEventRow = Database["public"]["Tables"]["workflow_events"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DonationStatus = Database["public"]["Enums"]["donation_status"];

function normalizeNamedRelation(input: unknown): { name: string } | null {
  if (!input || typeof input !== "object" || !("name" in input) || typeof input.name !== "string") {
    return null;
  }

  return { name: (input as { name: string }).name };
}

function normalizeAssignedLocation(input: unknown): DonationDetailRow["assigned_location"] {
  if (!input || typeof input !== "object" || !("name" in input) || typeof input.name !== "string") {
    return null;
  }

  const name = (input as { name: string }).name;
  const city = (input as { city?: unknown }).city;
  const normalizedCity: string | null = typeof city === "string" ? city : null;

  return {
    name,
    city: normalizedCity,
  };
}

const donationActionIcon: Record<DonationStatus, typeof CalendarClock> = {
  concept: ClipboardCheck,
  aangemeld: ClipboardCheck,
  pickup_gepland: CalendarClock,
  ontvangen: PackageCheck,
  in_verwerking: Wrench,
  verwerkt: CheckCircle2,
  geannuleerd: ClipboardCheck,
};

function donationActionHint(status: DonationStatus): string {
  if (status === "pickup_gepland") {
    return "Leg direct datum en tijdvenster vast zodat de pickup niet als losse kleine actie verstopt zit.";
  }
  if (status === "ontvangen") {
    return "Bevestig zodra de hardware fysiek binnen is. Daarna kan de verwerking starten.";
  }
  if (status === "in_verwerking") {
    return "Start de refurbish-stap zodra de batch gecontroleerd is.";
  }
  if (status === "verwerkt") {
    return "Rond de batch af wanneer de bruikbare laptops zijn verwerkt.";
  }
  return "Werk de batchstatus bij naar de volgende logistieke stap.";
}

const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"status" | "berichten" | "documenten">("status");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentKind, setDocumentKind] = useState<"donation_report" | "data_wipe_certificate" | "other">("donation_report");
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupPlanDate, setPickupPlanDate] = useState("");
  const [pickupPlanWindow, setPickupPlanWindow] = useState("");
  const [pickupPlanShipment, setPickupPlanShipment] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingPickupDate, setEditingPickupDate] = useState(false);
  const [pickupDateDraft, setPickupDateDraft] = useState("");
  const [pickupDateSaving, setPickupDateSaving] = useState(false);
  const [pickupDateError, setPickupDateError] = useState<string | null>(null);

  const donationId = id?.trim() ?? "";

  const { data: donation, isLoading, isError, error: donationError } = useQuery({
    queryKey: queryKeys.donations.detail(donationId),
    queryFn: async (): Promise<DonationDetailRow | null> => {
      const supabase = getSupabaseClient();
      const { data: batch, error: batchError } = await supabase
        .from("donation_batches")
        .select("*")
        .eq("id", donationId)
        .maybeSingle();
      if (batchError) throw batchError;
      if (!batch) return null;

      const [{ data: sponsorRow, error: sponsorErr }, partnerResult, locationResult] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("name")
            .eq("id", batch.sponsor_organization_id)
            .maybeSingle(),
          batch.assigned_service_partner_id
            ? supabase
                .from("organizations")
                .select("name")
                .eq("id", batch.assigned_service_partner_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          batch.assigned_stock_location_id
            ? supabase
                .from("stock_locations")
                .select("name, city")
                .eq("id", batch.assigned_stock_location_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

      if (sponsorErr) throw sponsorErr;
      if (partnerResult.error) throw partnerResult.error;
      if (locationResult.error) throw locationResult.error;

      return {
        ...batch,
        organizations: normalizeNamedRelation(sponsorRow),
        service_partner: normalizeNamedRelation(partnerResult.data),
        assigned_location: normalizeAssignedLocation(locationResult.data),
      };
    },
    enabled: donationId.length > 0,
  });

  const { data: workflowEvents = [] } = useQuery({
    queryKey: ["workflow-events", "donation", donationId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("workflow_events")
        .select("*")
        .eq("case_id", donationId)
        .eq("case_type", "donation")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowEventRow[];
    },
    enabled: donationId.length > 0,
  });

  const { data: messages = [] } = useQuery({
    queryKey: queryKeys.messages.byCase(donationId),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("messages")
        .select("*")
        .eq("case_id", donationId)
        .eq("case_type", "donation")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
    enabled: donationId.length > 0,
  });

  const { data: documents = [] } = useQuery({
    queryKey: queryKeys.documents.byCase(donationId),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("documents")
        .select("*")
        .eq("case_id", donationId)
        .eq("case_type", "donation")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
    enabled: donationId.length > 0,
  });

  type TransitionPayload = {
    nextStatus: DonationStatus;
    pickupPlan?: { pickup_date: string; pickup_window?: string; shipment_reference?: string };
  };

  const transitionMutation = useMutation({
    mutationFn: async ({ nextStatus, pickupPlan }: TransitionPayload) => {
      const patch: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === "pickup_gepland" && pickupPlan?.pickup_date) {
        patch.pickup_date = pickupPlan.pickup_date;
        patch.pickup_scheduled_at = new Date().toISOString();
        if (pickupPlan.pickup_window?.trim()) {
          patch.pickup_window = pickupPlan.pickup_window.trim();
        }
        if (pickupPlan.shipment_reference?.trim()) {
          patch.shipment_reference = pickupPlan.shipment_reference.trim();
        }
      }

      if (nextStatus === "ontvangen") patch.picked_up_at = new Date().toISOString();
      if (nextStatus === "verwerkt") patch.processed_at = new Date().toISOString();

      const { error } = await getSupabaseClient()
        .from("donation_batches")
        .update(patch)
        .eq("id", donationId);
      if (error) throw error;

      const { error: eventError } = await getSupabaseClient().from("workflow_events").insert({
        id: crypto.randomUUID(),
        case_id: donationId,
        case_type: "donation",
        status: nextStatus,
        title: `Status gewijzigd naar ${nextStatus}`,
        description: `${user?.name ?? "Gebruiker"} heeft de status bijgewerkt naar ${nextStatus}.`,
        actor_name: user?.name ?? "Onbekend",
        actor_role: user?.role ?? "digidromen_staff",
        created_at: new Date().toISOString(),
        metadata: {},
      });
      if (eventError) throw eventError;
    },
    onSuccess: () => {
      setPickupModalOpen(false);
      setPickupPlanDate("");
      setPickupPlanWindow("");
      setPickupPlanShipment("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.detail(donationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events", "donation", donationId] });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await getSupabaseClient().from("messages").insert({
        id: crypto.randomUUID(),
        case_id: donationId,
        case_type: "donation",
        body,
        author_name: user?.name ?? "Gebruiker",
        author_role: user?.role ?? "digidromen_staff",
        author_user_id: user?.id ?? null,
        created_at: new Date().toISOString(),
        kind: "manual",
        internal_only: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.byCase(donationId) });
      setMessage("");
    },
  });

  const documentMutation = useMutation({
    mutationFn: async ({ fileName, kind }: { fileName: string; kind: typeof documentKind }) => {
      const certificatePatch =
        kind === "data_wipe_certificate"
          ? { certificate_uploaded_at: new Date().toISOString() }
          : null;

      const { error } = await getSupabaseClient().from("documents").insert({
        id: crypto.randomUUID(),
        case_id: donationId,
        case_type: "donation",
        file_name: fileName,
        file_size_label: "Metadata only",
        kind,
        mime_type: "application/pdf",
        storage_mode: "metadata_only",
        uploaded_at: new Date().toISOString(),
        uploaded_by_name: user?.name ?? "Gebruiker",
        uploaded_by_user_id: user?.id ?? null,
      });
      if (error) throw error;

      if (certificatePatch) {
        const { error: patchError } = await getSupabaseClient()
          .from("donation_batches")
          .update(certificatePatch)
          .eq("id", donationId);
        if (patchError) throw patchError;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.byCase(donationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.detail(donationId) });
      setDocumentName("");
    },
  });

  const documentKindLabel = (kind: string | null) => {
    if (kind === "donation_report") return "Donatierapportage";
    if (kind === "data_wipe_certificate") return "Dataverwijderingscertificaat";
    if (kind === "shipping_note") return "Pakbon";
    return "Document";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonDetailSection rows={5} />
        <SkeletonDetailSection rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/donations")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" /> Terug naar donaties
        </button>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Donatie kon niet worden geladen</h2>
          <p className="mt-2 text-sm text-slate-700">
            {donationError instanceof Error ? donationError.message : String(donationError)}
          </p>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/donations")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" /> Terug naar donaties
        </button>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Donatiebatch niet gevonden</h2>
          <p className="mt-2 text-sm text-slate-500">
            Geen batch met dit id (of je hebt geen toegang). Controleer de URL of open de batch vanuit het overzicht.
          </p>
        </div>
      </div>
    );
  }

  const role: Role = (user?.role as Role) ?? "help_org";
  const manageContext = {
    role,
    userOrganizationId: user?.organizationId,
    assignedServicePartnerId: donation.assigned_service_partner_id,
  };
  const canManage = donationWorkflow.canManage(manageContext);
  const nextStatuses = donationWorkflow.nextStates(manageContext, donation.status);
  const primaryAction = nextStatuses[0] ?? null;
  const PrimaryActionIcon = primaryAction ? donationActionIcon[primaryAction] : CheckCircle2;

  const hasDonationReport = documents.some(
    (doc) => doc.kind === "donation_report" || doc.kind === "data_wipe_certificate",
  );

  const handleTransitionClick = (next: DonationStatus) => {
    transitionMutation.reset();
    if (next === "pickup_gepland") {
      setPickupPlanDate(
        donation.pickup_date
          ? donation.pickup_date.slice(0, 10)
          : "",
      );
      setPickupPlanWindow(donation.pickup_window ?? "");
      setPickupPlanShipment(donation.shipment_reference ?? "");
      setPickupModalOpen(true);
      return;
    }
    if (next === "verwerkt" && !hasDonationReport) {
      setActiveTab("documenten");
      transitionMutation.reset();
      window.alert(
        "Upload eerst de donatierapportage en/of het dataverwijderingscertificaat onder het tabblad Documenten voordat je deze batch op 'Verwerkt' kunt zetten.",
      );
      return;
    }
    transitionMutation.mutate({ nextStatus: next });
  };

  const handleConfirmPickupPlan = () => {
    if (!pickupPlanDate.trim()) return;
    transitionMutation.mutate({
      nextStatus: "pickup_gepland",
      pickupPlan: {
        pickup_date: pickupPlanDate,
        pickup_window: pickupPlanWindow.trim() || undefined,
        shipment_reference: pickupPlanShipment.trim() || undefined,
      },
    });
  };

  const handleSavePickupDate = async () => {
    setPickupDateError(null);
    setPickupDateSaving(true);
    const { error } = await getSupabaseClient()
      .from("donation_batches")
      .update({
        pickup_date: pickupDateDraft || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", donationId);
    setPickupDateSaving(false);
    if (error) {
      setPickupDateError(translateError(error, "Wijzigen mislukt."));
      return;
    }
    setEditingPickupDate(false);
    await queryClient.invalidateQueries({ queryKey: queryKeys.donations.detail(donationId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
  };
  const timelineEvents: TimelineEvent[] = workflowEvents.map((event) => ({
    id: event.id,
    status: event.status,
    message: event.description,
    timestamp: event.created_at,
    kind: "system",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/donations")} className="flex min-h-11 items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" />
          Terug naar donaties
        </button>
      </div>

      <DonationAssignmentModal
        donationId={donation.id}
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => setAssignModalOpen(false)}
        currentPartnerId={donation.assigned_service_partner_id}
        currentLocationId={donation.assigned_stock_location_id}
      />

      <Dialog
        open={pickupModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            transitionMutation.reset();
          }
          setPickupModalOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border-digidromen-cream p-0 sm:max-w-xl">
          <div className="bg-surface-soft px-6 pb-5 pt-6">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-digidromen-orange text-white">
                <CalendarClock size={22} />
              </div>
              <DialogTitle className="font-heading text-2xl text-digidromen-dark">
                Pickup plannen
              </DialogTitle>
              <DialogDescription className="leading-relaxed text-digidromen-dark/58">
                Zet deze batch op ophaal gepland en leg direct vast wanneer de hardware wordt opgehaald.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-digidromen-cream bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-digidromen-dark/45">
                Pickup locatie
              </p>
              <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-digidromen-dark/70">
                <MapPin size={16} className="mt-0.5 shrink-0 text-digidromen-orange" />
                <span>{donation.pickup_contact_name}, {donation.pickup_address}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-plan-date" className="text-digidromen-dark">
                  Geplande ophaaldatum *
                </Label>
                <Input
                  id="pickup-plan-date"
                  type="date"
                  value={pickupPlanDate}
                  onChange={(e) => setPickupPlanDate(e.target.value)}
                  className="min-h-11 rounded-2xl border-digidromen-cream bg-white focus-visible:ring-digidromen-orange/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-plan-window" className="text-digidromen-dark">
                  Tijdvenster
                </Label>
                <Input
                  id="pickup-plan-window"
                  type="text"
                  value={pickupPlanWindow}
                  onChange={(e) => setPickupPlanWindow(e.target.value)}
                  placeholder="Bijv. ochtend 09:00-12:00"
                  className="min-h-11 rounded-2xl border-digidromen-cream bg-white focus-visible:ring-digidromen-orange/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-plan-shipment" className="text-digidromen-dark">
                Ladingnummer Aces Direct
              </Label>
              <Input
                id="pickup-plan-shipment"
                type="text"
                value={pickupPlanShipment}
                onChange={(e) => setPickupPlanShipment(e.target.value)}
                placeholder="Bijv. AD-2026-00123"
                className="min-h-11 rounded-2xl border-digidromen-cream bg-white focus-visible:ring-digidromen-orange/30"
              />
              <p className="text-xs text-digidromen-dark/55">
                Het referentienummer waarmee Aces Direct deze lading communiceert.
              </p>
            </div>
            {transitionMutation.isError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {translateError(transitionMutation.error, "Opslaan mislukt. Controleer de datum en probeer opnieuw.")}
              </p>
            ) : null}
          </div>
          <DialogFooter className="border-t border-digidromen-cream bg-white px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                transitionMutation.reset();
                setPickupModalOpen(false);
              }}
              className="min-h-11 rounded-[18px] border-digidromen-cream"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              disabled={!pickupPlanDate.trim() || transitionMutation.isPending}
              onClick={() => handleConfirmPickupPlan()}
              className="min-h-11 rounded-[18px] bg-digidromen-orange px-5 text-white hover:bg-digidromen-orange-hover"
            >
              {transitionMutation.isPending ? "Opslaan..." : "Pickup vastleggen"}
              {!transitionMutation.isPending ? <ArrowRight size={16} /> : null}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {primaryAction ? (
        <Card className="overflow-hidden rounded-3xl border-digidromen-orange/20 bg-digidromen-orange-light py-0 shadow-sm">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-digidromen-orange text-white shadow-sm">
                <PrimaryActionIcon size={26} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-digidromen-orange">
                  Volgende logistieke stap
                </p>
                <h1 className="mt-1 font-heading text-2xl font-semibold text-digidromen-dark">
                  {donationWorkflow.actionLabel(primaryAction)}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-digidromen-dark/62">
                  {donationActionHint(primaryAction)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              disabled={transitionMutation.isPending}
              onClick={() => handleTransitionClick(primaryAction)}
              className="min-h-12 rounded-[20px] bg-digidromen-orange px-6 text-base font-semibold text-white hover:bg-digidromen-orange-hover"
            >
              <PrimaryActionIcon size={18} />
              {transitionMutation.isPending ? "Bezig..." : donationWorkflow.actionLabel(primaryAction)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        role === "service_partner" && !canManage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
            Deze batch is nog niet aan jullie servicepunt toegewezen. Tot die tijd kan alleen Digidromen de voortgang bijwerken.
          </div>
        ) : null
      )}

      {transitionMutation.isError && !pickupModalOpen ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {translateError(
            transitionMutation.error,
            "Actie mislukt. Mogelijk ontbreken rechten of is de batch niet aan jullie servicepunt toegewezen.",
          )}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Donatiebatch</h2>
                <p className="mt-0.5 font-mono text-sm text-digidromen-orange">{donation.id}</p>
                <p className="text-sm text-slate-500">Geregistreerd op {formatDate(donation.registered_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${donationWorkflow.badgeClass(donation.status)}`}>
                {donationWorkflow.label(donation.status)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Donor</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{donation.organizations?.name ?? "Onbekende donor"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Toegezegde devices</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{donation.device_count_promised}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Refurbish gereed</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{donation.refurbish_ready_count ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rejected count</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{donation.rejected_count ?? 0}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-digidromen-orange-light p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-digidromen-orange">Pickup details</p>
              <p className="mt-2 text-sm text-slate-700">{donation.pickup_contact_name}, {donation.pickup_address}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span>
                  Geplande pickup:{" "}
                  {editingPickupDate ? null : donation.pickup_date ? formatDate(donation.pickup_date) : "-"}
                </span>
                {editingPickupDate ? (
                  <>
                    <input
                      type="date"
                      value={pickupDateDraft}
                      onChange={(e) => setPickupDateDraft(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { void handleSavePickupDate(); }}
                      disabled={pickupDateSaving}
                      className="rounded-lg bg-digidromen-orange px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {pickupDateSaving ? "Opslaan..." : "Opslaan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPickupDate(false);
                        setPickupDateError(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Annuleren
                    </button>
                  </>
                ) : canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPickupDateDraft(donation.pickup_date ? donation.pickup_date.slice(0, 10) : "");
                      setEditingPickupDate(true);
                    }}
                    className="text-xs font-semibold text-digidromen-orange hover:underline"
                  >
                    {donation.pickup_date ? "Wijzigen" : "Invullen"}
                  </button>
                ) : null}
              </div>
              {donation.pickup_window ? (
                <p className="mt-1 text-sm text-slate-700">Tijdvenster: {donation.pickup_window}</p>
              ) : null}
              {donation.shipment_reference ? (
                <p className="mt-1 text-sm text-slate-700">
                  Ladingnummer Aces Direct: <span className="font-mono font-semibold">{donation.shipment_reference}</span>
                </p>
              ) : null}
              {pickupDateError ? (
                <p className="mt-1 text-xs text-red-600">{pickupDateError}</p>
              ) : null}
            </div>

            {donation.notes ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notities</p>
                <p className="mt-2 text-sm text-slate-700">{donation.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex border-b border-slate-100">
              {(["status", "berichten", "documenten"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-bold ${
                    activeTab === tab
                      ? "border-b-2 border-digidromen-orange bg-digidromen-orange-light/60 text-digidromen-orange"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab === "status" ? "Status historie" : tab === "berichten" ? "Berichten" : "Documenten"}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "status" ? <Timeline events={timelineEvents} /> : null}

              {activeTab === "berichten" ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {messages.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{item.author_name}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                      </div>
                    ))}
                    {messages.length === 0 ? <p className="text-sm text-slate-400">Nog geen berichten.</p> : null}
                  </div>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                    placeholder="Plaats een update in de tijdlijn"
                  />
                  <button
                    disabled={!message.trim() || messageMutation.isPending}
                    onClick={() => {
                      if (!message.trim()) return;
                      messageMutation.mutate(message.trim());
                    }}
                    className="flex items-center gap-2 rounded-lg bg-digidromen-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Send size={14} />
                    Bericht toevoegen
                  </button>
                </div>
              ) : null}

              {activeTab === "documenten" ? (
                <div className="space-y-4">
                  {!hasDonationReport && donation.status !== "verwerkt" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Voor status <strong>Verwerkt</strong> moet de donatierapportage of een dataverwijderingscertificaat zijn gekoppeld.
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {documents.map((item) => (
                      <div key={item.id} className="flex items-center rounded-xl bg-slate-50 p-3">
                        <Paperclip size={16} className="mr-3 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{item.file_name}</p>
                          <p className="text-xs text-slate-400">
                            {documentKindLabel(item.kind)} · {item.file_size_label}
                          </p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 ? <p className="text-sm text-slate-400">Nog geen documenten.</p> : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={documentName}
                      onChange={(event) => setDocumentName(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                      placeholder="Bijv. donatierapportage-2026Q2.pdf"
                    />
                    <select
                      value={documentKind}
                      onChange={(event) => setDocumentKind(event.target.value as typeof documentKind)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                    >
                      <option value="donation_report">Donatierapportage</option>
                      <option value="data_wipe_certificate">Dataverwijderingscertificaat</option>
                      <option value="other">Overig document</option>
                    </select>
                  </div>
                  <button
                    disabled={!documentName.trim() || documentMutation.isPending}
                    onClick={() => {
                      if (!documentName.trim()) return;
                      documentMutation.mutate({ fileName: documentName.trim(), kind: documentKind });
                    }}
                    className="rounded-lg bg-digidromen-orange px-4 py-2 text-sm font-semibold text-white hover:bg-digidromen-orange-hover disabled:opacity-60"
                  >
                    Document koppelen
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
              <HeartHandshake size={18} className="mr-2 text-digidromen-orange" />
              Batchsamenvatting
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Contact</dt>
                <dd className="font-semibold text-slate-800">{donation.pickup_contact_email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Servicepartner</dt>
                <dd className="font-semibold text-slate-800">
                  {donation.service_partner?.name ?? (
                    <span className="text-amber-600">Niet toegewezen</span>
                  )}
                </dd>
              </div>
              {donation.assigned_location && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Locatie</dt>
                  <dd className="font-semibold text-slate-800">
                    {donation.assigned_location.name}
                    {donation.assigned_location.city ? ` — ${donation.assigned_location.city}` : ""}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Laatste update</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(donation.updated_at)}</dd>
              </div>
            </dl>
            {/* Toewijzen knop: zichtbaar voor staff/admin als status nog vroeg is */}
            {(role === "digidromen_staff" || role === "digidromen_admin") &&
              !["ontvangen", "in_verwerking", "verwerkt", "geannuleerd"].includes(donation.status) && (
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="mt-4 w-full rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white hover:bg-digidromen-orange-hover"
              >
                {donation.assigned_service_partner_id ? "Hertoewijzen" : "Servicepartner toewijzen"}
              </button>
            )}
          </div>

          <CrmPreparationCard
            subjectLabel="Deze donatiebatch"
            references={[
              { label: "CRM relatie", value: formatCrmReference(donation.crm_relation_id) },
              { label: "CRM case", value: formatCrmReference(donation.crm_case_id) },
              { label: "CRM taak", value: formatCrmReference(donation.crm_task_id) },
            ]}
            syncStates={[]}
          />
        </aside>
      </div>
    </div>
  );
};

export default DonationDetail;
