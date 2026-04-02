import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { formatDate } from "../lib/format";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";

const statusTabs = [
  { key: "all", label: "Alle" },
  { key: "aangemeld", label: "Aangemeld" },
  { key: "pickup_gepland", label: "Ophaal gepland" },
  { key: "ontvangen", label: "Ontvangen" },
  { key: "in_verwerking", label: "In verwerking" },
  { key: "verwerkt", label: "Verwerkt" },
  { key: "geannuleerd", label: "Geannuleerd" },
];

const Donations: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const { data: supabaseDonations = [], isLoading } = useQuery({
    queryKey: queryKeys.donations.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("id, status, sponsor_organization_id, device_count_promised, pickup_date, created_at, organizations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: donorOrgs = [] } = useQuery({
    queryKey: queryKeys.organizations.list({ type: "sponsor" }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("id, name")
        .eq("type", "sponsor")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: showNewDonation,
  });
  const displayDonations = supabaseDonations;
  const filteredDonations = statusFilter === "all"
    ? displayDonations
    : displayDonations.filter((d) => d.status === statusFilter);
  const role = user?.role ?? "help_org";

  const submitDonation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const selectedDonor = donorOrgId || donorOrgs[0]?.id;
    if (!selectedDonor) return;
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
      });
    if (!error) {
      setCreatedId(id);
      setShowNewDonation(false);
      setNotes("");
    }
  };

  if (createdId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Donatiebatch geregistreerd</h2>
        <p className="mt-2 text-slate-500">Batch {createdId} staat klaar voor pickup planning.</p>
        <button
          onClick={() => navigate(`/donations/${createdId}`)}
          className="mt-6 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
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
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={donorOrgId || activeDonors[0]?.id || ""}
              onChange={(e) => setDonorOrgId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            >
              {activeDonors.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
              {activeDonors.length === 0 && <option value="">Geen donoren gevonden</option>}
            </select>
            <input
              type="number"
              min={1}
              value={deviceCount}
              onChange={(e) => setDeviceCount(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Verwacht aantal apparaten"
            />
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Contact email"
            />
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Contactpersoon"
            />
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Straat"
            />
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Postcode"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Plaats"
            />
          </div>

          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            placeholder="Aantekeningen voor pickup, telling of refurbish"
          />

          <button
            type="submit"
            className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Donatie registreren
          </button>
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
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
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
            {filteredDonations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Donaties laden..." : "Nog geen donaties."}
                </td>
              </tr>
            ) : (
              filteredDonations.map((donation) => {
                const orgName = (donation as any).organizations?.name ?? "Onbekende donor";
                const count = (donation as any).device_count_promised;
                const pickup = (donation as any).pickup_date;

                return (
                  <tr key={donation.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-green-700">{donation.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{orgName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{count}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={donation.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{pickup ?? "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/donations/${donation.id}`)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50"
                      >
                        Details
                      </button>
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
