import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HeartHandshake, Paperclip } from "lucide-react";

import CrmPreparationCard from "../components/CrmPreparationCard";
import Timeline from "../components/Timeline";
import {
  formatDate,
  formatDateTime,
  getCaseSyncStates,
  getDonationNextStatuses,
  getWorkflowEvents,
  portalStore,
  selectSubjectMessages,
  statusClasses,
  usePortalContext,
} from "../lib/portal";
import { formatCrmReference, type CrmPreparationState } from "../lib/crm-preparation";
import type { DonationStatus, TimelineEvent } from "../types";

const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { snapshot, user } = usePortalContext();
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");

  const donation = id ? snapshot.data.donations[id] : undefined;

  const events = useMemo<TimelineEvent[]>(
    () =>
      donation
        ? getWorkflowEvents(snapshot.data, donation.timelineEventIds).map((event) => ({
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
    [donation, snapshot.data],
  );

  if (!donation || !user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/donations")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar donaties
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Donatiebatch niet gevonden</h2>
        </div>
      </div>
    );
  }

  const donor = snapshot.data.organizations[donation.donorOrganizationId];
  const nextStatuses = getDonationNextStatuses(snapshot.role, donation.status);
  const syncStates = getCaseSyncStates(snapshot.data, "donation", donation.id) as CrmPreparationState[];
  const documents = donation.documentIds
    .map((documentId: string) => snapshot.data.documents[documentId])
    .filter(Boolean) as Array<{ id: string; fileName: string; sizeLabel: string }>;
  const messages = selectSubjectMessages(snapshot.data, snapshot.role, "donation", donation.id);

  const handleTransition = async (nextStatus: DonationStatus) => {
    if (snapshot.role === "service_partner") {
      await portalStore.servicePartner.refurbishUpdate({
        donationId: donation.id,
        actorUserId: user.id,
        nextStatus,
        summary: `Servicepartner zette donatie op ${nextStatus}.`,
        refurbishableCount: donation.refurbishableCount || donation.deviceCount - donation.rejectedCount,
        rejectedCount: donation.rejectedCount,
        stockImpactQuantity:
          nextStatus === "OP_VOORRAAD"
            ? donation.stockImpactQuantity || donation.refurbishableCount
            : donation.stockImpactQuantity,
      });
      return;
    }
    await portalStore.transitionDonation(donation.id, {
      actorUserId: user.id,
      nextStatus,
      summary: `Donatiestatus bijgewerkt naar ${nextStatus}.`,
      refurbishableCount: donation.refurbishableCount,
      rejectedCount: donation.rejectedCount,
      stockImpactQuantity: donation.stockImpactQuantity,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/donations")}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} className="mr-2" />
          Terug naar donaties
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                void handleTransition(status);
              }}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
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
                <h2 className="text-2xl font-bold text-gray-900">Donatie {donation.id}</h2>
                <p className="text-sm text-gray-500">Geregistreerd op {formatDate(donation.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(donation.status)}`}>
                {donation.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Donor</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{donor?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Toegezegde devices</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{donation.deviceCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Refurbish gereed</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{donation.refurbishableCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Voorraadeffect</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{donation.stockImpactQuantity}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Pickup details</p>
              <p className="mt-2 text-sm text-gray-700">
                {donation.pickupAddress.contactName}, {donation.pickupAddress.street},{" "}
                {donation.pickupAddress.postalCode} {donation.pickupAddress.city}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Geplande pickup: {formatDate(donation.estimatedPickupDate)}
              </p>
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
                onClick={async () => {
                  if (!message.trim()) {
                    return;
                  }
                  await portalStore.addMessage({
                    subjectType: "donation",
                    subjectId: donation.id,
                    authorUserId: user.id,
                    authorOrganizationId: user.organizationId,
                    body: message.trim(),
                    visibleToRoles: ["digidromen_staff", "digidromen_admin", "service_partner"],
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
                placeholder="Bijv. donation-manifest.pdf"
              />
              <button
                onClick={async () => {
                  if (!documentName.trim()) {
                    return;
                  }
                  await portalStore.addDocument({
                    subjectType: "donation",
                    subjectId: donation.id,
                    uploadedByUserId: user.id,
                    fileName: documentName.trim(),
                    category: "donation_manifest",
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
              <HeartHandshake size={18} className="mr-2 text-green-600" />
              Batchsamenvatting
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Contact</dt>
                <dd className="font-semibold text-gray-800">{donation.contactEmail}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Rejected count</dt>
                <dd className="font-semibold text-gray-800">{donation.rejectedCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Laatste update</dt>
                <dd className="font-semibold text-gray-800">{formatDateTime(donation.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <CrmPreparationCard
            subjectLabel="Deze donatiebatch"
            references={[
              { label: "CRM relatie", value: formatCrmReference(donation.crmRelationId) },
              { label: "CRM case", value: formatCrmReference(donation.crmCaseId) },
              { label: "CRM taak", value: formatCrmReference(donation.crmTaskId) },
            ]}
            syncStates={syncStates}
          />
        </aside>
      </div>
    </div>
  );
};

export default DonationDetail;
