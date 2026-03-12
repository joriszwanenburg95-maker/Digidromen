import React from "react";

import { portalStore, statusClasses, usePortalContext } from "../lib/portal";

const Inventory: React.FC = () => {
  const { inventory, snapshot, user } = usePortalContext();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Voorraad</h2>
          <p className="text-sm text-slate-500">{inventory.length} voorraadregels zichtbaar</p>
        </div>
        {user ? (
          <button
            onClick={() =>
              void portalStore.servicePartner.stockMutation({
                productId: inventory[0]?.productId ?? "product-latitude-14",
                actorUserId: user.id,
                reason: "Demo mutatie voorraad +1",
                availableDelta: 1,
              })
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Simuleer voorraadmutatie
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Locatie</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Beschikbaar</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gereserveerd</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">In transit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {inventory.map((item) => {
              const product = snapshot.data.products[item.productId];
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product?.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.locationName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.availableQuantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.reservedQuantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.inTransitQuantity}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(product?.stockBadge ?? "queued")}`}>
                      {product?.stockBadge ?? "onbekend"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
