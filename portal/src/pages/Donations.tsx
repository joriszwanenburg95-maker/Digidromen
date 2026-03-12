import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, HeartHandshake } from "lucide-react";

import { formatDate, portalStore, statusClasses, usePortalContext } from "../lib/portal";

const Donations: React.FC = () => {
  const navigate = useNavigate();
  const { snapshot, user, donations } = usePortalContext();
  const [showNewDonation, setShowNewDonation] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [donorOrganizationId, setDonorOrganizationId] = useState("");
  const [deviceCount, setDeviceCount] = useState(25);
  const [estimatedPickupDate, setEstimatedPickupDate] = useState("2026-03-18");
  const [contactName, setContactName] = useState("Operations Desk");
  const [street, setStreet] = useState("Science Park 10");
  const [postalCode, setPostalCode] = useState("3584 CM");
  const [city, setCity] = useState("Utrecht");
  const [contactEmail, setContactEmail] = useState("impact@techforgood.nl");
  const [notes, setNotes] = useState("");

  const donors = useMemo(
    () =>
      Object.values(snapshot.data.organizations).filter(
        (organization) => organization.kind === "sponsor",
      ),
    [snapshot.data.organizations],
  );

  const selectedDonor = donorOrganizationId || donors[0]?.id;

  const submitDonation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedDonor || !notes.trim()) {
      return;
    }
    const created = portalStore.createDonation({
      donorOrganizationId: selectedDonor,
      intakeByUserId: user.id,
      servicePartnerOrganizationId: "org-aces-direct",
      deviceCount,
      estimatedPickupDate,
      pickupAddress: {
        contactName,
        street,
        postalCode,
        city,
        country: "NL",
      },
      contactEmail,
      notes: notes.trim(),
    });
    setCreatedId(created.id);
    setShowNewDonation(false);
    setNotes("");
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

  if (showNewDonation) {
    return (
      <div className="space-y-6 max-w-3xl">
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

        <form onSubmit={submitDonation} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={selectedDonor}
              onChange={(event) => setDonorOrganizationId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            >
              {donors.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={deviceCount}
              onChange={(event) => setDeviceCount(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            />
            <input
              type="date"
              value={estimatedPickupDate}
              onChange={(event) => setEstimatedPickupDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
            />
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Contact email"
            />
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Contactpersoon"
            />
            <input
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Straat"
            />
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Postcode"
            />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-green-500 focus:ring-2"
              placeholder="Plaats"
            />
          </div>

          <textarea
            required
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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
          <p className="text-sm text-slate-500">{donations.length} batches zichtbaar</p>
        </div>
        {snapshot.role !== "service_partner" && snapshot.role !== "help_org" ? (
          <button
            onClick={() => setShowNewDonation(true)}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Registreer donatie
          </button>
        ) : null}
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
            {donations.map((donation) => (
              <tr key={donation.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-semibold text-green-700">{donation.id}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {snapshot.data.organizations[donation.donorOrganizationId]?.name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{donation.deviceCount}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(donation.status)}`}>
                    {donation.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{formatDate(donation.estimatedPickupDate)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => navigate(`/donations/${donation.id}`)}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Donations;
