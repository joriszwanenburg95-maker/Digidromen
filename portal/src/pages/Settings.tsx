import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserPlus, Building2, Package } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { portalStore, refreshRemotePortal, usePortalContext } from "../lib/portal";
import { getSupabaseClient } from "../lib/supabase";
import type { Role } from "../types";

const roleOptions: { value: Role; label: string }[] = [
  { value: "help_org", label: "Hulporganisatie" },
  { value: "digidromen_staff", label: "Digidromen Medewerker" },
  { value: "digidromen_admin", label: "Digidromen Beheerder" },
  { value: "service_partner", label: "Servicepartner" },
];

const orgTypeOptions = [
  { value: "help_org", label: "Hulporganisatie" },
  { value: "service_partner", label: "Servicepartner" },
  { value: "sponsor", label: "Sponsor" },
  { value: "digidromen", label: "Digidromen" },
];

interface UserProfile {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: Role;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
  city: string;
  contactName: string;
  contactEmail: string;
}

const Settings: React.FC = () => {
  const { user: authUser, authMode } = useAuth();
  const { user, organization, snapshot } = usePortalContext();
  const isAdmin = authUser?.role === "digidromen_admin";
  const isSupabase = authMode === "supabase";

  const [activeTab, setActiveTab] = useState<"profile" | "users" | "organizations" | "products">("profile");

  // User management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "help_org" as Role, organizationId: "" });
  const [userError, setUserError] = useState<string | null>(null);

  // Org management state
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", type: "help_org", city: "", contactName: "", contactEmail: "" });
  const [orgError, setOrgError] = useState<string | null>(null);

  // Product management state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "", sku: "", category: "laptop", description: "",
    specificationSummary: "", stockOnHand: 0, stockReserved: 0,
  });
  const [productError, setProductError] = useState<string | null>(null);

  const organizations = useMemo(
    () => Object.values(snapshot.data.organizations) as Organization[],
    [snapshot.data.organizations],
  );

  const products = useMemo(
    () => Object.values(snapshot.data.products) as Array<{
      id: string; name: string; sku: string; category: string;
      description: string; stockOnHand: number; stockReserved: number; active: boolean;
    }>,
    [snapshot.data.products],
  );

  const loadUsers = useCallback(async () => {
    if (!isSupabase || !isAdmin) return;
    setUsersLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, auth_user_id, name, email, role, organization_id")
        .order("name");
      if (error) throw error;
      setUsers(data ?? []);
    } catch {
      // silently fail
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, isSupabase]);

  useEffect(() => {
    if (activeTab === "users") {
      void loadUsers();
    }
  }, [activeTab, loadUsers]);

  const callAdminFunction = async (body: Record<string, unknown>) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await supabase.functions.invoke("admin-users", {
      body,
    });

    if (response.error) throw response.error;
    return response.data;
  };

  const handleAddUser = async () => {
    setUserError(null);
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.organizationId) {
      setUserError("Vul alle velden in.");
      return;
    }
    try {
      await callAdminFunction({
        action: "create",
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
        organizationId: newUser.organizationId,
      });
      setShowAddUser(false);
      setNewUser({ name: "", email: "", password: "", role: "help_org", organizationId: "" });
      await loadUsers();
      await refreshRemotePortal();
    } catch (err: any) {
      setUserError(err.message ?? "Fout bij aanmaken gebruiker.");
    }
  };

  const handleUpdateRole = async (profileId: string, role: Role) => {
    try {
      await callAdminFunction({ action: "update-role", profileId, role });
      await loadUsers();
      await refreshRemotePortal();
    } catch {
      // silently fail
    }
  };

  const handleDeactivateUser = async (profileId: string) => {
    try {
      await callAdminFunction({ action: "deactivate", profileId });
      await loadUsers();
    } catch {
      // silently fail
    }
  };

  const handleAddOrg = async () => {
    setOrgError(null);
    if (!newOrg.name || !newOrg.city) {
      setOrgError("Naam en stad zijn verplicht.");
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const id = `org-${crypto.randomUUID().slice(0, 8)}`;
      const { error } = await supabase.from("organizations").insert({
        id,
        name: newOrg.name,
        type: newOrg.type,
        city: newOrg.city,
        contact_name: newOrg.contactName || null,
        contact_email: newOrg.contactEmail || null,
        active: true,
      });
      if (error) throw error;
      setShowAddOrg(false);
      setNewOrg({ name: "", type: "help_org", city: "", contactName: "", contactEmail: "" });
      await refreshRemotePortal();
    } catch (err: any) {
      setOrgError(err.message ?? "Fout bij aanmaken organisatie.");
    }
  };

  const handleAddProduct = async () => {
    setProductError(null);
    if (!newProduct.name || !newProduct.sku) {
      setProductError("Naam en SKU zijn verplicht.");
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const id = `product-${crypto.randomUUID().slice(0, 8)}`;
      const { error } = await supabase.from("products").insert({
        id,
        name: newProduct.name,
        sku: newProduct.sku,
        category: newProduct.category,
        description: newProduct.description || "",
        specification_summary: newProduct.specificationSummary
          ? newProduct.specificationSummary.split(",").map((s) => s.trim())
          : [],
        stock_on_hand: newProduct.stockOnHand,
        stock_reserved: newProduct.stockReserved,
        active: true,
      });
      if (error) throw error;
      setShowAddProduct(false);
      setNewProduct({ name: "", sku: "", category: "laptop", description: "", specificationSummary: "", stockOnHand: 0, stockReserved: 0 });
      await refreshRemotePortal();
    } catch (err: any) {
      setProductError(err.message ?? "Fout bij aanmaken product.");
    }
  };

  const tabs = [
    { key: "profile" as const, label: "Profiel" },
    ...(isAdmin ? [
      { key: "users" as const, label: "Gebruikers" },
      { key: "organizations" as const, label: "Organisaties" },
      { key: "products" as const, label: "Producten" },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Instellingen</h2>

      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          <div className="p-6">
            <h3 className="font-bold text-gray-800 mb-4">Mijn Profiel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Volledige Naam</label>
                <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{user?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email Adres</label>
                <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{user?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Organisatie</label>
                <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{organization?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Rol</label>
                <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">
                  {roleOptions.find((r) => r.value === authUser?.role)?.label ?? authUser?.role}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-bold text-gray-800 mb-4">Notificatie Voorkeuren</h3>
            <div className="space-y-3">
              {[
                "Email bij statuswijziging bestelling",
                "Email bij nieuwe reparatie update",
                "Melding bij CRM sync fouten",
              ].map((pref, i) => (
                <div key={i} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`pref-${i}`}
                    className="w-4 h-4 text-digidromen-primary border-gray-300 rounded focus:ring-digidromen-primary"
                    defaultChecked
                  />
                  <label htmlFor={`pref-${i}`} className="ml-3 text-sm text-gray-700">
                    {pref}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Gebruikers</h3>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
            >
              <UserPlus size={16} className="mr-2" />
              Gebruiker toevoegen
            </button>
          </div>

          {showAddUser && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">Nieuwe gebruiker</h4>
              {userError && <p className="text-sm text-rose-600">{userError}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Volledige naam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Wachtwoord"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as Role }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <select
                  value={newUser.organizationId}
                  onChange={(e) => setNewUser((p) => ({ ...p, organizationId: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                >
                  <option value="">Selecteer organisatie</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleAddUser()}
                  className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Aanmaken
                </button>
                <button
                  onClick={() => { setShowAddUser(false); setUserError(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organisatie</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usersLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">Laden...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">Geen gebruikers gevonden.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => void handleUpdateRole(u.id, e.target.value as Role)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold outline-none"
                        >
                          {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {(snapshot.data.organizations as Record<string, any>)[u.organization_id]?.name ?? u.organization_id}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => void handleDeactivateUser(u.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          title="Deactiveren"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "organizations" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Organisaties</h3>
            {isSupabase && (
              <button
                onClick={() => setShowAddOrg(true)}
                className="flex items-center rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Building2 size={16} className="mr-2" />
                Organisatie toevoegen
              </button>
            )}
          </div>

          {showAddOrg && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">Nieuwe organisatie</h4>
              {orgError && <p className="text-sm text-rose-600">{orgError}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newOrg.name}
                  onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Organisatienaam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <select
                  value={newOrg.type}
                  onChange={(e) => setNewOrg((p) => ({ ...p, type: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                >
                  {orgTypeOptions.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  value={newOrg.city}
                  onChange={(e) => setNewOrg((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Stad"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  value={newOrg.contactName}
                  onChange={(e) => setNewOrg((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="Contactpersoon"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  type="email"
                  value={newOrg.contactEmail}
                  onChange={(e) => setNewOrg((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="Contact email"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleAddOrg()}
                  className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Aanmaken
                </button>
                <button
                  onClick={() => { setShowAddOrg(false); setOrgError(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {organizations.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">Geen organisaties.</td></tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{org.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{org.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{org.city}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{org.contactName ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "products" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Producten</h3>
            {isSupabase && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Package size={16} className="mr-2" />
                Product toevoegen
              </button>
            )}
          </div>

          {showAddProduct && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">Nieuw product</h4>
              {productError && <p className="text-sm text-rose-600">{productError}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Productnaam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                  placeholder="SKU"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                >
                  <option value="laptop">Laptop</option>
                  <option value="accessory">Accessoire</option>
                  <option value="service">Service</option>
                </select>
                <input
                  value={newProduct.specificationSummary}
                  onChange={(e) => setNewProduct((p) => ({ ...p, specificationSummary: e.target.value }))}
                  placeholder="Specificaties (komma-gescheiden)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
                <input
                  type="number"
                  min={0}
                  value={newProduct.stockOnHand}
                  onChange={(e) => setNewProduct((p) => ({ ...p, stockOnHand: Number(e.target.value) }))}
                  placeholder="Voorraad"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
                />
              </div>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                placeholder="Beschrijving"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 ring-digidromen-primary"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => void handleAddProduct()}
                  className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Aanmaken
                </button>
                <button
                  onClick={() => { setShowAddProduct(false); setProductError(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Voorraad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gereserveerd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">Geen producten.</td></tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.sku}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.category}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.stockOnHand}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.stockReserved}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
