import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Laptop, ShoppingCart } from "lucide-react";

import { formatDate, portalStore, statusClasses, usePortalContext } from "../lib/portal";
import type { Product } from "../types";

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { snapshot, viewer, user, orders } = usePortalContext();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<"laag" | "normaal" | "hoog" | "spoed">("normaal");
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState("");
  const [motivation, setMotivation] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const laptop = useMemo(
    () =>
      (Object.values(snapshot.data.products) as Product[])
        .filter((product: Product & { active?: boolean; category?: string }) => product.active !== false && product.category === "laptop")
        .sort((left, right) => left.name.localeCompare(right.name))[0],
    [snapshot.data.products],
  );
  const laptopProductId = laptop?.id ?? "product-laptop";

  const submitOrder = async () => {
    setOrderError(null);
    if (!user || quantity <= 0 || !motivation.trim()) {
      return;
    }

    try {
      const created = await portalStore.createOrder({
        organizationId: viewer.organizationId,
        requesterUserId: user.id,
        servicePartnerOrganizationId: undefined,
        priority,
        preferredDeliveryDate,
        motivation: motivation.trim(),
        shippingAddress: {
          contactName,
          street,
          postalCode,
          city,
          country: "NL",
        },
        lineItems: [{ productId: laptopProductId, quantity, accessoryProductIds: [] }],
      });

      setOrderComplete(created.id);
      setQuantity(1);
      setMotivation("");
      setShowNewOrder(false);
    } catch (error: any) {
      setOrderError(error.message ?? "Bestelling kon niet worden aangemaakt.");
    }
  };

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Bestelling geplaatst</h2>
        <p className="mt-2 text-slate-500">Aanvraag {orderComplete} is succesvol ingediend.</p>
        <button
          onClick={() => navigate(`/orders/${orderComplete}`)}
          className="mt-6 rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Open detailpagina
        </button>
      </div>
    );
  }

  if (showNewOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNewOrder(false)}
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={18} className="mr-2" />
            Terug naar overzicht
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Nieuwe bestelling</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Laptopaanvraag</h3>
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <Laptop size={22} className="text-digidromen-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-slate-900">Laptop</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Digidromen werkt in deze portal met een enkele laptopvoorraad. Productkeuze is daarom niet meer nodig.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Beschikbaar</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{laptop?.availableQuantity ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gereserveerd</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{laptop ? Math.max(0, (laptop as any).stockReserved ?? 0) : 0}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                      <p className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${laptop ? statusClasses(laptop.stockBadge) : statusClasses("out_of_stock")}`}>
                        {laptop?.stockBadge ?? "out_of_stock"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              Elke aanvraag reserveert een aantal laptops uit dezelfde centrale voorraad. De servicepartner ziet daarna direct de bijgewerkte aantallen in het voorraadscherm.
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
                <ShoppingCart size={18} className="mr-2" />
                Aanvraaggegevens
              </h3>
              <div className="space-y-4">
                {orderError ? <p className="text-sm text-rose-600">{orderError}</p> : null}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Aantal laptops
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Prioriteit
                  </label>
                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as "laag" | "normaal" | "hoog" | "spoed")
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                  >
                    <option value="laag">Laag</option>
                    <option value="normaal">Normaal</option>
                    <option value="hoog">Hoog</option>
                    <option value="spoed">Spoed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Gewenste leverdatum
                  </label>
                  <input
                    type="date"
                    value={preferredDeliveryDate}
                    onChange={(event) => setPreferredDeliveryDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Motivatie
                  </label>
                  <textarea
                    rows={4}
                    value={motivation}
                    onChange={(event) => setMotivation(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Waarom zijn deze apparaten nodig?"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Contactpersoon"
                  />
                  <input
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Straat"
                  />
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Postcode"
                  />
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Plaats"
                  />
                </div>
                <button
                  onClick={() => {
                    void submitOrder();
                  }}
                  disabled={quantity <= 0 || !motivation.trim()}
                  className="w-full rounded-xl bg-digidromen-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Bestelling indienen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bestellingen</h2>
          <p className="text-sm text-slate-500">{orders.length} orders zichtbaar voor deze rol</p>
        </div>
        {snapshot.role === "help_org" ? (
          <button
            onClick={() => setShowNewOrder(true)}
            className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Nieuwe aanvraag
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Klant</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prioriteit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Leverdatum</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  Nog geen bestellingen.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-sky-700">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {snapshot.data.organizations[order.organizationId]?.name ?? "Onbekende organisatie"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.priority}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(order.preferredDeliveryDate)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-primary hover:bg-sky-50"
                    >
                      Bekijken
                    </button>
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

export default Orders;
