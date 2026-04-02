import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";

type Tab = "overzicht" | "bestellingen" | "donaties";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  inspected: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authMode } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");

  const { data: org, isLoading } = useQuery({
    queryKey: queryKeys.organizations.detail(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase" && !!id,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [...queryKeys.orders.list(), "org", id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("orders")
        .select("id, status, created_at")
        .eq("organization_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase" && !!id && activeTab === "bestellingen",
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery({
    queryKey: [...queryKeys.donations.list(), "org", id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("donation_batches")
        .select("id, status, device_count_promised, created_at")
        .eq("sponsor_organization_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: authMode === "supabase" && !!id && activeTab === "donaties",
  });

  if (isLoading) return <div className="py-20 text-center text-sm text-slate-400">Laden...</div>;
  if (!org) return <div className="py-20 text-center text-sm text-slate-400">Organisatie niet gevonden.</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overzicht", label: "Overzicht" },
    { key: "bestellingen", label: "Bestellingen" },
    { key: "donaties", label: "Donaties" },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/organizations")} className="flex items-center text-slate-500 hover:text-slate-700">
        <ArrowLeft size={18} className="mr-2" /> Terug naar overzicht
      </button>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 pt-6 pb-0">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{org.name}</h2>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-white text-digidromen-primary border-b-2 border-digidromen-primary"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overzicht" && (
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><p className="font-semibold text-slate-500">Type</p><p>{org.type}</p></div>
              <div><p className="font-semibold text-slate-500">Stad</p><p>{org.city}</p></div>
              <div><p className="font-semibold text-slate-500">Contactpersoon</p><p>{org.contact_name}</p></div>
              <div><p className="font-semibold text-slate-500">Email</p><p>{org.contact_email}</p></div>
              {org.address && <div><p className="font-semibold text-slate-500">Adres</p><p>{org.address}</p></div>}
              <div><p className="font-semibold text-slate-500">Status</p><p>{org.active ? "Actief" : "Inactief"}</p></div>
            </div>
          )}

          {activeTab === "bestellingen" && (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bestelnr</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aantal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Laden...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Geen bestellingen gevonden.</td></tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{order.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status ?? ""] ?? "bg-slate-100 text-slate-700"}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">-</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{order.created_at ? new Date(order.created_at).toLocaleDateString("nl-NL") : "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(`/orders/${order.id}`)} className="rounded-lg px-3 py-1 text-sm font-semibold text-digidromen-primary hover:bg-sky-50">Bekijk</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "donaties" && (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Batchnr</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Apparaten</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donationsLoading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Laden...</td></tr>
                  ) : donations.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Geen donaties gevonden.</td></tr>
                  ) : (
                    donations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{d.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status ?? ""] ?? "bg-slate-100 text-slate-700"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{d.device_count_promised ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{d.created_at ? new Date(d.created_at).toLocaleDateString("nl-NL") : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetail;
