import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Paperclip, Send, Wrench, XCircle } from "lucide-react";

import CrmPreparationCard from "../components/CrmPreparationCard";
import Timeline from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatDateTime } from "../lib/format";
import { formatCrmReference } from "../lib/crm-preparation";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
import type { TimelineEvent } from "../types";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ONTVANGEN: "bg-blue-100 text-blue-800",
    DIAGNOSE: "bg-amber-100 text-amber-800",
    IN_REPARATIE: "bg-purple-100 text-purple-800",
    TEST: "bg-sky-100 text-sky-800",
    RETOUR: "bg-green-100 text-green-800",
    IRREPARABEL: "bg-red-100 text-red-800",
    AFGESLOTEN: "bg-slate-100 text-slate-800",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}

function statusButtonStyle(status: string) {
  if (status === "IRREPARABEL") return "bg-red-600 hover:bg-red-700 text-white";
  if (status === "AFGESLOTEN" || status === "RETOUR") return "bg-green-600 hover:bg-green-700 text-white";
  if (status === "DIAGNOSE" || status === "TEST") return "bg-amber-500 hover:bg-amber-600 text-white";
  return "bg-orange-600 hover:bg-orange-700 text-white";
}

function getNextStatuses(role: string, status: string): string[] {
  if (role === "help_org") return [];
  const flow: Record<string, string[]> = {
    ONTVANGEN: ["DIAGNOSE", "IRREPARABEL"],
    DIAGNOSE: ["IN_REPARATIE", "IRREPARABEL"],
    IN_REPARATIE: ["TEST", "IRREPARABEL"],
    TEST: ["RETOUR", "IRREPARABEL"],
    RETOUR: ["AFGESLOTEN"],
    IRREPARABEL: role === "service_partner" ? [] : ["AFGESLOTEN"],
  };
  return flow[status] ?? [];
}

const RepairDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"status" | "berichten" | "documenten">("status");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");

  const { data: repair, isLoading } = useQuery({
    queryKey: queryKeys.repairs.detail(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("repair_cases")
        .select("*, organizations!repair_cases_organization_id_fkey(name), service_partner:organizations!repair_cases_assigned_service_partner_id_fkey(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: repairLogs = [] } = useQuery({
    queryKey: queryKeys.repairs.logs(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("repair_logs")
        .select("*")
        .eq("repair_case_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: workflowEvents = [] } = useQuery({
    queryKey: ["workflow-events", "repair", id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("workflow_events")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "repair")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
        .eq("case_type", "repair")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
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
        .eq("case_type", "repair")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      const { error } = await getSupabaseClient()
        .from("repair_cases")
        .update({ status: nextStatus as any, updated_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;

      const { error: eventError } = await getSupabaseClient().from("workflow_events").insert({
        id: crypto.randomUUID(),
        case_id: id!,
        case_type: "repair",
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.repairs.detail(id!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.repairs.all });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events", "repair", id] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await getSupabaseClient().from("messages").insert({
        id: crypto.randomUUID(),
        case_id: id!,
        case_type: "repair",
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
        case_type: "repair",
        file_name: fileName,
        file_size_label: "Metadata only",
        kind: "repair_report" as any,
        mime_type: "application/pdf",
        storage_mode: "metadata_only" as any,
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/repairs")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" /> Terug naar reparaties
        </button>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Reparatie niet gevonden</h2>
        </div>
      </div>
    );
  }

  const role = user?.role ?? "help_org";
  const nextStatuses = getNextStatuses(role, repair.status);
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
        <button onClick={() => navigate("/repairs")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" />
          Terug naar reparaties
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate(status)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${statusButtonStyle(status)}`}
            >
              {status === "IRREPARABEL" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
              {status === "IRREPARABEL" ? "Markeer irreparabel" : `→ ${status}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Reparatie</h2>
                <p className="mt-0.5 font-mono text-sm text-orange-700">{repair.id}</p>
                <p className="text-sm text-slate-500">Aangemeld op {formatDate(repair.received_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge(repair.status)}`}>
                {repair.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Klant</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{(repair as any).organizations?.name ?? "Onbekend"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Laptop</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Serienummer</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{repair.serial_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Issue type</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{repair.issue_type}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Notities</p>
              <p className="mt-2 text-sm text-slate-700">{repair.notes}</p>
            </div>

            {repairLogs.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-3 font-bold text-slate-900">Technische logs</h3>
                <div className="space-y-2">
                  {repairLogs.map((log) => (
                    <div key={log.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {log.repair_successful ? "Herstel geslaagd" : "Nog niet geslaagd"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{log.technician_notes ?? "Geen technische notitie."}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                    </div>
                  ))}
                </div>
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
                      ? "border-b-2 border-orange-600 bg-orange-50/60 text-orange-700"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-600 focus:ring-2"
                    placeholder="Plaats een update in de tijdlijn"
                  />
                  <button
                    disabled={!message.trim() || messageMutation.isPending}
                    onClick={() => {
                      if (!message.trim()) return;
                      messageMutation.mutate(message.trim());
                    }}
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-600 focus:ring-2"
                    placeholder="Bijv. reparatierapport.pdf"
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
              <Wrench size={18} className="mr-2 text-orange-600" />
              Zaaksamenvatting
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Subtype</dt>
                <dd className="font-semibold text-slate-800">{repair.subtype}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Foto placeholders</dt>
                <dd className="font-semibold text-slate-800">{repair.photo_placeholder_count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Servicepartner</dt>
                <dd className="font-semibold text-slate-800">{(repair as any).service_partner?.name ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Laatst bijgewerkt</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(repair.updated_at)}</dd>
              </div>
            </dl>
          </div>

          <CrmPreparationCard
            subjectLabel="Deze reparatie"
            references={[
              { label: "CRM relatie", value: formatCrmReference(repair.crm_relation_id) },
              { label: "CRM case", value: formatCrmReference(repair.crm_case_id) },
              { label: "CRM taak", value: formatCrmReference(repair.crm_task_id) },
            ]}
            syncStates={[]}
          />
        </aside>
      </div>
    </div>
  );
};

export default RepairDetail;
