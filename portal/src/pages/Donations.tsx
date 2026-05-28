import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle, Plus } from "lucide-react";

import { LoadingButton } from "../components/LoadingButton";
import { SkeletonTableRow } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import {
  listDonations,
  listDonorOrganizations,
  type DonationListRow,
} from "../lib/data/donations";
import { translateError } from "../lib/errors";
import { getSupabaseClient } from "../lib/supabase";
import { DEFAULT_SERVICE_PARTNER_ORG_ID } from "../lib/defaultServicePartner";
import { queryKeys } from "../lib/queryKeys";
import type { Role } from "../lib/workflow";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/ui/button";

const statusTabs = [
  { key: "all", label: "Alle" },
  { key: "aangemeld", label: "Aangemeld" },
  { key: "pickup_gepland", label: "Ophaal gepland" },
  { key: "ontvangen", label: "Ontvangen" },
  { key: "in_verwerking", label: "In verwerking" },
  { key: "verwerkt", label: "Verwerkt" },
  { key: "geannuleerd", label: "Geannuleerd" },
];

const DONATION_DRAFT_KEY = "donation_new_draft_v1";

interface DonationDraft {
  donorOrgId: string;
  deviceCount: number;
  pickupDate: string;
  contactName: string;
  contactEmail: string;
  street: string;
  postalCode: string;
  city: string;
  notes: string;
}

const Donations: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewDonation, setShowNewDonation] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [deviceCount, setDeviceCount] = useState(1);
  const [pickupDate, setPickupDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [donorOrgId, setDonorOrgId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Inline nieuwe donateur
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [newDonorName, setNewDonorName] = useState("");
  const [newDonorCity, setNewDonorCity] = useState("");
  const [newDonorContactName, setNewDonorContactName] = useState("");
  const [newDonorContactEmail, setNewDonorContactEmail] = useState("");
  const [newDonorSaving, setNewDonorSaving] = useState(false);
  const [newDonorError, setNewDonorError] = useState<string | null>(null);

  const draftRestoredRef = useRef(false);

  const role: Role = (user?.role as Role) ?? "help_org";

  const { data: displayDonations = [], isLoading } = useQuery({
    queryKey: queryKeys.donations.list(),
    queryFn: () => listDonations({ role, organizationId: user?.organizationId }),
    enabled: !!user,
  });

  const { data: donorOrgs = [] } = useQuery({
    queryKey: queryKeys.organizations.list({ type: "sponsor" }),
    queryFn: listDonorOrganizations,
    enabled: showNewDonation,
  });

  // Restore draft op mount
  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(DONATION_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<DonationDraft>;
      if (draft.donorOrgId) setDonorOrgId(draft.donorOrgId);
      if (typeof draft.deviceCount === "number") setDeviceCount(draft.deviceCount);
      if (draft.pickupDate) setPickupDate(draft.pickupDate);
      if (draft.contactName) setContactName(draft.contactName);
      if (draft.contactEmail) setContactEmail(draft.contactEmail);
      if (draft.street) setStreet(draft.street);
      if (draft.postalCode) setPostalCode(draft.postalCode);
      if (draft.city) setCity(draft.city);
      if (draft.notes) setNotes(draft.notes);
      const hasContent =
        draft.donorOrgId ||
        draft.contactName ||
        draft.street ||
        draft.city ||
        draft.notes ||
        draft.pickupDate;
      if (hasContent) setShowNewDonation(true);
    } catch {
      // ignore parse errors
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!draftRestoredRef.current) return;
    const hasContent =
      donorOrgId ||
      contactName.trim() ||
      contactEmail.trim() ||
      street.trim() ||
      postalCode.trim() ||
      city.trim() ||
      notes.trim() ||
      pickupDate ||
      deviceCount > 1;
    if (!hasContent && !showNewDonation) {
      sessionStorage.removeItem(DONATION_DRAFT_KEY);
      return;
    }
    const draft: DonationDraft = {
      donorOrgId,
      deviceCount,
      pickupDate,
      contactName,
      contactEmail,
      street,
      postalCode,
      city,
      notes,
    };
    sessionStorage.setItem(DONATION_DRAFT_KEY, JSON.stringify(draft));
  }, [
    donorOrgId,
    deviceCount,
    pickupDate,
    contactName,
    contactEmail,
    street,
    postalCode,
    city,
    notes,
    showNewDonation,
  ]);

  const resetDonationForm = () => {
    setDonorOrgId("");
    setDeviceCount(1);
    setPickupDate("");
    setContactName("");
    setContactEmail("");
    setStreet("");
    setPostalCode("");
    setCity("");
    setNotes("");
    sessionStorage.removeItem(DONATION_DRAFT_KEY);
  };

  const submitNewDonor = async () => {
    setNewDonorError(null);
    if (!newDonorName.trim() || !newDonorCity.trim() || !newDonorContactName.trim() || !newDonorContactEmail.trim()) {
      setNewDonorError("Naam, stad, contactpersoon en contact-e-mail zijn verplicht.");
      return;
    }
    setNewDonorSaving(true);
    const id = `org-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await getSupabaseClient().from("organizations").insert({
      id,
      name: newDonorName.trim(),
      type: "sponsor",
      city: newDonorCity.trim(),
      contact_name: newDonorContactName.trim(),
      contact_email: newDonorContactEmail.trim(),
      active: true,
    });
    setNewDonorSaving(false);
    if (error) {
      setNewDonorError(translateError(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list({ type: "sponsor" }) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    setDonorOrgId(id);
    setShowAddDonor(false);
    setNewDonorName("");
    setNewDonorCity("");
    setNewDonorContactName("");
    setNewDonorContactEmail("");
  };

  const filteredDonations = statusFilter === "all"
    ? displayDonations
    : displayDonations.filter((d: DonationListRow) => d.status === statusFilter);

  const submitDonation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSubmitError(null);
    const selectedDonor = donorOrgId || donorOrgs[0]?.id;
    if (!selectedDonor) {
      setSubmitError("Selecteer een donerende organisatie.");
      return;
    }
    const id = crypto.randomUUID();
    const pickupAddress = [contactName, street, postalCode, city].filter(Boolean).join(", ");
    const { error } = await getSupabaseClient()
      .from("donation_batches")
      .insert({
        id,
        sponsor_organization_id: selectedDonor,
        device_count_promised: deviceCount,
        pickup_date: pickupDate || null,
        pickup_address: pickupAddress || "Onbekend",
        pickup_contact_name: contactName,
        pickup_contact_email: contactEmail,
        notes: notes.trim() || null,
        status: "aangemeld",
        registered_at: new Date().toISOString(),
        assigned_service_partner_id: DEFAULT_SERVICE_PARTNER_ORG_ID,
      });
    if (error) {
      setSubmitError(translateError(error));
      return;
    }
    const { error: eventError } = await getSupabaseClient().from("workflow_events").insert({
      id: crypto.randomUUID(),
      case_id: id,
      case_type: "donation",
      status: "aangemeld",
      title: "Donatie aangemeld",
      description: `${user.name} heeft een nieuwe donatiebatch geregistreerd.`,
      actor_name: user.name,
      actor_role: user.role,
      created_at: new Date().toISOString(),
      metadata: {},
    });
    if (eventError) {
      await getSupabaseClient().from("donation_batches").delete().eq("id", id);
      setSubmitError(translateError(eventError));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.donations.list() });
    void queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
    setCreatedId(id);
    setShowNewDonation(false);
    resetDonationForm();
  };

  if (createdId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={64} className="text-emerald-600" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Donatiebatch geregistreerd</h2>
        <p className="mt-2 text-slate-500">Batch {createdId} staat klaar voor pickup planning.</p>
        <button
          onClick={() => navigate(`/donations/${createdId}`)}
          className="mt-6 rounded-xl bg-digidromen-orange px-4 py-2 text-sm font-semibold text-white"
        >
          Open detailpagina
        </button>
      </div>
    );
  }

  const activeDonors = donorOrgs;

  if (showNewDonation) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNewDonation(false)}
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={18} className="mr-2" />
            Terug
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Nieuwe donatiebatch</h2>
        </div>

        <form onSubmit={(e) => { void submitDonation(e); }} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Donerende organisatie
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={donorOrgId}
                onChange={(e) => setDonorOrgId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              >
                <option value="">Maak een keuze...</option>
                {activeDonors.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddDonor((v) => !v)}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-digidromen-orange hover:bg-digidromen-orange-light"
              >
                <Plus size={14} />
                Nieuwe donateur
              </button>
            </div>
          </div>

          {showAddDonor ? (
            <div className="space-y-3 rounded-2xl border border-digidromen-cream bg-digidromen-orange-light/30 p-4">
              <p className="text-sm font-semibold text-digidromen-dark">Nieuwe donerende organisatie</p>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newDonorName}
                  onChange={(e) => setNewDonorName(e.target.value)}
                  placeholder="Organisatienaam"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                />
                <input
                  value={newDonorCity}
                  onChange={(e) => setNewDonorCity(e.target.value)}
                  placeholder="Stad"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                />
                <input
                  value={newDonorContactName}
                  onChange={(e) => setNewDonorContactName(e.target.value)}
                  placeholder="Contactpersoon"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                />
                <input
                  type="email"
                  value={newDonorContactEmail}
                  onChange={(e) => setNewDonorContactEmail(e.target.value)}
                  placeholder="Contact e-mail"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
                />
              </div>
              {newDonorError ? <p className="text-sm text-red-600">{newDonorError}</p> : null}
              <div className="flex gap-2">
                <LoadingButton
                  type="button"
                  variant="success"
                  isLoading={newDonorSaving}
                  loadingLabel="Aanmaken..."
                  onClick={() => { void submitNewDonor(); }}
                >
                  Donateur aanmaken
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDonor(false);
                    setNewDonorError(null);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min={1}
              value={deviceCount}
              onChange={(e) => setDeviceCount(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Verwacht aantal apparaten"
            />
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Contact email"
            />
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Contactpersoon"
            />
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Straat"
            />
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Postcode"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
              placeholder="Plaats"
            />
          </div>

          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2"
            placeholder="Aantekeningen voor pickup, telling of refurbish"
          />

          {submitError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}
          <LoadingButton
            type="submit"
            variant="success"
            className="px-4 py-3"
          >
            Donatie registreren
          </LoadingButton>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Donaties</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? "Laden..." : `${displayDonations.length} batches`}
          </p>
        </div>
        {role !== "service_partner" && role !== "help_org" ? (
          <button
            onClick={() => setShowNewDonation(true)}
            className="rounded-xl bg-digidromen-orange px-4 py-2 text-sm font-semibold text-white"
          >
            Registreer donatie
          </button>
        ) : null}
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Batch</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Donor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aantal</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pickup</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <SkeletonTableRow key={index} cols={6} />
              ))
            ) : filteredDonations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  Nog geen donaties.
                </td>
              </tr>
            ) : (
              filteredDonations.map((donation) => {
                const orgName = donation.organizations?.name ?? "Onbekende donor";
                const count = donation.device_count_promised;
                const pickup = donation.pickup_date;
                const isServicePickupAction = role === "service_partner" && donation.status === "aangemeld";

                return (
                  <tr key={donation.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-digidromen-orange">{donation.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{orgName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{count}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={donation.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pickup ?? "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        onClick={() => navigate(`/donations/${donation.id}`)}
                        variant={isServicePickupAction ? "default" : "outline"}
                        className={`min-h-10 rounded-[18px] ${
                          isServicePickupAction
                            ? "bg-digidromen-orange text-white hover:bg-digidromen-orange-hover"
                            : "border-digidromen-cream text-digidromen-orange hover:bg-digidromen-orange-light"
                        }`}
                      >
                        {isServicePickupAction ? (
                          <>
                            <CalendarClock size={16} />
                            Pickup plannen
                          </>
                        ) : (
                          <>
                            Details
                            <ArrowRight size={15} />
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Donations;
