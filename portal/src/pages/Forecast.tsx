import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

const Forecast: React.FC = () => {
  const { authMode } = useAuth();
  const { data: snapshot, isLoading } = useQuery({
    queryKey: queryKeys.forecast.latest(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("forecast_snapshots")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Prognose</h2>
      {isLoading && <p className="text-sm text-slate-400">Laden...</p>}
      {!isLoading && !snapshot && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
          Nog geen prognose-data beschikbaar. Prognoses worden automatisch aangemaakt op basis van historische orders.
        </div>
      )}
      {snapshot && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs text-slate-400">Gegenereerd op {new Date(snapshot.generated_at).toLocaleString("nl-NL")}</p>
          <p className="mt-2 text-sm text-slate-600">Horizon: {snapshot.horizon_months} maanden</p>
          <pre className="mt-4 overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
            {JSON.stringify(snapshot.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Forecast;
