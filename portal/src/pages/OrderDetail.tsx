import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Paperclip, Package } from "lucide-react";

import Timeline from "../components/Timeline";
import {
  formatDate,
  formatDateTime,
  getCaseSyncStates,
  getOrderNextStatuses,
  getWorkflowEvents,
  portalStore,
  selectSubjectMessages,
  statusClasses,
  usePortalContext,
} from "../lib/portal";
import type { OrderStatus, TimelineEvent } from "../types";

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { snapshot, user } = usePortalContext();
  const [activeTab, setActiveTab] = useState<"status" | "berichten" | "documenten">("status");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");

  const order = id ? snapshot.data.orders[id] : undefined;

  const events = useMemo<TimelineEvent[]>(
    () =>
      order
        ? getWorkflowEvents(snapshot.data, order.timelineEventIds).map((event) => ({
            id: event.id,
            status: event.toStatus ?? event.fromStatus ?? "UPDATE",
            message: event.summary,
            timestamp: event.createdAt,
            kind:
              event.kind === "sync"
                ? "sync"
                : event.kind === "comment_added" || event.kind === "document_added"
                  ? "manual"
                  : "system",
          }))
        : [],
    [order, snapshot.data],
  );

  if (!order || !user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar bestellingen
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Bestelling niet gevonden</h2>
        </div>
      </div>
    );
  }

  const organization = snapshot.data.organizations[order.organizationId];
  const nextStatuses = getOrderNextStatuses(snapshot.role, order.status);
  const documents = order.documentIds
    .map((documentId) => snapshot.data.documents[documentId])
    .filter(Boolean);
  const messages = selectSubjectMessages(snapshot.data, snapshot.role, "order", order.id);
  const syncStates = getCaseSyncStates(snapshot.data, "order", order.id);

  const handleTransition = (nextStatus: OrderStatus) => {
    if (snapshot.role === "service_partner") {
      portalStore.servicePartner.shipmentUpdate({
        orderId: order.id,
        actorUserId: user.id,
        nextStatus:
          nextStatus === "VERZONDEN" || nextStatus === "GELEVERD"
            ? nextStatus
            : "VERZONDEN",
        summary: `Servicepartner zette order op ${nextStatus}.`,
      });
      return;
    }

    portalStore.transitionOrder(order.id, {
      actorUserId: user.id,
      nextStatus,
      summary: `Orderstatus bijgewerkt naar ${nextStatus}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar overzicht
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleTransition(status)}
              className="rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Zet naar {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Bestelling {order.id}</h2>
                <p className="text-sm text-slate-500">Geplaatst op {formatDate(order.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioriteit</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.priority}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regels</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.lineItems.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hulporganisatie</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{organization?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CRM case</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{order.crmCaseId ?? "-"}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Motivatie</p>
              <p className="mt-2 text-sm text-slate-700">{order.motivation}</p>
            </div>

            <div className="mt-6">
              <h3 className="mb-4 font-bold text-slate-900">Geselecteerde producten</h3>
              <div className="space-y-3">
                {order.lineItems.map((item) => {
                  const product = snapshot.data.products[item.productId];
                  return (
                    <div key={item.productId} className="flex items-center rounded-xl bg-slate-50 p-3">
                      <div className="mr-4 rounded-lg border border-slate-200 bg-white p-2">
                        <Package size={18} className="text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{product?.name}</p>
                        <p className="text-xs text-slate-500">{item.quantity} exemplaren</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex border-b border-slate-100">
              {[
                ["status", "Status historie"],
                ["berichten", "Berichten"],
                ["documenten", "Documenten"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    setActiveTab(key as "status" | "berichten" | "documenten")
                  }
                  className={`flex-1 py-4 text-sm font-bold ${
                    activeTab === key
                      ? "border-b-2 border-digidromen-primary bg-sky-50/60 text-digidromen-primary"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "status" ? <Timeline events={events} /> : null}

              {activeTab === "berichten" ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {messages.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.authorUserId
                              ? snapshot.data.users[item.authorUserId]?.fullName
                              : "Systeem"}
                          </p>
                          <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Typ een bericht..."
                  />
                  <button
                    onClick={() => {
                      if (!message.trim()) {
                        return;
                      }
                      portalStore.addMessage({
                        subjectType: "order",
                        subjectId: order.id,
                        authorUserId: user.id,
                        authorOrganizationId: user.organizationId,
                        body: message.trim(),
                        visibleToRoles: [
                          "help_org",
                          "digidromen_staff",
                          "digidromen_admin",
                          "service_partner",
                        ],
                      });
                      setMessage("");
                    }}
                    className="rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    Verzenden
                  </button>
                </div>
              ) : null}

              {activeTab === "documenten" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map((document) => (
                      <div key={document.id} className="flex items-center rounded-xl border border-slate-100 p-4">
                        <Paperclip size={18} className="mr-3 text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{document.fileName}</p>
                          <p className="text-xs text-slate-400">{document.sizeLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={documentName}
                      onChange={(event) => setDocumentName(event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                      placeholder="Bijv. pakbon.pdf"
                    />
                    <button
                      onClick={() => {
                        if (!documentName.trim()) {
                          return;
                        }
                        portalStore.addDocument({
                          subjectType: "order",
                          subjectId: order.id,
                          uploadedByUserId: user.id,
                          fileName: documentName.trim(),
                          category: "shipping",
                          mimeType: "application/pdf",
                          sizeLabel: "Metadata only",
                        });
                        setDocumentName("");
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Mock document koppelen
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
              <Clock size={18} className="mr-2 text-digidromen-primary" />
              Leveroverzicht
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Leverdatum</dt>
                <dd className="font-semibold text-slate-800">{formatDate(order.preferredDeliveryDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Servicepartner</dt>
                <dd className="font-semibold text-slate-800">
                  {order.servicePartnerOrganizationId
                    ? snapshot.data.organizations[order.servicePartnerOrganizationId]?.name
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Laatst bijgewerkt</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(order.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
              <CheckCircle2 size={18} className="mr-2 text-green-500" />
              CRM sync
            </h3>
            <div className="space-y-3">
              {syncStates.map((state) => (
                <div key={state.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClasses(state.status)}`}>
                      {state.status}
                    </span>
                    <span className="text-xs text-slate-400">{state.retryCount} retries</span>
                  </div>
                  <p className="mt-2 text-slate-600">{state.bufferedChanges.join(", ")}</p>
                  {state.failureReason ? (
                    <p className="mt-1 text-xs text-rose-600">{state.failureReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetail;
