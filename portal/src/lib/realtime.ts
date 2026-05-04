import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";
import { supabase } from "./supabase";
import type { Role } from "./workflow";

export interface RealtimeScope {
  role: Role | null;
  organizationId: string | undefined;
}

/**
 * Subscribe to realtime changes, scoped per role to avoid unnecessary refetches.
 *
 * - help_org    → only orders for their own organization
 * - service_partner → only orders + donations assigned to their org
 * - staff/admin → unfiltered (sees everything)
 */
export function initRealtime(
  queryClient: QueryClient,
  scope: RealtimeScope,
): () => void {
  if (!supabase) return () => {};
  if (!scope.role) return () => {};
  if (
    (scope.role === "help_org" || scope.role === "service_partner") &&
    !scope.organizationId
  ) {
    return () => {};
  }

  const ordersFilter = (() => {
    if (scope.role === "help_org" && scope.organizationId) {
      return `organization_id=eq.${scope.organizationId}`;
    }
    if (scope.role === "service_partner" && scope.organizationId) {
      return `assigned_service_partner_id=eq.${scope.organizationId}`;
    }
    return undefined;
  })();

  const donationsFilter =
    scope.role === "service_partner" && scope.organizationId
      ? `assigned_service_partner_id=eq.${scope.organizationId}`
      : undefined;

  // help_org users only need their own order changes in the storefront view.
  const subscribeToDonations = scope.role !== "help_org";
  const subscribeToOperationalStreams = scope.role !== "help_org";

  const ordersChannel = supabase
    .channel(`orders-changes-${scope.role ?? "anon"}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", ...(ordersFilter ? { filter: ordersFilter } : {}) },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      },
    )
    .subscribe();

  const donationsChannel = subscribeToDonations
    ? supabase
        .channel(`donations-changes-${scope.role ?? "anon"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donation_batches",
            ...(donationsFilter ? { filter: donationsFilter } : {}),
          },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
          },
        )
        .subscribe()
    : null;

  const inventoryChannel = subscribeToOperationalStreams
    ? supabase
        .channel("inventory-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory_items" },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
          },
        )
        .subscribe()
    : null;

  const notificationsChannel = subscribeToOperationalStreams
    ? supabase
        .channel("notifications-changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.all,
            });
          },
        )
        .subscribe()
    : null;

  const workflowChannel = subscribeToOperationalStreams
    ? supabase
        .channel("workflow-events-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "workflow_events" },
          () => {
            queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
          },
        )
        .subscribe()
    : null;

  return () => {
    supabase.removeChannel(ordersChannel);
    if (donationsChannel) supabase.removeChannel(donationsChannel);
    if (inventoryChannel) supabase.removeChannel(inventoryChannel);
    if (notificationsChannel) supabase.removeChannel(notificationsChannel);
    if (workflowChannel) supabase.removeChannel(workflowChannel);
  };
}
