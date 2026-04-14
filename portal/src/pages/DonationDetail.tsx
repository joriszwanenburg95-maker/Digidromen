import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, HeartHandshake, Paperclip, Send } from "lucide-react";

import CrmPreparationCard from "../components/CrmPreparationCard";
import DonationAssignmentModal from "../components/DonationAssignmentModal";
import { SkeletonDetailSection } from "../components/Skeleton";
import Timeline from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatDateTime } from "../lib/format";
import { formatCrmReference } from "../lib/crm-preparation";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    aangemeld: "bg-blue-100 text-blue-800",
    pickup_gepland: "bg-amber-100 text-amber-800",
    ontvangen: "bg-sky-100 text-sky-800",
    in_verwerking: "bg-purple-100 text-purple-800",
    verwerkt: "bg-green-100 text-green-800",
    geannuleerd: "bg-red-100 text-red-800",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}

function statusButtonStyle(status: string) {
  if (status === "verwerkt") return "bg-green-600 hover:bg-green-700 text-white";
  if (status === "pickup_gepland" || status === "in_verwerking") return "bg-amber-500 hover:bg-amber-600 text-white";
  return "bg-digidromen-primary hover:bg-blue-700 text-white";
}

function getNextStatuses(status: DonationStatus): DonationStatus[] {
  const flow: Partial<Record<DonationStatus, DonationStatus[]>> = {
    aangemeld: ["pickup_gepland"],
    pickup_gepland: ["ontvangen"],
    ontvangen: ["in_verwerking"],
    in_verwerking: ["verwerkt"],
  };
  return flow[status] ?? [];
}

/** Staff/admin: altijd; service_partner: alleen als batch aan hun organisatie is toegewezen. */
function canManageDonationWorkflow(
  role: string,
  userOrganizationId: string | undefined,
  assignedServicePartnerId: string | null,
): boolean {
  if (role === "help_org") return false;
  if (role === "digidromen_staff" || role === "digidromen_admin") return true;
  if (role === "service_partner") {
    return (
      !!assignedServicePartnerId &&
      assignedServicePartnerId === userOrganizationId
    );
  }
  return false;
}

const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"status" | "berichten" | "documenten">("status");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupPlanDate, setPickupPlanDate] = useState("");
  const [pickupPlanWindow, setPickupPlanWindow] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const { data: donation, isLoading } = useQuery({
    queryKey: queryKeys.donations.detail(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("*, organizations!donation_batches_sponsor_organization_id_fkey(name), service_partner:organizations!donation_batches_assigned_service_partner_id_fkey(name), assigned_location:stock_locations!donation_batches_assigned_stock_location_id_fkey(name, city)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { organizations, service_partner, assigned_location, ...batch } = data;
      return {
        ...batch,
        organizations: normalizeNamedRelation(organizations),
        service_partner: normalizeNamedRelation(service_partner),
        assigned_location: normalizeAssignedLocation(assigned_location),
      };
    },
    enabled: !!id,
  });

  const { data: workflowEvents = [] } = useQuery({
    queryKey: ["workflow-events", "donation", id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("workflow_events")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "donation")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowEventRow[];
    },
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: queryKeys.messages.byCase(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("messages")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "donation")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: queryKeys.documents.byCase(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("documents")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "donation")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
    enabled: !!id,
  });

  type TransitionPayload = {
    nextStatus: DonationStatus;
    pickupPlan?: { pickup_date: string; pickup_window?: string };
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
      }

      if (nextStatus === "ontvangen") patch.picked_up_at = new Date().toISOString();
      if (nextStatus === "verwerkt") patch.processed_at = new Date().toISOString();

      const { error } = await getSupabaseClient()
        .from("donation_batches")
        .update(patch)
        .eq("id", id!);
      if (error) throw error;

      const { error: eventError } = await getSupabaseClient().from("workflow_events").insert({
        id: crypto.randomUUID(),
        case_id: id!,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.detail(id!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events", "donation", id] });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await getSupabaseClient().from("messages").insert({
        id: crypto.randomUUID(),
        case_id: id!,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.byCase(id!) });
      setMessage("");
    },
  });

  const documentMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await getSupabaseClient().from("documents").insert({
        id: crypto.randomUUID(),
        case_id: id!,
        case_type: "donation",
        file_name: fileName,
        file_size_label: "Metadata only",
        kind: "donation_report",
        mime_type: "application/pdf",
        storage_mode: "metadata_only",
        uploaded_at: new Date().toISOString(),
        uploaded_by_name: user?.name ?? "Gebruiker",
        uploaded_by_user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.byCase(id!) });
      setDocumentName("");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonDetailSection rows={5} />
        <SkeletonDetailSection rows={4} />
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
        </div>
      </div>
    );
  }

  const role = user?.role ?? "help_org";
  const canManage = canManageDonationWorkflow(
    role,
    user?.organizationId,
    donation.assigned_service_partner_id,
  );
  const nextStatuses = canManage ? getNextStatuses(donation.status) : [];

  const handleTransitionClick = (next: DonationStatus) => {
    transitionMutation.reset();
    if (next === "pickup_gepland") {
      setPickupPlanDate(
        donation.pickup_date
          ? donation.pickup_date.slice(0, 10)
          : "",
      );
      setPickupPlanWindow(donation.pickup_window ?? "");
      setPickupModalOpen(true);
    } else {
      transitionMutation.mutate({ nextStatus: next });
    }
  };

  const handleConfirmPickupPlan = () => {
    if (!pickupPlanDate.trim()) return;
    transitionMutation.mutate({
      nextStatus: "pickup_gepland",
      pickupPlan: {
        pickup_date: pickupPlanDate,
        pickup_window: pickupPlanWindow.trim() || undefined,
      },
    });
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
        <button onClick={() => navigate("/donations")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" />
          Terug naar donaties
        </button>
        <div className="flex max-w-xl flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {nextStatuses.map((next) => (
              <button
                key={next}
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => handleTransitionClick(next)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${statusButtonStyle(next)}`}
              >
                <CheckCircle2 size={15} />
                {next === "pickup_gepland" ? "Pickup plannen" : `→ ${next}`}
              </button>
            ))}
          </div>
          {nextStatuses.length > 0 ? (
            <p className="text-right text-xs text-slate-500">
              Geen aparte pagina: de status wordt hier bijgewerkt. Bij pickup
              plannen vul je de geplande ophaaldatum in.
            </p>
          ) : null}
          {role === "service_partner" && !canManage ? (
            <p className="text-right text-xs text-amber-800">
              Deze batch is nog niet aan jullie servicepunt toegewezen. Tot die
              tijd kan alleen Digidromen de voortgang bijwerken.
            </p>
          ) : null}
          {transitionMutation.isError ? (
            <p className="text-right text-sm text-red-600" role="alert">
              {transitionMutation.error instanceof Error
                ? transitionMutation.error.message
                : "Actie mislukt. Mogelijk ontbreken rechten (bijv. toewijzing voor servicepartner)."}
            </p>
          ) : null}
        </div>
      </div>

      <DonationAssignmentModal
        donationId={donation.id}
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => setAssignModalOpen(false)}
        currentPartnerId={donation.assigned_service_partner_id}
        currentLocationId={donation.assigned_stock_location_id}
      />

      {pickupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="pickup-plan-title"
          >
            <h2
              id="pickup-plan-title"
              className="text-lg font-bold text-slate-900"
            >
              Pickup plannen
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Zet de status op &apos;Ophaal gepland&apos; en vul wanneer de
              hardware opgehaald wordt.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="pickup-plan-date"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Geplande ophaaldatum *
                </label>
                <input
                  id="pickup-plan-date"
                  type="date"
                  value={pickupPlanDate}
                  onChange={(e) => setPickupPlanDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="pickup-plan-window"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Tijdvenster (optioneel)
                </label>
                <input
                  id="pickup-plan-window"
                  type="text"
                  value={pickupPlanWindow}
                  onChange={(e) => setPickupPlanWindow(e.target.value)}
                  placeholder="bijv. ochtend 09:00–12:00"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {transitionMutation.isError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {transitionMutation.error instanceof Error
                  ? transitionMutation.error.message
                  : "Opslaan mislukt."}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  transitionMutation.reset();
                  setPickupModalOpen(false);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Annuleren
              </button>
              <button
                type="button"
                disabled={
                  !pickupPlanDate.trim() || transitionMutation.isPending
                }
                onClick={() => handleConfirmPickupPlan()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {transitionMutation.isPending ? "Bezig..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Donatiebatch</h2>
                <p className="mt-0.5 font-mono text-sm text-green-700">{donation.id}</p>
                <p className="text-sm text-slate-500">Geregistreerd op {formatDate(donation.registered_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge(donation.status)}`}>
                {donation.status}
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

            <div className="mt-6 rounded-xl bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Pickup details</p>
              <p className="mt-2 text-sm text-slate-700">{donation.pickup_contact_name}, {donation.pickup_address}</p>
              <p className="mt-1 text-sm text-slate-700">Geplande pickup: {donation.pickup_date ? formatDate(donation.pickup_date) : "-"}</p>
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
                      ? "border-b-2 border-green-600 bg-green-50/60 text-green-700"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-600 focus:ring-2"
                    placeholder="Plaats een update in de tijdlijn"
                  />
                  <button
                    disabled={!message.trim() || messageMutation.isPending}
                    onClick={() => {
                      if (!message.trim()) return;
                      messageMutation.mutate(message.trim());
                    }}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Send size={14} />
                    Bericht toevoegen
                  </button>
                </div>
              ) : null}

              {activeTab === "documenten" ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {documents.map((item) => (
                      <div key={item.id} className="flex items-center rounded-xl bg-slate-50 p-3">
                        <Paperclip size={16} className="mr-3 text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.file_name}</p>
                          <p className="text-xs text-slate-400">{item.file_size_label}</p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 ? <p className="text-sm text-slate-400">Nog geen documenten.</p> : null}
                  </div>
                  <input
                    value={documentName}
                    onChange={(event) => setDocumentName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-600 focus:ring-2"
                    placeholder="Bijv. donation-manifest.pdf"
                  />
                  <button
                    disabled={!documentName.trim() || documentMutation.isPending}
                    onClick={() => {
                      if (!documentName.trim()) return;
                      documentMutation.mutate(documentName.trim());
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
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
              <HeartHandshake size={18} className="mr-2 text-green-600" />
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
                className="mt-4 w-full rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
