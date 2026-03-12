import React from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

import { formatDateTime, portalStore, statusClasses, usePortalContext } from "../lib/portal";

const CrmSync: React.FC = () => {
  const { snapshot } = usePortalContext();
  const syncItems = Object.values(snapshot.data.crmSyncStates).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">CRM Synchronisatie</h2>
        <button
          onClick={() => portalStore.crm.flushQueue()}
          className="flex items-center px-4 py-2 bg-digidromen-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={18} className="mr-2" />
          Forceer Sync
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Geslaagd</p>
            <p className="text-2xl font-bold">{snapshot.metrics.syncHealth.synced}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">In Wachtrij</p>
            <p className="text-2xl font-bold">{snapshot.metrics.syncHealth.queued}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg mr-4">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Mislukt</p>
            <p className="text-2xl font-bold">{snapshot.metrics.syncHealth.failed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Sync Logboek</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {syncItems.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-4 ${
                  item.status === 'synced' ? 'bg-green-500' :
                  item.status === 'queued' ? 'bg-blue-500' :
                  item.status === 'retrying' ? 'bg-violet-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {item.subjectId} - {item.subjectType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(item.updatedAt)} • {item.bufferedChanges.join(", ")}
                    {item.failureReason ? ` • Fout: ${item.failureReason}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {item.status === 'failed' && (
                  <button
                    onClick={() => portalStore.crm.retrySync(item.subjectType, item.subjectId)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Opnieuw
                  </button>
                )}
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusClasses(item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CrmSync;
