import React from "react";
import { Download } from "lucide-react";

import { downloadTextFile, formatDate, portalStore, usePortalContext } from "../lib/portal";

const Reports: React.FC = () => {
  const { snapshot, orders, repairs, donations } = usePortalContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Rapportages</h2>
        <div className="flex gap-3">
          <button
            onClick={() => downloadTextFile("orders.csv", portalStore.exportOrdersCsv())}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={18} className="mr-2" />
            Orders CSV
          </button>
          <button
            onClick={() => downloadTextFile("repairs.csv", portalStore.exportRepairsCsv())}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={18} className="mr-2" />
            Repairs CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800">Doelbereik Laptops</h3>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">On Track</span>
          </div>
          <div className="h-48 flex items-end justify-between space-x-2">
            {[40, 65, 30, 85, 45, 70, 90].map((h, i) => (
              <div key={i} className="bg-blue-100 w-full rounded-t hover:bg-digidromen-primary transition-colors cursor-pointer" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            <span>Maa</span><span>Din</span><span>Woe</span><span>Don</span><span>Vrij</span><span>Zat</span><span>Zon</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Status Verdeling</h3>
          <div className="space-y-4">
            {[
              { label: 'Geleverd', value: 65, color: 'bg-green-500' },
              { label: 'In Behandeling', value: 25, color: 'bg-blue-500' },
              { label: 'Reparatie', value: 10, color: 'bg-orange-500' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Orders</h3>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{order.id}</span>
                  <span className="text-slate-500">{order.status}</span>
                </div>
                <p className="mt-1 text-slate-500">{formatDate(order.preferredDeliveryDate)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Repairs</h3>
          <div className="space-y-3">
            {repairs.slice(0, 5).map((repair) => (
              <div key={repair.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{repair.id}</span>
                  <span className="text-slate-500">{repair.status}</span>
                </div>
                <p className="mt-1 text-slate-500">{repair.issueType}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Donations</h3>
          <div className="space-y-3">
            {donations.slice(0, 5).map((donation) => (
              <div key={donation.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{donation.id}</span>
                  <span className="text-slate-500">{donation.status}</span>
                </div>
                <p className="mt-1 text-slate-500">{snapshot.data.organizations[donation.donorOrganizationId]?.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
