import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

const TYPE_LABELS: Record<string, string> = {
  help_org: "Hulporganisatie",
  service_partner: "Service Partner",
  sponsor: "Sponsor",
};

const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const { authMode } = useAuth();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "help_org",
    city: "",
    contact_name: "",
    contact_email: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("id, name, type, city, contact_email, contact_name, active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase",
  });

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const { error } = await getSupabaseClient()
        .from("organizations")
        .insert({
          id: `org-${crypto.randomUUID().slice(0, 8)}`,
          name: createForm.name,
          type: createForm.type as "help_org" | "service_partner" | "digidromen" | "sponsor",
          city: createForm.city || "",
          contact_name: createForm.contact_name || "",
          contact_email: createForm.contact_email || "",
          active: true,
        });
      if (error) throw error;
      setShowCreate(false);
      setCreateForm({ name: "", type: "help_org", city: "", contact_name: "", contact_email: "" });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Aanmaken mislukt");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Organisaties</h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors"
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? "Annuleren" : "Nieuwe organisatie"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Organisatie toevoegen</h3>
          {createError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{createError}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="Organisatienaam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stad</label>
              <input
                type="text"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="Stad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contactpersoon</label>
              <input
                type="text"
                value={createForm.contact_name}
                onChange={(e) => setCreateForm({ ...createForm, contact_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="Naam contactpersoon"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail contactpersoon</label>
              <input
                type="email"
                value={createForm.contact_email}
                onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="contact@organisatie.nl"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={createLoading || !createForm.name}
              className="inline-flex items-center gap-2 rounded-xl bg-digidromen-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? "Opslaan..." : "Organisatie aanmaken"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Laden..." : "Geen organisaties gevonden."}
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{org.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {TYPE_LABELS[org.type ?? ""] ?? org.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{org.city ?? "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{org.contact_name ?? "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => navigate(`/organizations/${org.id}`)} className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-primary hover:bg-sky-50">Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Organizations;
