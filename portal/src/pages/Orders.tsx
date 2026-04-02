import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Laptop, ShoppingCart } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { formatDate } from "../lib/format";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";

const statusTabs = [
  { key: "all", label: "Alle" },
  { key: "INGEDIEND", label: "Ingediend" },
  { key: "IN_BEHANDELING", label: "In behandeling" },
  { key: "IN_VOORBEREIDING", label: "Voorbereiding" },
  { key: "VERZONDEN", label: "Verzonden" },
  { key: "GELEVERD", label: "Geleverd" },
  { key: "AFGESLOTEN", label: "Afgesloten" },
];

const ORDER_CREATOR_ROLES: string[] = ["help_org", "digidromen_staff", "digidromen_admin"];

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState("");
  const [motivation, setMotivation] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const { data: supabaseOrders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select("id, status, organization_id, priority, preferred_delivery_date, created_at, organizations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const { data: laptopProduct } = useQuery({
    queryKey: queryKeys.products.active(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("products")
        .select("id, name, stock_on_hand, stock_reserved, category")
        .eq("active", true)
        .eq("category", "laptop")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: showNewOrder,
  });

  const { data: orderWindow } = useQuery({
    queryKey: queryKeys.portalConfig.key("ordering_windows"),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("portal_config")
        .select("value")
        .eq("key", "ordering_windows")
        .maybeSingle();
      if (error) throw error;
      return data?.value as {
        open?: boolean;
        deadline?: string;
        open_day_of_month?: number;
        close_day_of_next_month?: number;
      } | null;
    },
  });

  const displayOrders = supabaseOrders;
  const filteredOrders = statusFilter === "all"
    ? displayOrders
    : displayOrders.filter((o) => o.status === statusFilter);
  const role = user?.role ?? "help_org";
  const canCreateOrder = ORDER_CREATOR_ROLES.includes(role);
  const windowOpen = orderWindow?.open !== false;

  const submitOrder = async () => {
    setOrderError(null);
    if (!user || quantity <= 0 || !motivation.trim()) return;

    try {
      const id = crypto.randomUUID();
      const deliveryAddress = JSON.stringify({ contactName, street, postalCode, city, country: "NL" });

      const { data: laptop } = await getSupabaseClient()
        .from("products")
        .select("id")
        .eq("category", "laptop")
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (!laptop) {
        throw new Error("Er is nog geen actief laptopproduct beschikbaar. Voeg eerst een product toe in instellingen.");
      }

      const { error: orderError } = await getSupabaseClient()
        .from("orders")
        .insert({
          id,
          organization_id: user.organizationId,
          requester_user_id: user.id,
          motivation: motivation.trim(),
          priority,
          preferred_delivery_date: preferredDeliveryDate || null,
          requested_at: new Date().toISOString(),
          status: "INGEDIEND",
          delivery_address: deliveryAddress,
          stock_badge: "available",
        });
      if (orderError) throw orderError;

      if (laptop) {
        const { error: lineError } = await getSupabaseClient()
          .from("order_lines")
          .insert({
            id: crypto.randomUUID(),
            order_id: id,
            product_id: laptop.id,
            quantity,
            line_type: "new_request",
          });
        if (lineError) throw lineError;
      }

      setOrderComplete(id);
      setQuantity(1);
      setMotivation("");
      setShowNewOrder(false);
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Bestelling kon niet worden aangemaakt.");
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

  // Show order form
  const activeLaptop = laptopProduct;
  const laptopAvailable = (laptopProduct?.stock_on_hand ?? 0) - (laptopProduct?.stock_reserved ?? 0);
  const laptopReserved = laptopProduct?.stock_reserved ?? 0;
  const canSubmitOrder = quantity > 0 && Boolean(motivation.trim()) && Boolean(activeLaptop);

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
                    Digidromen werkt in deze portal met een enkele laptopvoorraad.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Beschikbaar</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{laptopAvailable}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gereserveerd</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{laptopReserved}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{activeLaptop?.name ?? "Laptop"}</p>
                    </div>
                  </div>
                </div>
              </div>
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
                {!activeLaptop ? (
                  <p className="text-sm text-amber-700">
                    Er is nog geen actief laptopproduct ingericht. Voeg eerst voorraad of een product toe voordat je een bestelling aanmaakt.
                  </p>
                ) : null}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Aantal laptops
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Prioriteit
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                  >
                    <option value="low">Laag</option>
                    <option value="normal">Normaal</option>
                    <option value="high">Hoog</option>
                    <option value="urgent">Spoed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Gewenste leverdatum
                  </label>
                  <input
                    type="date"
                    value={preferredDeliveryDate}
                    onChange={(e) => setPreferredDeliveryDate(e.target.value)}
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
                    onChange={(e) => setMotivation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Waarom zijn deze apparaten nodig?"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Contactpersoon"
                  />
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Straat"
                  />
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Postcode"
                  />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                    placeholder="Plaats"
                  />
                </div>
                <button
                  onClick={() => { void submitOrder(); }}
                  disabled={!canSubmitOrder}
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
          <p className="text-sm text-slate-500">
            {isLoading ? "Laden..." : `${displayOrders.length} orders`}
          </p>
        </div>
        {canCreateOrder ? (
          <button
            onClick={() => setShowNewOrder(true)}
            disabled={!windowOpen}
            className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Bestelling toevoegen
          </button>
        ) : null}
      </div>

      {orderWindow && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            windowOpen
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {windowOpen
            ? `Bestelvenster open${orderWindow.deadline ? ` — deadline: ${orderWindow.deadline}` : ""}`
            : "Bestelvenster gesloten — nieuwe bestellingen niet mogelijk"}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  {isLoading ? "Orders laden..." : "Nog geen bestellingen."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const orgName = (order as any).organizations?.name ?? "Onbekend";
                const displayPriority = (order as any).priority;
                const displayDate = (order as any).preferred_delivery_date ?? "-";

                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-sky-700">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{orgName}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{displayPriority}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{displayDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-primary hover:bg-sky-50"
                      >
                        Bekijken
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
