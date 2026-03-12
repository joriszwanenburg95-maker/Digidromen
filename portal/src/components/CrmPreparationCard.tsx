import React from "react";

import {
  crmPreparationConfig,
  getCrmPreparationStatus,
  getPreparedMutationCount,
  type CrmPreparationState,
} from "../lib/crm-preparation";
import { formatDateTime } from "../lib/portal";

type ReferenceItem = {
  label: string;
  value: string;
};

interface CrmPreparationCardProps {
  subjectLabel: string;
  references: ReferenceItem[];
  syncStates: CrmPreparationState[];
}

const CrmPreparationCard: React.FC<CrmPreparationCardProps> = ({
  subjectLabel,
  references,
  syncStates,
}) => {
  const preparedMutationCount = getPreparedMutationCount(syncStates);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">CRM voorbereiding</h3>
          <p className="mt-1 text-sm text-slate-500">
            {subjectLabel} bewaart alleen voorbereidende CRM-data. {crmPreparationConfig.summary}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          {crmPreparationConfig.statusLabel}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        {references.map((reference) => (
          <div key={reference.label} className="flex justify-between gap-4">
            <dt className="text-slate-500">{reference.label}</dt>
            <dd className="text-right font-semibold text-slate-800">{reference.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Voorbereide mutaties</dt>
          <dd className="font-semibold text-slate-800">{preparedMutationCount}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Queue-items</dt>
          <dd className="font-semibold text-slate-800">{syncStates.length}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        {syncStates.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Voor deze case zijn nog geen CRM-mutaties voorbereid.
          </div>
        ) : (
          syncStates.map((state) => (
            <div key={state.id} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {getCrmPreparationStatus(state.status)}
                </p>
                <p className="text-xs text-slate-400">{formatDateTime(state.updatedAt)}</p>
              </div>
              <p className="mt-2">
                {state.bufferedChanges.length > 0
                  ? state.bufferedChanges.join(", ")
                  : "Geen open mutaties vastgelegd."}
              </p>
              <p className="mt-1 text-xs text-slate-400">{state.retryCount} retries in mock-model</p>
              {state.failureReason ? (
                <p className="mt-2 text-xs text-amber-700">
                  Aandachtspunt voor later: {state.failureReason}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CrmPreparationCard;
