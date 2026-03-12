import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Paperclip, Wrench } from "lucide-react";

import Timeline from "../components/Timeline";
import {
  formatDate,
  formatDateTime,
  getCaseSyncStates,
  getRepairNextStatuses,
  getWorkflowEvents,
  portalStore,
  selectSubjectMessages,
  statusClasses,
  usePortalContext,
} from "../lib/portal";
import type { RepairStatus, TimelineEvent } from "../types";

const RepairDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { snapshot, user } = usePortalContext();
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");

  const repair = id ? snapshot.data.repairs[id] : undefined;

  const events = useMemo<TimelineEvent[]>(
    () =>
      repair
        ? getWorkflowEvents(snapshot.data, repair.timelineEventIds).map((event) => ({
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
    [repair, snapshot.data],
  );

  if (!repair || !user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/repairs")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar reparaties
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Reparatie niet gevonden</h2>
        </div>
      </div>
    );
  }

  const nextStatuses = getRepairNextStatuses(snapshot.role, repair.status);
  const organization = snapshot.data.organizations[repair.organizationId];
  const product = snapshot.data.products[repair.productId];
  const messages = selectSubjectMessages(snapshot.data, snapshot.role, "repair", repair.id);
  const documents = repair.documentIds
    .map((documentId) => snapshot.data.documents[documentId])
    .filter(Boolean);
  const syncStates = getCaseSyncStates(snapshot.data, "repair", repair.id);

  const handleTransition = (nextStatus: RepairStatus) => {
    if (snapshot.role === "service_partner") {
      portalStore.servicePartner.repairUpdate({
        repairId: repair.id,
        actorUserId: user.id,
        nextStatus,
        summary: `Servicepartner zette reparatie op ${nextStatus}.`,
      });
      return;
    }
    portalStore.transitionRepair(repair.id, {
      actorUserId: user.id,
      nextStatus,
      summary: `Reparatie bijgewerkt naar ${nextStatus}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/repairs")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar reparaties
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleTransition(status)}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Zet naar {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Reparatie {repair.id}</h2>
                <p className="text-sm text-gray-500">Aangemeld op {formatDate(repair.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(repair.status)}`}>
                {repair.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Organisatie</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{organization?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Product</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{product?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Serienummer</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{repair.serialNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Issue type</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{repair.issueType}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Notities</p>
              <p className="mt-2 text-sm text-gray-700">{repair.notes}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Workflowhistorie</h3>
            <Timeline events={events} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Communicatie</h3>
              <div className="space-y-3">
                {messages.map((item) => (
                  <div key={item.id} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">
                        {item.authorUserId ? snapshot.data.users[item.authorUserId]?.fullName : "Systeem"}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{item.body}</p>
                  </div>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                placeholder="Plaats een update in de tijdlijn"
              />
              <button
                onClick={() => {
                  if (!message.trim()) {
                    return;
                  }
                  portalStore.addMessage({
                    subjectType: "repair",
                    subjectId: repair.id,
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
                className="mt-3 rounded-lg bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Bericht toevoegen
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Documenten</h3>
              <div className="space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center rounded-xl bg-gray-50 p-3">
                    <Paperclip size={16} className="mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{document.fileName}</p>
                      <p className="text-xs text-gray-400">{document.sizeLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
              <input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                placeholder="Bijv. reparatierapport.pdf"
              />
              <button
                onClick={() => {
                  if (!documentName.trim()) {
                    return;
                  }
                  portalStore.addDocument({
                    subjectType: "repair",
                    subjectId: repair.id,
                    uploadedByUserId: user.id,
                    fileName: documentName.trim(),
                    category: "repair_report",
                    mimeType: "application/pdf",
                    sizeLabel: "Metadata only",
                  });
                  setDocumentName("");
                }}
                className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Mock document koppelen
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
              <Wrench size={18} className="mr-2 text-orange-500" />
              Zaaksamenvatting
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Subtype</dt>
                <dd className="font-semibold text-gray-800">
                  {repair.issueType === "accessoireprobleem" ? "Accessoireprobleem" : "Reguliere reparatie"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Foto placeholders</dt>
                <dd className="font-semibold text-gray-800">{repair.photoPlaceholders.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Laatst bijgewerkt</dt>
                <dd className="font-semibold text-gray-800">{formatDateTime(repair.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
              <CheckCircle2 size={18} className="mr-2 text-green-500" />
              CRM sync
            </h3>
            <div className="space-y-3">
              {syncStates.map((state) => (
                <div key={state.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClasses(state.status)}`}>
                      {state.status}
                    </span>
                    <span className="text-xs text-gray-400">{state.retryCount} retries</span>
                  </div>
                  <p className="mt-2 text-gray-600">{state.bufferedChanges.join(", ")}</p>
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

export default RepairDetail;
