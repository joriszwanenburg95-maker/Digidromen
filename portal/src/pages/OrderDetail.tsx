import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Paperclip,
  Plus,
  Send,
  XCircle,
} from "lucide-react";

import { SkeletonDetailSection } from "../components/Skeleton";
import Timeline from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatDateTime } from "../lib/format";
import {
  formatOrderLineDetailLabel,
  formatOrderLinesSummary,
} from "../lib/orderSummary";
import { translateError } from "../lib/errors";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
import { orderWorkflow, type Role } from "../lib/workflow";
import type { Database } from "../types/database";
import type { TimelineEvent } from "../types";

type OrderLineRow = Database["public"]["Tables"]["order_lines"]["Row"];
type OrderStatus = Database["public"]["Tables"]["orders"]["Row"]["status"];

type OrderLineWithProduct = OrderLineRow & {
  products: { id: string; name: string } | null;
};

type OrderDetailRow = Database["public"]["Tables"]["orders"]["Row"] & {
  order_lines: OrderLineWithProduct[];
  organizations: { name: string } | null;
  service_partner: { name: string } | null;
};

async function logOrderMovements(
  orderId: string,
  lines: Array<{ product_id: string; quantity: number }>,
  createdBy: string | undefined,
) {
  const movements = lines.map((line) => ({
    created_by: createdBy ?? null,
    movement_type: "order_fulfillment" as const,
    note: `Uitlevering order ${orderId}`,
    product_id: line.product_id,
    quantity_delta: -line.quantity,
    source_case_id: orderId,
    source_case_type: "order",
  }));

  const { error } = await getSupabaseClient()
    .from("inventory_movements")
    .insert(movements);

  if (error) {
    console.error("inventory_movements insert failed:", error.message);
  }
}

const PreferredDeliverySection: React.FC<{
  orderId: string;
  preferredDate: string | null;
  role: string;
  status: string;
  onSaved: () => void;
}> = ({ orderId, preferredDate, role, status, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(preferredDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = role === "help_org" && !["geleverd", "afgesloten", "afgewezen"].includes(status);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const { error: updateError } = await getSupabaseClient()
      .from("orders")
      .update({ preferred_delivery_date: date || null })
      .eq("id", orderId);
    setIsSaving(false);
    if (updateError) { setError(translateError(updateError)); return; }
    setEditing(false);
    onSaved();
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gewenste leverdatum</p>
      {editing && canEdit ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
          />
          <button type="button" onClick={() => { void handleSave(); }} disabled={isSaving}
            className="rounded-lg bg-digidromen-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700">Annuleren</button>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-800">
            {preferredDate ? new Date(preferredDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
              : <span className="italic text-slate-400">Nog niet ingevuld</span>}
          </p>
          {canEdit ? (
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-digidromen-primary hover:underline">
              {preferredDate ? "Wijzigen" : "Invullen"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

const DeliveryDateSection: React.FC<{
  orderId: string;
  deliveryDate: string | null;
  role: string;
  onSaved: () => void;
}> = ({ orderId, deliveryDate, role, onSaved }) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(deliveryDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit =
    role === "service_partner" ||
    role === "digidromen_admin" ||
    role === "digidromen_staff";

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const { error: updateError } = await getSupabaseClient()
      .from("orders")
      .update({
        delivery_date: date || null,
        delivery_date_set_by: user?.id ?? null,
        delivery_date_source: "manual",
      })
      .eq("id", orderId);

    setIsSaving(false);

    if (updateError) {
      setError(translateError(updateError));
      return;
    }

    setEditing(false);
    onSaved();
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Verzend-/bezorgdatum
      </p>
      {canEdit ? (
        <p className="mt-0.5 text-xs text-slate-400">
          Als je deze datum opslaat, krijgt de besteller automatisch een update-mail.
        </p>
      ) : null}

      {editing && canEdit ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-digidromen-primary/40"
          />
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className="rounded-lg bg-digidromen-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Annuleren
          </button>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-800">
            {deliveryDate ? (
              new Date(deliveryDate).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            ) : (
              <span className="italic text-slate-400">Nog niet ingevuld</span>
            )}
          </p>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-digidromen-primary hover:underline"
            >
              {deliveryDate ? "Wijzigen" : "Invullen"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"status" | "berichten" | "documenten">("status");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: [
      ...queryKeys.orders.detail(id!),
      user?.role,
      user?.organizationId,
    ],
    queryFn: async () => {
      const role: Role = (user?.role as Role) ?? "help_org";
      if (role === "help_org" && !user?.organizationId) return null;

      let query = getSupabaseClient()
        .from("orders")
        .select(
          "*, organizations!orders_organization_id_fkey(name), service_partner:organizations!orders_assigned_service_partner_id_fkey(name), order_lines(*, products(id, name))",
        )
        .eq("id", id!);

      if (role === "help_org") {
        query = query.eq("organization_id", user!.organizationId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as OrderDetailRow | null;
    },
    enabled: !!id && !!user,
  });

  const { data: workflowEvents = [] } = useQuery({
    queryKey: ["workflow-events", "order", id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("workflow_events")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: queryKeys.messages.byCase(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("messages")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "order")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: queryKeys.documents.byCase(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("documents")
        .select("*")
        .eq("case_id", id!)
        .eq("case_type", "order")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id,
  });

  const transitionMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      const { error } = await getSupabaseClient()
        .from("orders")
        .update({
          status: nextStatus as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id!);
      if (error) throw error;

      const orderLines = order.order_lines ?? [];

      if (nextStatus === "geleverd" && orderLines.length > 0) {
        await logOrderMovements(id!, orderLines, user?.id);
      }

      const { error: eventError } = await getSupabaseClient().from("workflow_events").insert({
        id: crypto.randomUUID(),
        case_id: id!,
        case_type: "order",
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events", "order", id] });
      void queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await getSupabaseClient().from("messages").insert({
        id: crypto.randomUUID(),
        case_id: id!,
        case_type: "order",
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
        case_type: "order",
        file_name: fileName,
        file_size_label: "Metadata only",
        kind: "shipping_note",
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
        <SkeletonDetailSection rows={6} />
        <SkeletonDetailSection rows={4} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/orders")} className="flex items-center text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} className="mr-2" /> Terug naar bestellingen
        </button>
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Bestelling niet gevonden</h2>
        </div>
      </div>
    );
  }

  const role: Role = (user?.role as Role) ?? "help_org";
  const isHelpOrg = role === "help_org";
  const nextStatuses = orderWorkflow.nextStates(role, order.status);
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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/orders")} className="flex items-center text-slate-500 hover:text-slate-700">
            <ArrowLeft size={18} className="mr-2" />
            Terug naar overzicht
          </button>
          {role === "help_org" ? (
            <button
              type="button"
              onClick={() => navigate("/orders?new=1")}
              className="flex items-center gap-1.5 rounded-[18px] bg-digidromen-orange px-3 py-1.5 text-sm font-semibold text-white hover:bg-digidromen-orange-hover"
            >
              <Plus size={14} />
              Nieuwe bestelling
            </button>
          ) : null}
        </div>

        <div className="flex max-w-xl flex-col items-end gap-2">
          {nextStatuses.length > 0 && order.status === "ingediend" ? (
            <p className="text-right text-xs text-slate-500">
              Beoordeel de aanvraag: <strong>Accorderen</strong> of <strong>Afwijzen</strong>.
              De besteller krijgt automatisch een bevestiging.
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            {nextStatuses.map((status) => (
              <button
                key={status}
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate(status)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${orderWorkflow.buttonClass(status)}`}
              >
                {status === "afgewezen" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                {orderWorkflow.actionLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Bestelling</h2>
                <p className="mt-0.5 font-mono text-sm text-digidromen-orange">{order.id}</p>
                <p className="text-sm text-slate-500">Geplaatst op {formatDate(order.created_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderWorkflow.badgeClass(order.status)}`}>
                {orderWorkflow.label(order.status)}
              </span>
            </div>

            {order.order_lines?.length ? (
              <div className="mt-6 rounded-xl border-2 border-digidromen-primary/25 bg-gradient-to-br from-digidromen-orange-light to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wat is er besteld</p>
                <p className="mt-2 text-lg font-bold leading-snug text-slate-900">
                  {formatOrderLinesSummary(order.order_lines)}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {!isHelpOrg ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioriteit</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{order.priority}</p>
                </div>
              ) : null}
              {!isHelpOrg ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regels</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{order.order_lines?.length ?? 0}</p>
                </div>
              ) : null}
              {!isHelpOrg ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Klant</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{order.organizations?.name ?? "Onbekend"}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bijgewerkt</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(order.updated_at)}</p>
              </div>
            </div>

            {order.order_lines?.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-3 font-bold text-slate-900">Orderregels (detail)</h3>
                <div className="space-y-2">
                  {order.order_lines.map((line, index) => {
                    const { title, subtitle } = formatOrderLineDetailLabel({
                      quantity: line.quantity,
                      line_type: line.line_type,
                      rma_category: line.rma_category,
                      products: line.products,
                    });

                    return (
                      <div key={line.id ?? index} className="flex items-center rounded-xl bg-slate-50 p-3">
                        <div className="mr-3 rounded-lg border border-slate-200 bg-white p-2">
                          <Package size={16} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{title}</p>
                          {subtitle ? (
                            <p className="text-xs text-slate-500">{subtitle}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
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
                  className={`flex-1 py-4 text-sm font-bold capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-digidromen-primary bg-digidromen-orange-light/70 text-digidromen-primary"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Typ een bericht..."
                  />
                  <button
                    disabled={!message.trim() || messageMutation.isPending}
                    onClick={() => {
                      if (!message.trim()) return;
                      messageMutation.mutate(message.trim());
                    }}
                    className="flex items-center gap-2 rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Send size={14} />
                    Verzenden
                  </button>
                </div>
              ) : null}

              {activeTab === "documenten" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map((item) => (
                      <div key={item.id} className="flex items-center rounded-xl border border-slate-100 p-4">
                        <Paperclip size={16} className="mr-3 text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.file_name}</p>
                          <p className="text-xs text-slate-400">{item.file_size_label}</p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 ? <p className="col-span-2 text-sm text-slate-400">Nog geen documenten.</p> : null}
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={documentName}
                      onChange={(event) => setDocumentName(event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                      placeholder="Bijv. pakbon.pdf"
                    />
                    <button
                      disabled={!documentName.trim() || documentMutation.isPending}
                      onClick={() => {
                        if (!documentName.trim()) return;
                        documentMutation.mutate(documentName.trim());
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Koppelen
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
              <Clock size={18} className="mr-2 text-digidromen-orange" />
              {isHelpOrg ? "Overzicht" : "Zaaksamenvatting"}
            </h3>
            <dl className="space-y-3 text-sm">
              {order.scheduled_delivery_date ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Geplande leverdatum</dt>
                  <dd className="font-semibold text-slate-800">{order.scheduled_delivery_date}</dd>
                </div>
              ) : null}
              {!isHelpOrg ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Servicepartner</dt>
                  <dd className="font-semibold text-slate-800">{order.service_partner?.name ?? "-"}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bijgewerkt</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(order.updated_at)}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3">
              <PreferredDeliverySection
                orderId={order.id}
                preferredDate={order.preferred_delivery_date ?? null}
                role={role}
                status={order.status}
                onSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id!) });
                }}
              />
              {role !== "help_org" ? (
                <DeliveryDateSection
                  orderId={order.id}
                  deliveryDate={order.delivery_date ?? null}
                  role={role}
                  onSaved={() => {
                    void queryClient.invalidateQueries({
                      queryKey: queryKeys.orders.detail(id!),
                    });
                  }}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bezorgdatum</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {order.delivery_date ? (
                      new Date(order.delivery_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
                    ) : (
                      <span className="italic text-slate-400">Nog niet ingevuld door servicepartner</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default OrderDetail;
