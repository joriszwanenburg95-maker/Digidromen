import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, ShoppingCart, Trash2 } from "lucide-react";

import ProductCatalog from "../components/ProductCatalog";
import { formatDate, portalStore, statusClasses, usePortalContext } from "../lib/portal";
import type { Product } from "../types";

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { snapshot, viewer, user, orders } = usePortalContext();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [priority, setPriority] = useState<"laag" | "normaal" | "hoog" | "spoed">("normaal");
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState("");
  const [motivation, setMotivation] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const products = useMemo(
    () =>
      (Object.values(snapshot.data.products) as Product[]).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [snapshot.data.products],
  );

  const addToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const submitOrder = async () => {
    if (!user || cart.length === 0 || !motivation.trim()) {
      return;
    }

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
      lineItems: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        accessoryProductIds: [],
      })),
    });

    setOrderComplete(created.id);
    setCart([]);
    setMotivation("");
    setShowNewOrder(false);
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
            <h3 className="mb-6 text-lg font-bold text-slate-900">Productcatalogus</h3>
            <ProductCatalog products={products} onAdd={addToCart} />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
                <ShoppingCart size={18} className="mr-2" />
                Selectie
              </h3>
              <div className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500">Nog geen producten geselecteerd.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                        <p className="text-xs text-slate-500">{item.quantity}x</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="space-y-4">
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
                  disabled={cart.length === 0 || !motivation.trim()}
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
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organisatie</th>
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
                    {snapshot.data.organizations[order.organizationId]?.name}
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
