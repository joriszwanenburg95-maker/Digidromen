import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Package, Pencil, Trash2, UserPlus } from "lucide-react";

import { LoadingButton } from "../components/LoadingButton";
import { useAuth } from "../context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { getSupabaseClient } from "../lib/supabase";
import type { Role } from "../types";
import type { Database } from "../types/database";

const roleOptions: { value: Role; label: string }[] = [
  { value: "help_org", label: "Klant" },
  { value: "digidromen_staff", label: "Digidromen Medewerker" },
  { value: "digidromen_admin", label: "Digidromen Beheerder" },
  { value: "service_partner", label: "Servicepartner" },
];

const orgTypeOptions = [
  { value: "help_org", label: "Klant" },
  { value: "service_partner", label: "Servicepartner" },
  { value: "sponsor", label: "Sponsor" },
  { value: "digidromen", label: "Digidromen" },
];

const productCategoryOptions = [
  { value: "laptop", label: "Laptop" },
  { value: "accessory", label: "Accessoire" },
  { value: "service", label: "Service" },
];

interface UserProfile {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: Role;
  organization_id: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  type: Database["public"]["Tables"]["organizations"]["Row"]["type"];
  city: string;
  contactName?: string | null;
  contactEmail?: string | null;
  active: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category: Database["public"]["Tables"]["products"]["Row"]["category"];
  description: string;
  specificationSummary: string[];
  stockOnHand: number;
  stockReserved: number;
  active: boolean;
}

interface OrganizationFormState {
  name: string;
  type: string;
  city: string;
  contactName: string;
  contactEmail: string;
  active: boolean;
}

interface ProductFormState {
  name: string;
  sku: string;
  category: string;
  description: string;
  specificationSummary: string;
  stockOnHand: number;
  stockReserved: number;
  active: boolean;
}

const emptyOrgForm: OrganizationFormState = {
  name: "",
  type: "help_org",
  city: "",
  contactName: "",
  contactEmail: "",
  active: true,
};

const emptyProductForm: ProductFormState = {
  name: "",
  sku: "",
  category: "laptop",
  description: "",
  specificationSummary: "",
  stockOnHand: 0,
  stockReserved: 0,
  active: true,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type OrganizationQueryRow = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "id" | "name" | "type" | "city" | "contact_name" | "contact_email" | "active"
>;

type ProductQueryRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "name"
  | "sku"
  | "category"
  | "description"
  | "specification_summary"
  | "stock_on_hand"
  | "stock_reserved"
  | "active"
>;

const Settings: React.FC = () => {
  const { user: authUser, authMode } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = authUser?.role === "digidromen_admin";
  const isSupabase = authMode === "supabase";

  const [activeTab, setActiveTab] = useState<"profile" | "users" | "organizations" | "products">("profile");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "help_org" as Role, organizationId: "" });
  const [userError, setUserError] = useState<string | null>(null);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [userActionId, setUserActionId] = useState<string | null>(null);

  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<OrganizationFormState>(emptyOrgForm);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgNotice, setOrgNotice] = useState<string | null>(null);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgDeletingId, setOrgDeletingId] = useState<string | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [productError, setProductError] = useState<string | null>(null);
  const [productNotice, setProductNotice] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productDeletingId, setProductDeletingId] = useState<string | null>(null);

  const { data: organizationsRaw = [] } = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("id, name, type, city, contact_name, contact_email, active")
        .order("name");
      if (error) throw error;
      return ((data ?? []) as OrganizationQueryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        city: row.city ?? "",
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        active: row.active,
      }));
    },
  });

  const organizations = useMemo(
    () =>
      [...organizationsRaw].sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.name.localeCompare(right.name);
      }),
    [organizationsRaw],
  );

  const activeOrganizations = useMemo(
    () => organizationsRaw.filter((org) => org.active),
    [organizationsRaw],
  );

  const orgLookup = useMemo(
    () => new Map(organizationsRaw.map((o) => [o.id, o.name])),
    [organizationsRaw],
  );

  const { data: productsRaw = [] } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("products")
        .select("id, name, sku, category, description, specification_summary, stock_on_hand, stock_reserved, active")
        .order("name");
      if (error) throw error;
      return ((data ?? []) as ProductQueryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku ?? "",
        category: row.category,
        description: row.description ?? "",
        specificationSummary: row.specification_summary ?? [],
        stockOnHand: row.stock_on_hand ?? 0,
        stockReserved: row.stock_reserved ?? 0,
        active: row.active,
      }));
    },
  });

  const products = useMemo(
    () =>
      [...productsRaw].sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.name.localeCompare(right.name);
      }),
    [productsRaw],
  );

  const loadUsers = useCallback(async () => {
    if (!isSupabase || !isAdmin) {
      return;
    }
    setUsersLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, auth_user_id, name, email, role, organization_id")
        .order("name");
      if (error) {
        throw error;
      }
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

  const closeOrgForm = () => {
    setShowOrgForm(false);
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
    setOrgError(null);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setProductError(null);
  };

  const openAddOrgForm = () => {
    setOrgNotice(null);
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
    setShowOrgForm(true);
    setOrgError(null);
  };

  const openEditOrgForm = (org: OrganizationRow) => {
    setOrgNotice(null);
    setEditingOrgId(org.id);
    setOrgForm({
      name: org.name,
      type: org.type,
      city: org.city,
      contactName: org.contactName ?? "",
      contactEmail: org.contactEmail ?? "",
      active: org.active,
    });
    setShowOrgForm(true);
    setOrgError(null);
  };

  const openAddProductForm = () => {
    setProductNotice(null);
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setShowProductForm(true);
    setProductError(null);
  };

  const openEditProductForm = (product: ProductRow) => {
    setProductNotice(null);
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description ?? "",
      specificationSummary: product.specificationSummary.join(", "),
      stockOnHand: product.stockOnHand,
      stockReserved: product.stockReserved,
      active: product.active,
    });
    setShowProductForm(true);
    setProductError(null);
  };

  const callAdminFunction = async (body: Record<string, unknown>) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await supabase.functions.invoke("admin-users", { body });
    if (response.error) {
      throw response.error;
    }
    return response.data;
  };

  const handleAddUser = async () => {
    setUserError(null);
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.organizationId) {
      setUserError("Vul alle velden in.");
      return;
    }
    setAddUserLoading(true);
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (err: unknown) {
      setUserError(getErrorMessage(err, "Fout bij aanmaken gebruiker."));
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUpdateRole = async (profileId: string, role: Role) => {
    setUserActionId(`role-${profileId}`);
    try {
      await callAdminFunction({ action: "update-role", profileId, role });
      await loadUsers();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch {
      // silently fail
    } finally {
      setUserActionId(null);
    }
  };

  const handleDeactivateUser = async (profileId: string) => {
    setUserActionId(`deactivate-${profileId}`);
    try {
      await callAdminFunction({ action: "deactivate", profileId });
      await loadUsers();
    } catch {
      // silently fail
    } finally {
      setUserActionId(null);
    }
  };

  const handleSaveOrg = async () => {
    setOrgError(null);
    setOrgNotice(null);
    if (!orgForm.name.trim() || !orgForm.city.trim() || !orgForm.contactName.trim() || !orgForm.contactEmail.trim()) {
      setOrgError("Naam, stad, contactpersoon en contact-email zijn verplicht.");
      return;
    }

    try {
      setOrgSaving(true);
      const supabase = getSupabaseClient();
      const payload = {
        name: orgForm.name.trim(),
        type: orgForm.type as "help_org" | "digidromen" | "service_partner" | "sponsor",
        city: orgForm.city.trim(),
        contact_name: orgForm.contactName.trim(),
        contact_email: orgForm.contactEmail.trim(),
        active: orgForm.active,
      };

      if (editingOrgId) {
        const { error } = await supabase.from("organizations").update(payload).eq("id", editingOrgId);
        if (error) {
          throw error;
        }
        setOrgNotice("Organisatie bijgewerkt.");
      } else {
        const id = `org-${crypto.randomUUID().slice(0, 8)}`;
        const { error } = await supabase.from("organizations").insert({
          id,
          ...payload,
        });
        if (error) {
          throw error;
        }
        setOrgNotice("Organisatie aangemaakt.");
      }

      closeOrgForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err: unknown) {
      setOrgError(getErrorMessage(err, "Fout bij opslaan organisatie."));
    } finally {
      setOrgSaving(false);
    }
  };

  const handleDeleteOrg = async (org: OrganizationRow) => {
    setOrgError(null);
    setOrgNotice(null);
    const shouldDelete = window.confirm(
      `Verwijder "${org.name}"? Bestaande relaties blijven intact doordat de organisatie inactief wordt gemaakt.`,
    );
    if (!shouldDelete) {
      return;
    }

    try {
      setOrgDeletingId(org.id);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("organizations")
        .update({ active: false })
        .eq("id", org.id);
      if (error) {
        throw error;
      }
      if (editingOrgId === org.id) {
        closeOrgForm();
      }
      setOrgNotice(`Organisatie "${org.name}" is inactief gemaakt.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    } catch (err: unknown) {
      setOrgError(getErrorMessage(err, "Fout bij verwijderen organisatie."));
    } finally {
      setOrgDeletingId(null);
    }
  };

  const handleSaveProduct = async () => {
    setProductError(null);
    setProductNotice(null);
    if (!productForm.name.trim() || !productForm.sku.trim()) {
      setProductError("Naam en SKU zijn verplicht.");
      return;
    }

    try {
      setProductSaving(true);
      const supabase = getSupabaseClient();
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        category: productForm.category as "laptop" | "accessory" | "service",
        description: productForm.description.trim(),
        specification_summary: productForm.specificationSummary
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        stock_on_hand: Math.max(0, productForm.stockOnHand),
        stock_reserved: Math.max(0, productForm.stockReserved),
        active: productForm.active,
      };

      if (editingProductId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProductId);
        if (error) {
          throw error;
        }
        setProductNotice("Product bijgewerkt.");
      } else {
        const id = `product-${crypto.randomUUID().slice(0, 8)}`;
        const { error } = await supabase.from("products").insert({
          id,
          ...payload,
        });
        if (error) {
          throw error;
        }
        setProductNotice("Product aangemaakt.");
      }

      closeProductForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    } catch (err: unknown) {
      setProductError(getErrorMessage(err, "Fout bij opslaan product."));
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (product: ProductRow) => {
    setProductError(null);
    setProductNotice(null);
    const shouldDelete = window.confirm(
      `Verwijder "${product.name}"? Bestaande orders en voorraadkoppelingen blijven intact doordat het product inactief wordt gemaakt.`,
    );
    if (!shouldDelete) {
      return;
    }

    try {
      setProductDeletingId(product.id);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", product.id);
      if (error) {
        throw error;
      }
      if (editingProductId === product.id) {
        closeProductForm();
      }
      setProductNotice(`Product "${product.name}" is inactief gemaakt.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    } catch (err: unknown) {
      setProductError(getErrorMessage(err, "Fout bij verwijderen product."));
    } finally {
      setProductDeletingId(null);
    }
  };

  const tabs = [
    { key: "profile" as const, label: "Profiel" },
    ...(isAdmin
      ? [
          { key: "users" as const, label: "Gebruikers" },
          { key: "organizations" as const, label: "Organisaties" },
          { key: "products" as const, label: "Producten" },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Instellingen</h2>

      {tabs.length > 1 ? (
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="mb-4 font-bold text-gray-800">Mijn Profiel</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Volledige Naam</label>
                <p className="rounded border border-gray-100 bg-gray-50 p-2 text-sm text-gray-700">{authUser?.name}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Email Adres</label>
                <p className="rounded border border-gray-100 bg-gray-50 p-2 text-sm text-gray-700">{authUser?.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Organisatie</label>
                <p className="rounded border border-gray-100 bg-gray-50 p-2 text-sm text-gray-700">{authUser?.organizationId ? orgLookup.get(authUser.organizationId) ?? "-" : "-"}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Rol</label>
                <p className="rounded border border-gray-100 bg-gray-50 p-2 text-sm text-gray-700">
                  {roleOptions.find((item) => item.value === authUser?.role)?.label ?? authUser?.role}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="mb-4 font-bold text-gray-800">Notificatie Voorkeuren</h3>
            <div className="space-y-3">
              {[
                "Email bij statuswijziging bestelling",
                "Email bij nieuwe reparatie update",
                "Melding bij CRM sync fouten",
              ].map((pref, index) => (
                <div key={pref} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`pref-${index}`}
                    className="h-4 w-4 rounded border-gray-300 text-digidromen-primary focus:ring-digidromen-primary"
                    defaultChecked
                  />
                  <label htmlFor={`pref-${index}`} className="ml-3 text-sm text-gray-700">
                    {pref}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "users" && isAdmin ? (
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

          {showAddUser ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="font-bold text-slate-800">Nieuwe gebruiker</h4>
              {userError ? <p className="text-sm text-rose-600">{userError}</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Volledige naam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Wachtwoord"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as Role }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newUser.organizationId}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, organizationId: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                >
                  <option value="">Selecteer organisatie</option>
                  {activeOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <LoadingButton
                  onClick={() => void handleAddUser()}
                  isLoading={addUserLoading}
                  loadingLabel="Aanmaken..."
                  disabled={addUserLoading}
                >
                  Aanmaken
                </LoadingButton>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setUserError(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

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
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                      Laden...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                      Geen gebruikers gevonden.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={item.role}
                          onChange={(event) => void handleUpdateRole(item.id, event.target.value as Role)}
                          disabled={userActionId === `role-${item.id}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold outline-none"
                        >
                          {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {orgLookup.get(item.organization_id) ?? item.organization_id}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => void handleDeactivateUser(item.id)}
                          disabled={userActionId === `deactivate-${item.id}`}
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
      ) : null}

      {activeTab === "organizations" && isAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Organisaties</h3>
              <p className="text-sm text-slate-500">
                Verwijderen maakt organisaties inactief zodat gebruikers, orders en donaties intact blijven.
              </p>
            </div>
            {isSupabase ? (
              <button
                onClick={openAddOrgForm}
                className="flex items-center rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Building2 size={16} className="mr-2" />
                Organisatie toevoegen
              </button>
            ) : null}
          </div>

          {orgNotice ? <p className="text-sm text-emerald-600">{orgNotice}</p> : null}
          {orgError ? <p className="text-sm text-rose-600">{orgError}</p> : null}

          {showOrgForm ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="font-bold text-slate-800">{editingOrgId ? "Organisatie bewerken" : "Nieuwe organisatie"}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={orgForm.name}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Organisatienaam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <select
                  value={orgForm.type}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                >
                  {orgTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={orgForm.city}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="Stad"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  value={orgForm.contactName}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  placeholder="Contactpersoon"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  type="email"
                  value={orgForm.contactEmail}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  placeholder="Contact email"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={orgForm.active}
                    onChange={(event) => setOrgForm((prev) => ({ ...prev, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-digidromen-primary focus:ring-digidromen-primary"
                  />
                  Actief
                </label>
              </div>
              <div className="flex gap-3">
                <LoadingButton
                  onClick={() => void handleSaveOrg()}
                  isLoading={orgSaving}
                  loadingLabel="Opslaan..."
                  disabled={orgSaving}
                >
                  {editingOrgId ? "Opslaan" : "Aanmaken"}
                </LoadingButton>
                <button
                  onClick={closeOrgForm}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                      Geen organisaties.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{org.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {orgTypeOptions.find((option) => option.value === org.type)?.label ?? org.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{org.city}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {org.contactName ? `${org.contactName} (${org.contactEmail ?? "-"})` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            org.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {org.active ? "Actief" : "Inactief"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditOrgForm(org)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                            title="Bewerken"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => void handleDeleteOrg(org)}
                            disabled={orgDeletingId === org.id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                            title="Verwijderen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "products" && isAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Producten</h3>
              <p className="text-sm text-slate-500">
                Verwijderen maakt producten inactief zodat bestaande orders en voorraadkoppelingen leesbaar blijven.
              </p>
            </div>
            {isSupabase ? (
              <button
                onClick={openAddProductForm}
                className="flex items-center rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Package size={16} className="mr-2" />
                Product toevoegen
              </button>
            ) : null}
          </div>

          {productNotice ? <p className="text-sm text-emerald-600">{productNotice}</p> : null}
          {productError ? <p className="text-sm text-rose-600">{productError}</p> : null}

          {showProductForm ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="font-bold text-slate-800">{editingProductId ? "Product bewerken" : "Nieuw product"}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Productnaam"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  value={productForm.sku}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder="SKU"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <select
                  value={productForm.category}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                >
                  {productCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={productForm.specificationSummary}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, specificationSummary: event.target.value }))}
                  placeholder="Specificaties (komma-gescheiden)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  type="number"
                  min={0}
                  value={productForm.stockOnHand}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stockOnHand: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  placeholder="Voorraad"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <input
                  type="number"
                  min={0}
                  value={productForm.stockReserved}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stockReserved: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  placeholder="Gereserveerd"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
                />
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-digidromen-primary focus:ring-digidromen-primary"
                  />
                  Actief
                </label>
              </div>
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Beschrijving"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
              />
              <div className="flex gap-3">
                <LoadingButton
                  onClick={() => void handleSaveProduct()}
                  isLoading={productSaving}
                  loadingLabel="Opslaan..."
                  disabled={productSaving}
                >
                  {editingProductId ? "Opslaan" : "Aanmaken"}
                </LoadingButton>
                <button
                  onClick={closeProductForm}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Voorraad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gereserveerd</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                      Geen producten.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {productCategoryOptions.find((option) => option.value === product.category)?.label ?? product.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.stockOnHand}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.stockReserved}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {product.active ? "Actief" : "Inactief"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditProductForm(product)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                            title="Bewerken"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => void handleDeleteProduct(product)}
                            disabled={productDeletingId === product.id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                            title="Verwijderen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Settings;
