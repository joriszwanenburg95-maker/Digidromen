import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Send, Wrench } from "lucide-react";

import { formatDateTime, portalStore, statusClasses, usePortalContext } from "../lib/portal";

const Repairs: React.FC = () => {
  const navigate = useNavigate();
  const { snapshot, viewer, user, repairs } = usePortalContext();
  const [showNewRepair, setShowNewRepair] = useState(false);
  const [repairComplete, setRepairComplete] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState("SN-DD-120045");
  const [productId, setProductId] = useState("");
  const [issueType, setIssueType] =
    useState<"hardware" | "software" | "battery" | "screen" | "accessoireprobleem" | "other">("hardware");
  const [notes, setNotes] = useState("");

  const products = useMemo(
    () =>
      (Object.values(snapshot.data.products) as Array<{ id: string; name: string; category: string }>).filter(
        (product) => product.category === "laptop",
      ),
    [snapshot.data.products],
  );

  const selectedProductId = productId || products[0]?.id;

  const submitRepair = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedProductId || !notes.trim()) {
      return;
    }

    const created = await portalStore.createRepair({
      organizationId: viewer.organizationId,
      requesterUserId: user.id,
      servicePartnerOrganizationId: "org-aces-direct",
      productId: selectedProductId,
      serialNumber,
      issueType,
      notes: notes.trim(),
      photoPlaceholders: ["front.jpg", "label.jpg"],
    });
    setRepairComplete(created.id);
    setNotes("");
    setShowNewRepair(false);
  };

  if (repairComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={64} className="text-orange-500" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Reparatie aangemeld</h2>
        <p className="mt-2 text-slate-500">Case {repairComplete} staat nu in de workflow.</p>
        <button
          onClick={() => navigate(`/repairs/${repairComplete}`)}
          className="mt-6 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Open detailpagina
        </button>
      </div>
    );
  }

  if (showNewRepair) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNewRepair(false)}
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={18} className="mr-2" />
            Terug
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Reparatie aanmelden</h2>
        </div>

        <form onSubmit={submitRepair} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
              placeholder="Serienummer / asset ID"
            />
            <select
              value={selectedProductId}
              onChange={(event) => setProductId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <select
              value={issueType}
              onChange={(event) =>
                setIssueType(
                  event.target.value as
                    | "hardware"
                    | "software"
                    | "battery"
                    | "screen"
                    | "accessoireprobleem"
                    | "other",
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
            >
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="battery">Battery</option>
              <option value="screen">Screen</option>
              <option value="accessoireprobleem">Accessoireprobleem</option>
              <option value="other">Overig</option>
            </select>
          </div>

          <textarea
            required
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
            placeholder="Beschrijf het defect en de impact voor de gebruiker"
          />

          <button
            type="submit"
            className="flex items-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <Send size={16} className="mr-2" />
            Melding versturen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reparaties</h2>
          <p className="text-sm text-slate-500">{repairs.length} repair cases zichtbaar</p>
        </div>
        {snapshot.role !== "service_partner" ? (
          <button
            onClick={() => setShowNewRepair(true)}
            className="flex items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Wrench size={16} className="mr-2" />
            Meld reparatie
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issue</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Laatste update</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {repairs.map((repair) => (
              <tr key={repair.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-semibold text-orange-600">{repair.id}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {snapshot.data.products[repair.productId]?.name}
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(repair.status)}`}>
                    {repair.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{repair.issueType}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(repair.updatedAt)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => navigate(`/repairs/${repair.id}`)}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                  >
                    Bekijken
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

export default Repairs;
