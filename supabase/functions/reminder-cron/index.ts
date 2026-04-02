import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const notifications: Array<{
      id: string;
      title: string;
      body: string;
      level: "info" | "warning" | "error" | "success";
      channel: "portal" | "system" | "email";
      related_case_type?: "order" | "repair" | "donation";
      related_case_id?: string;
      created_at: string;
    }> = [];

    const now = new Date().toISOString();

    // 1. Low stock alerts — products with stock_on_hand <= low_stock_threshold
    const { data: lowStockProducts } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_on_hand, low_stock_threshold")
      .eq("active", true)
      .eq("category", "laptop");

    for (const product of lowStockProducts ?? []) {
      const threshold = product.low_stock_threshold ?? 5;
      if ((product.stock_on_hand ?? 0) <= threshold) {
        notifications.push({
          id: crypto.randomUUID(),
          title: `Lage voorraad: ${product.name}`,
          body: `Nog ${product.stock_on_hand ?? 0} op voorraad (drempel: ${threshold})`,
          level: "warning",
          channel: "portal",
          created_at: now,
        });
      }
    }

    // 2. Orders open > 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: staleOrders } = await supabaseAdmin
      .from("orders")
      .select("id, status, created_at")
      .not("status", "in", "(AFGESLOTEN,GEANNULEERD,GELEVERD)")
      .lt("created_at", fourteenDaysAgo);

    for (const order of staleOrders ?? []) {
      notifications.push({
        id: crypto.randomUUID(),
        title: "Order langer dan 14 dagen open",
        body: `Order ${order.id} staat al sinds ${new Date(order.created_at).toLocaleDateString("nl-NL")} open met status ${order.status}`,
        level: "warning",
        channel: "portal",
        related_case_type: "order",
        related_case_id: order.id,
        created_at: now,
      });
    }

    // 3. Repairs without update > 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: staleRepairs } = await supabaseAdmin
      .from("repair_cases")
      .select("id, status, updated_at")
      .not("status", "in", "(AFGESLOTEN,RETOUR,IRREPARABEL)")
      .lt("updated_at", sevenDaysAgo);

    for (const repair of staleRepairs ?? []) {
      notifications.push({
        id: crypto.randomUUID(),
        title: "Reparatie zonder update > 7 dagen",
        body: `Repair ${repair.id} (${repair.status}) geen update sinds ${new Date(repair.updated_at).toLocaleDateString("nl-NL")}`,
        level: "info",
        channel: "portal",
        related_case_type: "repair",
        related_case_id: repair.id,
        created_at: now,
      });
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ created: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
