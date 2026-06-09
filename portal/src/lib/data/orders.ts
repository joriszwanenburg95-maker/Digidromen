/**
 * Order data access. Role-aware scoping lives here, not in pages.
 */
import { getSupabaseClient } from "../supabase";
import type { Role } from "../workflow";
import type { Database } from "../../types/database";

export type OrderListRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  | "id"
  | "status"
  | "organization_id"
  | "priority"
  | "preferred_delivery_date"
  | "created_at"
  | "assigned_service_partner_id"
> & {
  organizations: { name: string } | null;
  order_lines: Array<{
    quantity: number;
    line_type: string | null;
    rma_category: string | null;
    products: { name: string | null } | null;
  }>;
};

const LIST_SELECT =
  "id, status, organization_id, priority, preferred_delivery_date, created_at, assigned_service_partner_id, organizations!orders_organization_id_fkey(name), order_lines(quantity, line_type, rma_category, products(name))";

export interface OrderScope {
  role: Role;
  organizationId: string | undefined;
}

/**
 * List orders, scoped to what the caller is allowed to see.
 *
 * Returned rows are normalized: nested relations are reduced to plain shapes
 * matching `OrderListRow` so pages can render without further mapping.
 */
export async function listOrders(scope: OrderScope): Promise<OrderListRow[]> {
  if (
    (scope.role === "help_org" || scope.role === "service_partner") &&
    !scope.organizationId
  ) {
    return [];
  }

  const supabase = getSupabaseClient();
  let query = supabase.from("orders").select(LIST_SELECT).order("created_at", { ascending: false });

  if (scope.role === "help_org" && scope.organizationId) {
    query = query.eq("organization_id", scope.organizationId);
  } else if (scope.role === "service_partner" && scope.organizationId) {
    query = query.eq("assigned_service_partner_id", scope.organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((order) => {
    const organizationRelation = order.organizations as { name?: string | null } | null;
    const organization = organizationRelation?.name
      ? { name: organizationRelation.name }
      : null;
    const rawLines = order.order_lines as OrderListRow["order_lines"] | null | undefined;

    return {
      assigned_service_partner_id: order.assigned_service_partner_id,
      created_at: order.created_at,
      id: order.id,
      organization_id: order.organization_id,
      organizations: organization,
      order_lines: rawLines ?? [],
      preferred_delivery_date: order.preferred_delivery_date,
      priority: order.priority,
      status: order.status,
    };
  });
}

/** Count orders that need approval. Na de afslanking is dat status 'ingediend'. */
export async function countAwaitingApproval(): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "ingediend");
  if (error) throw error;
  return count ?? 0;
}
