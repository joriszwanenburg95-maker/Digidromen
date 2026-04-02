import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";

const AuditLog: React.FC = () => {
  const { authMode } = useAuth();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log", "recent"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("audit_log")
        .select("id, action, table_name, record_id, user_email, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tijdstip</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actie</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tabel</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Record</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gebruiker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Laden..." : "Geen audit log entries."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString("nl-NL")}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{entry.action}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.table_name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{entry.record_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.user_email ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
