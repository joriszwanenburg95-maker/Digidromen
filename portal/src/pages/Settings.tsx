import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Package, Pencil, Trash2, UserPlus } from "lucide-react";

import { LoadingButton } from "../components/LoadingButton";
import { useAuth } from "../context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { translateError } from "../lib/errors";
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

const contactRoleOptions = [
  "Coordinator",
  "Projectmedewerker",
  "Directeur",
  "Bestuur",
  "Locatiemanager",
  "Anders",
] as const;

const targetGroupOptions = [
  "Basisschool (groep 3-8)",
  "Middelbare school",
  "MBO / HBO / WO",
  "Anders",
] as const;

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
  return translateError(error, fallback);
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

/* ------------------------------------------------------------------ */
/*  Per-role tab definitions                                           */
/* ------------------------------------------------------------------ */

type SettingsTabKey = "profile" | "users" | "organizations" | "products" | "bestelvenster";

function getAvailableTabs(role: Role | undefined): { key: SettingsTabKey; label: string }[] {
  const profile = { key: "profile" as const, label: "Profiel" };

  switch (role) {
    case "help_org":
    case "service_partner":
      return [profile];
    case "digidromen_staff":
      return [
        profile,
        { key: "organizations", label: "Organisaties" },
        { key: "products", label: "Producten" },
        { key: "bestelvenster", label: "Bestelvenster" },
      ];
    case "digidromen_admin":
      return [
        profile,
        { key: "users", label: "Gebruikers" },
        { key: "organizations", label: "Organisaties" },
        { key: "products", label: "Producten" },
        { key: "bestelvenster", label: "Bestelvenster" },
      ];
    default:
      return [profile];
  }
}

/* ------------------------------------------------------------------ */

const Settings: React.FC = () => {
  const { user: authUser, authMode, refreshUserProfile } = useAuth();
  const queryClient = useQueryClient();
  const role = authUser?.role as Role | undefined;
  const isAdmin = role === "digidromen_admin";
  const isStaffOrAdmin = role === "digidromen_admin" || role === "digidromen_staff";
  const isHelpOrgUser = role === "help_org";
  const isServicePartner = role === "service_partner";
  const showSelfOrgProfile = isHelpOrgUser || isServicePartner;
  const isSupabase = authMode === "supabase";

  const availableTabs = useMemo(() => getAvailableTabs(role), [role]);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("profile");

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

  const [orderingWindowOpen, setOrderingWindowOpen] = useState<number>(1);
  const [orderingWindowClose, setOrderingWindowClose] = useState<number>(7);
  const [orderingWindowForceOpen, setOrderingWindowForceOpen] = useState(false);
  const [orderingWindowDirty, setOrderingWindowDirty] = useState(false);
  const [orderingWindowSaving, setOrderingWindowSaving] = useState(false);
  const [orderingWindowError, setOrderingWindowError] = useState<string | null>(null);
  const [orderingWindowNotice, setOrderingWindowNotice] = useState<string | null>(null);
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

  interface HelpOrgSelfFormState {
    name: string;
    address: string;
    postal_code: string;
    city: string;
    contact_name: string;
    contact_email: string;
    target_group_description: string;
  }

  const emptyHelpOrgSelfForm: HelpOrgSelfFormState = {
    name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_name: "",
    contact_email: "",
    target_group_description: "",
  };

  const [helpOrgSelfForm, setHelpOrgSelfForm] = useState<HelpOrgSelfFormState>(
    emptyHelpOrgSelfForm,
  );
  const [helpOrgSelfSaving, setHelpOrgSelfSaving] = useState(false);
  const [helpOrgSelfNotice, setHelpOrgSelfNotice] = useState<string | null>(null);
  const [helpOrgSelfError, setHelpOrgSelfError] = useState<string | null>(null);

  const [userSelfName, setUserSelfName] = useState("");
  const [userSelfPhone, setUserSelfPhone] = useState("");
  const [userSelfTitle, setUserSelfTitle] = useState("");
  const [userSelfSaving, setUserSelfSaving] = useState(false);
  const [userSelfNotice, setUserSelfNotice] = useState<string | null>(null);
  const [userSelfError, setUserSelfError] = useState<string | null>(null);

  const { data: helpOrgSelfRow } = useQuery({
    queryKey: [
      ...queryKeys.organizations.detail(authUser?.organizationId ?? ""),
      "help-org-self-service",
    ],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select(
          "id, name, address, postal_code, city, contact_name, contact_email, target_group_description",
        )
        .eq("id", authUser!.organizationId!)
        .single();
      if (error) throw error;
      return data as HelpOrgSelfFormState & { id: string };
    },
    enabled:
      isSupabase && showSelfOrgProfile && Boolean(authUser?.organizationId),
  });

  useEffect(() => {
    if (!helpOrgSelfRow) return;
    setHelpOrgSelfForm({
      name: helpOrgSelfRow.name ?? "",
      address: helpOrgSelfRow.address ?? "",
      postal_code: helpOrgSelfRow.postal_code ?? "",
      city: helpOrgSelfRow.city ?? "",
      contact_name: helpOrgSelfRow.contact_name ?? "",
      contact_email: helpOrgSelfRow.contact_email ?? "",
      target_group_description: helpOrgSelfRow.target_group_description ?? "",
    });
  }, [helpOrgSelfRow]);

  const { data: selfUserProfile } = useQuery({
    queryKey: ["user-profiles", "self", authUser?.id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("user_profiles")
        .select("name, phone, title, email")
        .eq("id", authUser!.id!)
        .single();
      if (error) throw error;
      return data as { name: string; phone: string | null; title: string | null; email: string };
    },
    enabled: isSupabase && showSelfOrgProfile && Boolean(authUser?.id),
  });

  useEffect(() => {
    if (!selfUserProfile) return;
    setUserSelfName(selfUserProfile.name ?? "");
    setUserSelfPhone(selfUserProfile.phone ?? "");
    setUserSelfTitle(selfUserProfile.title ?? "");
  }, [selfUserProfile]);

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

  const { data: orderingWindowsRow } = useQuery({
    queryKey: queryKeys.portalConfig.key("ordering_windows"),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("portal_config")
        .select("value, updated_at")
        .eq("key", "ordering_windows")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isStaffOrAdmin,
  });

  useEffect(() => {
    if (!orderingWindowsRow?.value || orderingWindowDirty) {
      return;
    }
    const value = orderingWindowsRow.value as {
      open_day?: number;
      close_day?: number;
      force_open_help_org?: boolean;
    };
    setOrderingWindowOpen(value.open_day ?? 1);
    setOrderingWindowClose(value.close_day ?? 7);
    setOrderingWindowForceOpen(value.force_open_help_org ?? false);
  }, [orderingWindowsRow, orderingWindowDirty]);

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

  const handleUpdateRole = async (profileId: string, newRole: Role) => {
    setUserActionId(`role-${profileId}`);
    try {
      await callAdminFunction({ action: "update-role", profileId, role: newRole });
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

  const handleSaveHelpOrgSelf = async () => {
    if (!authUser?.organizationId) return;
    setHelpOrgSelfError(null);
    setHelpOrgSelfNotice(null);
    const f = helpOrgSelfForm;
    if (
      !f.name.trim() ||
      !f.city.trim() ||
      !f.contact_name.trim() ||
      !f.contact_email.trim()
    ) {
      setHelpOrgSelfError(
        "Organisatienaam, stad, contactpersoon en contact-e-mail zijn verplicht.",
      );
      return;
    }
    if (isHelpOrgUser && !f.target_group_description.trim()) {
      setHelpOrgSelfError(
        "Vul de doelgroepomschrijving in (nodig voor laptoppakket-bestellingen).",
      );
      return;
    }
    setHelpOrgSelfSaving(true);
    try {
      const { error } = await getSupabaseClient()
        .from("organizations")
        .update({
          name: f.name.trim(),
          city: f.city.trim(),
          address: f.address.trim() || null,
          postal_code: f.postal_code.trim() || null,
          contact_name: f.contact_name.trim(),
          contact_email: f.contact_email.trim(),
          target_group_description: f.target_group_description.trim(),
        })
        .eq("id", authUser.organizationId);
      if (error) throw error;
      setHelpOrgSelfNotice(
        "Organisatiegegevens opgeslagen. Wijzigingen zijn direct zichtbaar bij nieuwe bestellingen.",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(authUser.organizationId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });
    } catch (err: unknown) {
      setHelpOrgSelfError(getErrorMessage(err, "Opslaan mislukt."));
    } finally {
      setHelpOrgSelfSaving(false);
    }
  };

  const handleSaveUserSelf = async () => {
    if (!authUser?.id) return;
    setUserSelfError(null);
    setUserSelfNotice(null);
    if (!userSelfName.trim()) {
      setUserSelfError("Vul je naam in.");
      return;
    }
    setUserSelfSaving(true);
    try {
      const { error } = await getSupabaseClient()
        .from("user_profiles")
        .update({
          name: userSelfName.trim(),
          phone: userSelfPhone.trim() || null,
          title: userSelfTitle.trim() || null,
        })
        .eq("id", authUser.id);
      if (error) throw error;
      setUserSelfNotice("Je naam en telefoon zijn opgeslagen.");
      await queryClient.invalidateQueries({
        queryKey: ["user-profiles", "self", authUser.id],
      });
      await refreshUserProfile();
    } catch (err: unknown) {
      setUserSelfError(getErrorMessage(err, "Profiel opslaan mislukt."));
    } finally {
      setUserSelfSaving(false);
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

  /* ---- input style constants ---- */
  const inputCls =
    "w-full rounded-lg border border-digidromen-cream px-3 py-2 text-sm text-digidromen-dark focus:border-digidromen-orange focus:outline-none focus:ring-2 focus:ring-digidromen-orange/30";
  const formInputCls =
    "rounded-xl border border-digidromen-cream bg-digidromen-cream/30 p-3 text-sm outline-none ring-digidromen-orange focus:ring-2";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-digidromen-dark">Instellingen</h2>

      {availableTabs.length > 1 ? (
        <div className="flex gap-1 rounded-xl bg-digidromen-cream p-1">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key ? "bg-surface text-digidromen-dark shadow-sm" : "text-digidromen-dark/60 hover:text-digidromen-dark"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  PROFILE TAB                                                  */}
      {/* ============================================================ */}
      {activeTab === "profile" ? (
        <div className="divide-y divide-digidromen-cream overflow-hidden rounded-2xl border border-digidromen-cream bg-surface shadow-sm">
          {showSelfOrgProfile ? (
            <>
              {/* ---- Own user account ---- */}
              <div className="p-6">
                <h3 className="mb-2 font-bold text-digidromen-dark">Mijn account</h3>
                <p className="mb-4 text-sm text-digidromen-dark/60">
                  Pas je naam en telefoon aan. Je inlog-e-mail wijzigen kan alleen via Digidromen (die koppeling staat in Supabase Auth).
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="self-name" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Volledige naam (jouw persoonlijke naam)
                    </label>
                    <input
                      id="self-name"
                      value={userSelfName}
                      onChange={(e) => {
                        setUserSelfName(e.target.value);
                        setUserSelfNotice(null);
                        setUserSelfError(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="self-phone" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Telefoon / mobiel
                    </label>
                    <input
                      id="self-phone"
                      type="tel"
                      value={userSelfPhone}
                      onChange={(e) => {
                        setUserSelfPhone(e.target.value);
                        setUserSelfNotice(null);
                        setUserSelfError(null);
                      }}
                      className={inputCls}
                      placeholder="Bijv. 06-12345678"
                    />
                  </div>
                  {isHelpOrgUser ? (
                    <div>
                      <label htmlFor="self-title" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                        Functie binnen organisatie
                      </label>
                      <select
                        id="self-title"
                        value={userSelfTitle}
                        onChange={(e) => {
                          setUserSelfTitle(e.target.value);
                          setUserSelfNotice(null);
                          setUserSelfError(null);
                        }}
                        className={inputCls}
                      >
                        <option value="">Maak een keuze...</option>
                        {contactRoleOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">E-mail (inlog)</label>
                    <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">
                      {authUser?.email ?? "—"}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">Rol</label>
                    <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">
                      {roleOptions.find((item) => item.value === authUser?.role)?.label ?? authUser?.role}
                    </p>
                  </div>
                </div>
                {userSelfError ? <p className="mt-3 text-sm text-red-600">{userSelfError}</p> : null}
                {userSelfNotice ? <p className="mt-3 text-sm text-digidromen-orange">{userSelfNotice}</p> : null}
                <LoadingButton
                  type="button"
                  className="mt-4 rounded-[20px] bg-digidromen-primary text-white"
                  onClick={() => {
                    void handleSaveUserSelf();
                  }}
                  isLoading={userSelfSaving}
                  loadingLabel="Opslaan..."
                >
                  Account opslaan
                </LoadingButton>
              </div>

              {/* ---- Own organization ---- */}
              <div className="p-6">
                <h3 className="mb-2 font-bold text-digidromen-dark">Organisatiegegevens</h3>
                <p className="mb-4 text-sm text-digidromen-dark/60">
                  Wijzig hier de gegevens van jullie organisatie (contactpersoon, adres{isHelpOrgUser ? ", doelgroep" : ""}). Deze gegevens gebruiken we voor levering
                  {isHelpOrgUser ? (
                    <>
                      {" "}en <strong className="font-semibold text-digidromen-dark">laptoppakket-bestellingen</strong> (doelgroep)
                    </>
                  ) : null}.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="ho-name" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Naam organisatie (bedrijf / stichting)
                    </label>
                    <p className="mb-1 text-xs text-digidromen-dark/50">
                      De officiële naam van je organisatie of bedrijf — niet je
                      persoonlijke naam. Deze naam staat op je aanvragen en leveringen.
                    </p>
                    <input
                      id="ho-name"
                      value={helpOrgSelfForm.name}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, name: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ho-contact" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Contactpersoon (persoonlijke naam)
                    </label>
                    <input
                      id="ho-contact"
                      value={helpOrgSelfForm.contact_name}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, contact_name: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ho-email" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Contact e-mail organisatie
                    </label>
                    <input
                      id="ho-email"
                      type="email"
                      value={helpOrgSelfForm.contact_email}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, contact_email: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="ho-address" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Adres (straat + huisnummer)
                    </label>
                    <input
                      id="ho-address"
                      value={helpOrgSelfForm.address}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, address: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ho-postal" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Postcode
                    </label>
                    <input
                      id="ho-postal"
                      value={helpOrgSelfForm.postal_code}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, postal_code: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="ho-city" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                      Plaats
                    </label>
                    <input
                      id="ho-city"
                      value={helpOrgSelfForm.city}
                      onChange={(e) => {
                        setHelpOrgSelfForm((p) => ({ ...p, city: e.target.value }));
                        setHelpOrgSelfError(null);
                        setHelpOrgSelfNotice(null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  {isHelpOrgUser ? (
                    <div className="md:col-span-2">
                      <label htmlFor="ho-target" className="mb-1 block text-xs font-semibold text-digidromen-dark/40">
                        Doelgroep (samenwerking / laptoppakketten)
                      </label>
                      <select
                        id="ho-target"
                        value={
                          targetGroupOptions.includes(
                            helpOrgSelfForm.target_group_description as (typeof targetGroupOptions)[number],
                          )
                            ? helpOrgSelfForm.target_group_description
                            : helpOrgSelfForm.target_group_description
                              ? "Anders"
                              : ""
                        }
                        onChange={(e) => {
                          setHelpOrgSelfForm((p) => ({
                            ...p,
                            target_group_description: e.target.value,
                          }));
                          setHelpOrgSelfError(null);
                          setHelpOrgSelfNotice(null);
                        }}
                        className={inputCls}
                      >
                        <option value="">Maak een keuze...</option>
                        {targetGroupOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                {helpOrgSelfError ? <p className="mt-3 text-sm text-red-600">{helpOrgSelfError}</p> : null}
                {helpOrgSelfNotice ? <p className="mt-3 text-sm text-digidromen-orange">{helpOrgSelfNotice}</p> : null}
                <LoadingButton
                  type="button"
                  className="mt-4 rounded-[20px] bg-digidromen-primary text-white"
                  onClick={() => {
                    void handleSaveHelpOrgSelf();
                  }}
                  isLoading={helpOrgSelfSaving}
                  loadingLabel="Opslaan..."
                >
                  Organisatie opslaan
                </LoadingButton>
              </div>
            </>
          ) : (
            <div className="p-6">
              <h3 className="mb-4 font-bold text-digidromen-dark">Mijn Profiel</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">Volledige Naam</label>
                  <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">{authUser?.name}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">Email Adres</label>
                  <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">{authUser?.email}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">Organisatie</label>
                  <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">{authUser?.organizationId ? orgLookup.get(authUser.organizationId) ?? "-" : "-"}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-digidromen-dark/40">Rol</label>
                  <p className="rounded border border-digidromen-cream bg-digidromen-cream/30 p-2 text-sm text-digidromen-dark/80">
                    {roleOptions.find((item) => item.value === authUser?.role)?.label ?? authUser?.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isHelpOrgUser ? null : (
            <div className="p-6">
              <h3 className="mb-4 font-bold text-digidromen-dark">Notificatie Voorkeuren</h3>
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
                      className="h-4 w-4 rounded border-digidromen-cream text-digidromen-primary focus:ring-digidromen-primary"
                      defaultChecked
                    />
                    <label htmlFor={`pref-${index}`} className="ml-3 text-sm text-digidromen-dark/80">
                      {pref}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  USERS TAB (admin only)                                       */}
      {/* ============================================================ */}
      {activeTab === "users" && isAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-digidromen-dark">Gebruikers</h3>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center rounded-[20px] bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
            >
              <UserPlus size={16} className="mr-2" />
              Gebruiker toevoegen
            </button>
          </div>

          {showAddUser ? (
            <div className="space-y-4 rounded-2xl border border-digidromen-cream bg-surface p-6 shadow-sm">
              <h4 className="font-bold text-digidromen-dark">Nieuwe gebruiker</h4>
              {userError ? <p className="text-sm text-rose-600">{userError}</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Volledige naam"
                  className={formInputCls}
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className={formInputCls}
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Wachtwoord"
                  className={formInputCls}
                />
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as Role }))}
                  className={formInputCls}
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newUser.organizationId}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, organizationId: event.target.value }))}
                  className={formInputCls}
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
                  className="rounded-[20px] bg-digidromen-primary text-white"
                >
                  Aanmaken
                </LoadingButton>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setUserError(null);
                  }}
                  className="rounded-[20px] border border-digidromen-cream px-4 py-2 text-sm font-semibold text-digidromen-dark/60"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-digidromen-cream bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-digidromen-cream">
              <thead className="bg-digidromen-cream/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Organisatie</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-digidromen-cream bg-surface">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-digidromen-dark/40">
                      Laden...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-digidromen-dark/40">
                      Geen gebruikers gevonden.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="hover:bg-digidromen-cream/30">
                      <td className="px-6 py-4 text-sm font-semibold text-digidromen-dark">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{item.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={item.role}
                          onChange={(event) => void handleUpdateRole(item.id, event.target.value as Role)}
                          disabled={userActionId === `role-${item.id}`}
                          className="rounded-lg border border-digidromen-cream bg-digidromen-cream/30 px-2 py-1 text-xs font-semibold outline-none"
                        >
                          {roleOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">
                        {orgLookup.get(item.organization_id) ?? item.organization_id}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => void handleDeactivateUser(item.id)}
                          disabled={userActionId === `deactivate-${item.id}`}
                          className="rounded-lg p-1.5 text-digidromen-dark/40 hover:bg-rose-50 hover:text-rose-500"
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

      {/* ============================================================ */}
      {/*  ORGANIZATIONS TAB (staff + admin)                            */}
      {/* ============================================================ */}
      {activeTab === "organizations" && isStaffOrAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-digidromen-dark">Organisaties</h3>
              <p className="text-sm text-digidromen-dark/60">
                Verwijderen maakt organisaties inactief zodat gebruikers, orders en donaties intact blijven.
              </p>
            </div>
            {isSupabase ? (
              <button
                onClick={openAddOrgForm}
                className="flex items-center rounded-[20px] bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Building2 size={16} className="mr-2" />
                Organisatie toevoegen
              </button>
            ) : null}
          </div>

          {orgNotice ? <p className="text-sm text-emerald-600">{orgNotice}</p> : null}
          {orgError ? <p className="text-sm text-rose-600">{orgError}</p> : null}

          {showOrgForm ? (
            <div className="space-y-4 rounded-2xl border border-digidromen-cream bg-surface p-6 shadow-sm">
              <h4 className="font-bold text-digidromen-dark">{editingOrgId ? "Organisatie bewerken" : "Nieuwe organisatie"}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={orgForm.name}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Organisatienaam"
                  className={formInputCls}
                />
                <select
                  value={orgForm.type}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, type: event.target.value }))}
                  className={formInputCls}
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
                  className={formInputCls}
                />
                <input
                  value={orgForm.contactName}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  placeholder="Contactpersoon"
                  className={formInputCls}
                />
                <input
                  type="email"
                  value={orgForm.contactEmail}
                  onChange={(event) => setOrgForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  placeholder="Contact email"
                  className={formInputCls}
                />
                <label className="flex items-center gap-3 rounded-xl border border-digidromen-cream bg-digidromen-cream/30 p-3 text-sm text-digidromen-dark/80">
                  <input
                    type="checkbox"
                    checked={orgForm.active}
                    onChange={(event) => setOrgForm((prev) => ({ ...prev, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-digidromen-cream text-digidromen-primary focus:ring-digidromen-primary"
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
                  className="rounded-[20px] bg-digidromen-primary text-white"
                >
                  {editingOrgId ? "Opslaan" : "Aanmaken"}
                </LoadingButton>
                <button
                  onClick={closeOrgForm}
                  className="rounded-[20px] border border-digidromen-cream px-4 py-2 text-sm font-semibold text-digidromen-dark/60"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-digidromen-cream bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-digidromen-cream">
              <thead className="bg-digidromen-cream/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Stad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-digidromen-cream bg-surface">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-digidromen-dark/40">
                      Geen organisaties.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-digidromen-cream/30">
                      <td className="px-6 py-4 text-sm font-semibold text-digidromen-dark">{org.name}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">
                        {orgTypeOptions.find((option) => option.value === org.type)?.label ?? org.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{org.city}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">
                        {org.contactName ? `${org.contactName} (${org.contactEmail ?? "-"})` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            org.active ? "bg-emerald-50 text-emerald-700" : "bg-digidromen-cream text-digidromen-dark/60"
                          }`}
                        >
                          {org.active ? "Actief" : "Inactief"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditOrgForm(org)}
                            className="rounded-lg p-1.5 text-digidromen-dark/40 hover:bg-digidromen-orange-light hover:text-digidromen-orange"
                            title="Bewerken"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => void handleDeleteOrg(org)}
                            disabled={orgDeletingId === org.id}
                            className="rounded-lg p-1.5 text-digidromen-dark/40 hover:bg-rose-50 hover:text-rose-500"
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

      {/* ============================================================ */}
      {/*  PRODUCTS TAB (staff + admin)                                 */}
      {/* ============================================================ */}
      {activeTab === "products" && isStaffOrAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-digidromen-dark">Producten</h3>
              <p className="text-sm text-digidromen-dark/60">
                Verwijderen maakt producten inactief zodat bestaande orders en voorraadkoppelingen leesbaar blijven.
              </p>
            </div>
            {isSupabase ? (
              <button
                onClick={openAddProductForm}
                className="flex items-center rounded-[20px] bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Package size={16} className="mr-2" />
                Product toevoegen
              </button>
            ) : null}
          </div>

          {productNotice ? <p className="text-sm text-emerald-600">{productNotice}</p> : null}
          {productError ? <p className="text-sm text-rose-600">{productError}</p> : null}

          {showProductForm ? (
            <div className="space-y-4 rounded-2xl border border-digidromen-cream bg-surface p-6 shadow-sm">
              <h4 className="font-bold text-digidromen-dark">{editingProductId ? "Product bewerken" : "Nieuw product"}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Productnaam"
                  className={formInputCls}
                />
                <input
                  value={productForm.sku}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder="SKU"
                  className={formInputCls}
                />
                <select
                  value={productForm.category}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                  className={formInputCls}
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
                  className={formInputCls}
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
                  className={formInputCls}
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
                  className={formInputCls}
                />
                <label className="flex items-center gap-3 rounded-xl border border-digidromen-cream bg-digidromen-cream/30 p-3 text-sm text-digidromen-dark/80">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-digidromen-cream text-digidromen-primary focus:ring-digidromen-primary"
                  />
                  Actief
                </label>
              </div>
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Beschrijving"
                rows={3}
                className={"w-full " + formInputCls}
              />
              <div className="flex gap-3">
                <LoadingButton
                  onClick={() => void handleSaveProduct()}
                  isLoading={productSaving}
                  loadingLabel="Opslaan..."
                  disabled={productSaving}
                  className="rounded-[20px] bg-digidromen-primary text-white"
                >
                  {editingProductId ? "Opslaan" : "Aanmaken"}
                </LoadingButton>
                <button
                  onClick={closeProductForm}
                  className="rounded-[20px] border border-digidromen-cream px-4 py-2 text-sm font-semibold text-digidromen-dark/60"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-digidromen-cream bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-digidromen-cream">
              <thead className="bg-digidromen-cream/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Naam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Categorie</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Voorraad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Gereserveerd</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-digidromen-dark/60">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-digidromen-cream bg-surface">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-digidromen-dark/40">
                      Geen producten.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-digidromen-cream/30">
                      <td className="px-6 py-4 text-sm font-semibold text-digidromen-dark">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">
                        {productCategoryOptions.find((option) => option.value === product.category)?.label ?? product.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{product.stockOnHand}</td>
                      <td className="px-6 py-4 text-sm text-digidromen-dark/60">{product.stockReserved}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.active ? "bg-emerald-50 text-emerald-700" : "bg-digidromen-cream text-digidromen-dark/60"
                          }`}
                        >
                          {product.active ? "Actief" : "Inactief"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditProductForm(product)}
                            className="rounded-lg p-1.5 text-digidromen-dark/40 hover:bg-digidromen-orange-light hover:text-digidromen-orange"
                            title="Bewerken"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => void handleDeleteProduct(product)}
                            disabled={productDeletingId === product.id}
                            className="rounded-lg p-1.5 text-digidromen-dark/40 hover:bg-rose-50 hover:text-rose-500"
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

      {/* ============================================================ */}
      {/*  BESTELVENSTER TAB (staff + admin)                            */}
      {/* ============================================================ */}
      {activeTab === "bestelvenster" && isStaffOrAdmin ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-digidromen-dark">Bestelvenster</h3>
          <div className="rounded-2xl border border-digidromen-cream bg-surface p-6 shadow-sm">
            <p className="mb-4 text-sm text-digidromen-dark/60">
              Hulporganisaties kunnen alleen bestellen tussen dag <strong className="text-digidromen-dark">{orderingWindowOpen}</strong> en dag <strong className="text-digidromen-dark">{orderingWindowClose}</strong> van elke maand.
              Buiten dit venster is de bestelknop geblokkeerd, tenzij je het venster hieronder handmatig opent.
            </p>
            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-digidromen-orange/20 bg-digidromen-orange-light/70 p-4">
              <input
                type="checkbox"
                checked={orderingWindowForceOpen}
                onChange={(e) => {
                  setOrderingWindowDirty(true);
                  setOrderingWindowForceOpen(e.target.checked);
                }}
                className="mt-1 h-4 w-4 rounded border-digidromen-cream text-digidromen-primary focus:ring-digidromen-primary"
              />
              <span className="text-sm text-digidromen-dark/80">
                <strong className="text-digidromen-dark">Bestelvenster handmatig open voor hulporganisaties</strong>
                <span className="mt-1 block text-digidromen-dark/60">
                  Zet dit aan om bugfixes door te voeren of buiten het vaste venster bestellingen van klanten toe te staan. Laat het uit om weer alleen het kalendervenster te gebruiken.
                </span>
              </span>
            </label>
            {orderingWindowError ? (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{orderingWindowError}</p>
            ) : null}
            {orderingWindowNotice ? (
              <p className="mb-3 rounded-xl bg-digidromen-orange-light px-4 py-3 text-sm text-digidromen-orange">{orderingWindowNotice}</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/40">
                  Openingsdag (dag v/d maand)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={orderingWindowOpen}
                  onChange={(e) => {
                    setOrderingWindowDirty(true);
                    setOrderingWindowOpen(parseInt(e.target.value, 10) || 1);
                  }}
                  className={formInputCls + " w-full"}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/40">
                  Sluitingsdag (dag v/d maand)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={orderingWindowClose}
                  onChange={(e) => {
                    setOrderingWindowDirty(true);
                    setOrderingWindowClose(parseInt(e.target.value, 10) || 7);
                  }}
                  className={formInputCls + " w-full"}
                />
              </div>
            </div>
            <button
              onClick={async () => {
                setOrderingWindowSaving(true);
                setOrderingWindowError(null);
                setOrderingWindowNotice(null);
                try {
                  const { data: currentRow, error: readErr } = await getSupabaseClient()
                    .from("portal_config")
                    .select("value")
                    .eq("key", "ordering_windows")
                    .single();
                  if (readErr) throw readErr;

                  const prev = (currentRow?.value ?? {}) as Record<string, unknown>;
                  const nextValue = {
                    ...prev,
                    open_day: orderingWindowOpen,
                    close_day: orderingWindowClose,
                    timezone:
                      typeof prev.timezone === "string"
                        ? prev.timezone
                        : "Europe/Amsterdam",
                    admin_bypass:
                      typeof prev.admin_bypass === "boolean"
                        ? prev.admin_bypass
                        : true,
                    force_open_help_org: orderingWindowForceOpen,
                  };

                  const { data: updated, error } = await getSupabaseClient()
                    .from("portal_config")
                    .update({
                      value: nextValue,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("key", "ordering_windows")
                    .select("value, updated_at")
                    .single();
                  if (error) throw error;
                  if (!updated) {
                    throw new Error(
                      "Opslaan mislukt: geen rij bijgewerkt (rechten of configuratie).",
                    );
                  }

                  queryClient.setQueryData(
                    queryKeys.portalConfig.key("ordering_windows"),
                    updated,
                  );
                  setOrderingWindowDirty(false);
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.orderingWindow.status(),
                  });
                  setOrderingWindowNotice("Bestelvenster opgeslagen.");
                } catch (err) {
                  setOrderingWindowError(translateError(err, "Fout bij opslaan."));
                } finally {
                  setOrderingWindowSaving(false);
                }
              }}
              disabled={orderingWindowSaving}
              className="mt-4 rounded-[20px] bg-digidromen-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {orderingWindowSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Settings;
