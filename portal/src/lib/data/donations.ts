/**
 * Donation data access. Role-aware scoping lives here.
 */
import { getSupabaseClient } from "../supabase";
import type { Role } from "../workflow";
import type { Database } from "../../types/database";

export type DonationListRow = Pick<
  Database["public"]["Tables"]["donation_batches"]["Row"],
  | "id"
  | "status"
  | "device_count_promised"
  | "pickup_date"
  | "created_at"
  | "assigned_service_partner_id"
> & {
  organizations: { name: string } | null;
};

const LIST_SELECT =
  "id, status, sponsor_organization_id, device_count_promised, pickup_date, created_at, assigned_service_partner_id, organizations!donation_batches_sponsor_organization_id_fkey(name)";

function normalizeOrganization(input: unknown): { name: string } | null {
  return input && typeof input === "object" && "name" in input && typeof (input as { name: unknown }).name === "string"
    ? { name: (input as { name: string }).name }
    : null;
}

export interface DonationScope {
  role: Role;
  organizationId: string | undefined;
}

/**
 * List donations, scoped by role.
 *
 * - service_partner: only batches assigned to their org
 * - help_org: not used (help_orgs do not see donations); returns []
 * - staff/admin: all
 */
export async function listDonations(scope: DonationScope): Promise<DonationListRow[]> {
  if (scope.role === "help_org") return [];
  if (scope.role === "service_partner" && !scope.organizationId) return [];

  const supabase = getSupabaseClient();
  let query = supabase.from("donation_batches").select(LIST_SELECT).order("created_at", { ascending: false });

  if (scope.role === "service_partner" && scope.organizationId) {
    query = query.eq("assigned_service_partner_id", scope.organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    device_count_promised: row.device_count_promised,
    pickup_date: row.pickup_date,
    created_at: row.created_at,
    assigned_service_partner_id: row.assigned_service_partner_id,
    organizations: normalizeOrganization(row.organizations),
  }));
}

/** Donor organisations available as the source of a donation batch. */
export async function listDonorOrganizations(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await getSupabaseClient()
    .from("organizations")
    .select("id, name")
    .eq("type", "sponsor")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
