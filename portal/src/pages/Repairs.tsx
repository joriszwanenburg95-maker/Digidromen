import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Send, Wrench } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../lib/format";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";

type IssueType = "hardware" | "software" | "battery" | "screen" | "accessoireprobleem" | "other";

const statusTabs = [
  { key: "all", label: "Alle" },
  { key: "ONTVANGEN", label: "Ontvangen" },
  { key: "DIAGNOSE", label: "Diagnose" },
  { key: "IN_REPARATIE", label: "In reparatie" },
  { key: "TEST", label: "Test" },
  { key: "RETOUR", label: "Retour" },
  { key: "IRREPARABEL", label: "Irreparabel" },
  { key: "AFGESLOTEN", label: "Afgesloten" },
];

const Repairs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNewRepair, setShowNewRepair] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [repairComplete, setRepairComplete] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("hardware");
  const [notes, setNotes] = useState("");

  const { data: supabaseRepairs = [], isLoading } = useQuery({
    queryKey: queryKeys.repairs.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("repair_cases")
        .select("id, status, issue_type, serial_number, updated_at, organization_id, organizations(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const displayRepairs = supabaseRepairs;
  const filteredRepairs = statusFilter === "all"
    ? displayRepairs
    : displayRepairs.filter((r) => r.status === statusFilter);
  const role = user?.role ?? "help_org";

  const submitRepair = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !notes.trim()) return;

    const id = crypto.randomUUID();
    const { error } = await getSupabaseClient()
      .from("repair_cases")
      .insert({
        id,
        organization_id: user.organizationId,
        requester_user_id: user.id,
        serial_number: serialNumber,
        issue_type: issueType,
        notes: notes.trim(),
        status: "ONTVANGEN",
        subtype: "GENERAL_REPAIR",
        received_at: new Date().toISOString(),
      });
    if (!error) {
      setRepairComplete(id);
      setNotes("");
      setShowNewRepair(false);
    }
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
      <div className="max-w-3xl space-y-6">
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

        <form onSubmit={(e) => { void submitRepair(e); }} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
              placeholder="Serienummer / asset ID"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              Laptop
            </div>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
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
            onChange={(e) => setNotes(e.target.value)}
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
          <p className="text-sm text-slate-500">
            {isLoading ? "Laden..." : `${displayRepairs.length} repair cases`}
          </p>
        </div>
        {role !== "service_partner" ? (
          <button
            onClick={() => setShowNewRepair(true)}
            className="flex items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Wrench size={16} className="mr-2" />
            Meld reparatie
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
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organisatie</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issue</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Laatste update</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRepairs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Reparaties laden..." : "Nog geen reparaties."}
                </td>
              </tr>
            ) : (
              filteredRepairs.map((repair) => {
                const orgName = (repair as any).organizations?.name ?? "Onbekend";
                const issueLabel = (repair as any).issue_type;
                const updatedAt = (repair as any).updated_at;

                return (
                  <tr key={repair.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-orange-600">{repair.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{orgName}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={repair.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{issueLabel}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/repairs/${repair.id}`)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                      >
                        Bekijken
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

export default Repairs;
