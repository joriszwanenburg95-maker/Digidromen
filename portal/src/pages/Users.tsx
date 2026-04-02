import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

const ROLE_LABELS: Record<string, string> = {
  digidromen_admin: "Digidromen Admin",
  digidromen_staff: "Digidromen Medewerker",
  service_partner: "Service Partner",
  help_org: "Hulporganisatie",
};

const Users: React.FC = () => {
  const { authMode, user } = useAuth();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "help_org" as string, organizationId: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("user_profiles")
        .select("id, name, email, role, organization_id, organizations(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase",
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations", "active"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: showInvite,
  });

  const handleInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const { data, error } = await getSupabaseClient().functions.invoke("admin-users", {
        body: {
          action: "invite",
          name: inviteForm.name,
          email: inviteForm.email,
          role: inviteForm.role,
          organizationId: inviteForm.organizationId || user?.organizationId,
        },
      });
      if (error) throw error;
      setInviteSuccess(true);
      setShowInvite(false);
      setInviteForm({ name: "", email: "", role: "help_org", organizationId: "" });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setTimeout(() => setInviteSuccess(false), 4000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Uitnodiging mislukt");
    } finally {
      setInviteLoading(false);
    }
  };

  const needsOrg = inviteForm.role === "help_org" || inviteForm.role === "service_partner";

  const handleDeleteUser = async (profileId: string, name: string) => {
    if (!confirm(`Gebruiker "${name}" verwijderen? Gebruikers met gekoppelde orders of reparaties worden gedeactiveerd in plaats van volledig verwijderd.`)) {
      return;
    }

    setDeleteLoadingId(profileId);
    setDeleteNotice(null);

    try {
      const { data, error } = await getSupabaseClient().functions.invoke("admin-users", {
        body: {
          action: "deactivate",
          profileId,
        },
      });

      if (error) throw error;

      const mode = (data as { mode?: string } | null)?.mode;
      setDeleteNotice(
        mode === "deleted"
          ? "Gebruiker verwijderd."
          : "Gebruiker gedeactiveerd omdat er nog gekoppelde dossiers bestaan.",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Gebruiker kon niet worden verwijderd.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Gebruikers</h2>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteError(null); setInviteSuccess(false); }}
          className="inline-flex items-center gap-2 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors"
        >
          {showInvite ? <X size={16} /> : <UserPlus size={16} />}
          {showInvite ? "Annuleren" : "Uitnodigen"}
        </button>
      </div>

      {inviteSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Uitnodiging verstuurd! De gebruiker ontvangt een magic link per e-mail.
        </div>
      )}

      {deleteNotice && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {deleteNotice}
        </div>
      )}

      {showInvite && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Nieuwe gebruiker uitnodigen</h3>
          {inviteError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{inviteError}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="Volledige naam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                placeholder="naam@organisatie.nl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {needsOrg && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organisatie</label>
                <select
                  value={inviteForm.organizationId}
                  onChange={(e) => setInviteForm({ ...inviteForm, organizationId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-digidromen-primary focus:outline-none focus:ring-1 focus:ring-digidromen-primary"
                >
                  <option value="">Selecteer organisatie...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteForm.name || !inviteForm.email}
              className="inline-flex items-center gap-2 rounded-xl bg-digidromen-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteLoading ? "Versturen..." : "Uitnodiging versturen"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organisatie</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Laden..." : "Geen gebruikers gevonden."}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {ROLE_LABELS[u.role ?? ""] ?? u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{(u.organizations as any)?.name ?? "-"}</td>
                  <td className="px-6 py-4 text-right">
                    {u.id !== user?.id ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(u.id, u.name ?? u.email ?? "gebruiker")}
                        disabled={deleteLoadingId === u.id}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {deleteLoadingId === u.id ? "Bezig..." : "Verwijderen"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Huidige gebruiker</span>
                    )}
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

export default Users;
