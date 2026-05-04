/**
 * Organization data access.
 */
import { getSupabaseClient } from "../supabase";
import type { Database } from "../../types/database";

export type OrganizationListRow = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "id" | "name" | "type" | "city" | "contact_email" | "contact_name" | "active"
>;

export type OrganizationType = Database["public"]["Enums"]["organization_type"];

export async function listOrganizations(): Promise<OrganizationListRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("organizations")
    .select("id, name, type, city, contact_email, contact_name, active")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  city: string;
  contact_name: string;
  contact_email: string;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("organizations")
    .insert({
      id: `org-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      type: input.type,
      city: input.city,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      active: true,
    });
  if (error) throw error;
}
