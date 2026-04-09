import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import StatusBadge from "../components/StatusBadge";
import type { Database } from "../types/database";

type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];
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

interface EditableFields {
  name: string;
  contact_name: string;
  contact_email: string;
  address: string;
  postal_code: string;
  city: string;
  target_group_description: string;
  preferred_pickup_day: string;
}

const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableFields>({
    name: "", contact_name: "", contact_email: "", address: "", postal_code: "", city: "", target_group_description: "", preferred_pickup_day: "",
  });

  const { data: org, isLoading } = useQuery({
    queryKey: queryKeys.organizations.detail(id!),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as OrgRow;
    },
    enabled: !!id,
  });

  // Populate form when org loads or when entering edit mode
  useEffect(() => {
    if (org && editing) {
      setForm({
        name: org.name ?? "",
        contact_name: org.contact_name ?? "",
        contact_email: org.contact_email ?? "",
        address: org.address ?? "",
        postal_code: org.postal_code ?? "",
        city: org.city ?? "",
        target_group_description: org.target_group_description ?? "",
        preferred_pickup_day: org.preferred_pickup_day ?? "",
      });
    }
  }, [org, editing]);

  // Can this user edit this org?
  const isOwnOrg = user?.organizationId === id;
  const isAdmin = user?.role === "digidromen_admin";
  const isStaff = user?.role === "digidromen_staff";
  const canEdit = isOwnOrg || isAdmin || isStaff;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const patch: Record<string, unknown> = {
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim(),
        target_group_description: form.target_group_description.trim() || null,
        preferred_pickup_day: form.preferred_pickup_day.trim() || null,
        updated_at: new Date().toISOString(),
      };
      // Only admins/staff can change the org name
      if (isAdmin || isStaff) {
        patch.name = form.name.trim();
      }
      const { error } = await getSupabaseClient()
        .from("organizations")
        .update(patch)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(id!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
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
    enabled: !!id && activeTab === "bestellingen",
  });

  const { data: donationsForOrg = [], isLoading: donationsLoading } = useQuery({
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
    enabled: !!id && activeTab === "donaties",
  });

  if (isLoading) return <div className="py-20 text-center text-sm text-slate-400">Laden...</div>;
  if (!org) return <div className="py-20 text-center text-sm text-slate-400">Organisatie niet gevonden.</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overzicht", label: "Overzicht" },
    { key: "bestellingen", label: "Bestellingen" },
    { key: "donaties", label: "Donaties" },
  ];

  const updateField = (key: keyof EditableFields, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fieldRow = (label: string, value: string | null | undefined, key?: keyof EditableFields, type?: string) => {
    if (editing && key) {
      return (
        <div>
          <label className="text-xs font-semibold text-slate-500">{label}</label>
          {type === "textarea" ? (
            <textarea
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-digidromen-primary focus:ring-2"
            />
          ) : (
            <input
              type={type ?? "text"}
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-digidromen-primary focus:ring-2"
            />
          )}
        </div>
      );
    }
    return (
      <div>
        <p className="font-semibold text-slate-500">{label}</p>
        <p>{value || "-"}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/organizations")} className="flex items-center text-slate-500 hover:text-slate-700">
        <ArrowLeft size={18} className="mr-2" /> Terug naar overzicht
      </button>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 pt-6 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">{org.name}</h2>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Pencil size={14} />
                Bewerken
              </button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing(false); saveMutation.reset(); }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600"
                >
                  <X size={14} />
                  Annuleren
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.contact_name.trim() || !form.contact_email.trim() || !form.city.trim()}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Save size={14} />
                  {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            )}
          </div>
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
          {saveMutation.isError && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {saveMutation.error instanceof Error ? saveMutation.error.message : "Opslaan mislukt."}
            </p>
          )}

          {activeTab === "overzicht" && (
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              {(isAdmin || isStaff)
                ? fieldRow("Naam", org.name, "name")
                : <div><p className="font-semibold text-slate-500">Naam</p><p>{org.name}</p></div>
              }
              <div><p className="font-semibold text-slate-500">Type</p><p>{org.type}</p></div>
              {fieldRow("Contactpersoon", org.contact_name, "contact_name")}
              {fieldRow("Email", org.contact_email, "contact_email", "email")}
              {fieldRow("Adres", org.address, "address")}
              {fieldRow("Postcode", org.postal_code, "postal_code")}
              {fieldRow("Stad", org.city, "city")}
              <div><p className="font-semibold text-slate-500">Status</p><p>{org.active ? "Actief" : "Inactief"}</p></div>
              {fieldRow("Doelgroep omschrijving", org.target_group_description, "target_group_description", "textarea")}
              {fieldRow("Voorkeur ophaaldag", org.preferred_pickup_day, "preferred_pickup_day")}
            </div>
          )}

          {activeTab === "bestellingen" && (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bestelnr</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersLoading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Laden...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Geen bestellingen gevonden.</td></tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{order.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={order.status ?? ""} />
                        </td>
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
                  ) : donationsForOrg.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Geen donaties gevonden.</td></tr>
                  ) : (
                    donationsForOrg.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{d.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={d.status ?? ""} />
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
