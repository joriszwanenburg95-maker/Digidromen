import React from "react";
import { CheckCircle2, Clock, Link2, ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { crmPreparationConfig } from "../lib/crm-preparation";
import { formatDateTime, statusClasses } from "../lib/format";
import { getSupabaseClient } from "../lib/supabase";

const CrmSync: React.FC = () => {
  const { data: syncItems = [] } = useQuery({
    queryKey: ["crm-sync-jobs"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("crm_sync_jobs")
        .select("id, subject_type, subject_id, status, failure_reason, updated_at, buffered_changes")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        subjectType: row.subject_type,
        status: row.status,
        updatedAt: row.updated_at,
        failureReason: row.failure_reason,
        bufferedChanges: row.buffered_changes ?? [],
      }));
    },
  });

  const { data: reservedReferenceCount = 0 } = useQuery({
    queryKey: ["crm-reference-count"],
    queryFn: async () => {
      const { count, error } = await getSupabaseClient()
        .from("crm_sync_jobs")
        .select("id", { count: "exact", head: true })
        .not("status", "eq", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const totalPreparedMutations = syncItems.reduce(
    (sum, item) => sum + (item.bufferedChanges?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-1 text-amber-700" size={20} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              {crmPreparationConfig.statusLabel}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{crmPreparationConfig.pageTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{crmPreparationConfig.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mr-4 rounded-lg bg-sky-100 p-3 text-sky-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Gereserveerde referenties</p>
            <p className="text-2xl font-bold">{reservedReferenceCount}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mr-4 rounded-lg bg-violet-100 p-3 text-violet-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Voorbereide mutaties</p>
            <p className="text-2xl font-bold">{totalPreparedMutations}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mr-4 rounded-lg bg-amber-100 p-3 text-amber-600">
            <Link2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Voorbereide queue-items</p>
            <p className="text-2xl font-bold">{syncItems.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h3 className="font-bold text-gray-800">Voorbereide CRM-mutaties</h3>
            <p className="mt-1 text-sm text-gray-500">
              Dit is een voorbereidingsweergave. Actieve synchronisatie staat expliciet uit.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {syncItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center">
                  <div
                    className={`mr-4 h-2 w-2 rounded-full ${
                      item.status === "synced"
                        ? "bg-green-500"
                        : item.status === "queued"
                          ? "bg-blue-500"
                          : item.status === "retrying"
                            ? "bg-violet-500"
                            : "bg-amber-500"
                    }`}
                  ></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {item.subjectId} - {item.subjectType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(item.updatedAt)} •{" "}
                      {item.bufferedChanges.join(", ") || "Geen open mutaties"}
                    </p>
                    {item.failureReason ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Later uit te zoeken: {item.failureReason}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClasses(item.status)}`}
                >
                  mock {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Bewust uit scope</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {crmPreparationConfig.deferredCapabilities.map((item) => (
                <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Voor later voorbereid</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {crmPreparationConfig.futureCapabilities.map((item) => (
                <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmSync;
