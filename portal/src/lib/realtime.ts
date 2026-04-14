import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";
import { supabase } from "./supabase";

export function initRealtime(queryClient: QueryClient): () => void {
  if (!supabase) return () => {};

  const ordersChannel = supabase
    .channel("orders-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      },
    )
    .subscribe();

  const donationsChannel = supabase
    .channel("donations-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "donation_batches" },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
      },
    )
    .subscribe();

  const inventoryChannel = supabase
    .channel("inventory-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inventory_items" },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      },
    )
    .subscribe();

  const notificationsChannel = supabase
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
    .subscribe();

  const workflowChannel = supabase
    .channel("workflow-events-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "workflow_events" },
      () => {
        queryClient.invalidateQueries({ queryKey: ["workflow-events"] });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(ordersChannel);
    supabase.removeChannel(donationsChannel);
    supabase.removeChannel(inventoryChannel);
    supabase.removeChannel(notificationsChannel);
    supabase.removeChannel(workflowChannel);
  };
}
