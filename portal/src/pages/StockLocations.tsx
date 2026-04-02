import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

const StockLocations: React.FC = () => {
  const { authMode } = useAuth();
  const { data: locations = [], isLoading } = useQuery({
    queryKey: queryKeys.stockLocations.all,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("stock_locations")
        .select("id, name, city, address, is_active, organization_id, organizations(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Voorraadlocaties</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organisatie</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Laden..." : "Geen locaties gevonden."}
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{loc.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{loc.city ?? "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{(loc.organizations as any)?.name ?? "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${loc.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                      {loc.is_active ? "Actief" : "Inactief"}
                    </span>
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

export default StockLocations;
