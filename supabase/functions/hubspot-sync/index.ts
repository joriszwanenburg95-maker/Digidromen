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

    const hubspotToken = Deno.env.get("HUBSPOT_API_TOKEN");
    if (!hubspotToken) {
      return new Response(
        JSON.stringify({ error: "HUBSPOT_API_TOKEN not configured", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch pending sync jobs (outbound only)
    const { data: jobs, error: fetchError } = await supabaseAdmin
      .from("crm_sync_jobs")
      .select("*")
      .eq("direction", "outbound")
      .in("state", ["queued", "retrying"])
      .order("created_at")
      .limit(50);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        // Determine HubSpot API endpoint based on entity_name
        let endpoint = "";
        let method = "POST";
        let hubspotBody: Record<string, unknown> = {};

        if (job.entity_name === "organization") {
          endpoint = job.hubspot_object_id
            ? `https://api.hubapi.com/crm/v3/objects/companies/${job.hubspot_object_id}`
            : "https://api.hubapi.com/crm/v3/objects/companies";
          method = job.hubspot_object_id ? "PATCH" : "POST";
          hubspotBody = {
            properties: {
              digidromen_id: job.case_id,
              ...(job.field_changes ?? {}),
            },
          };
        } else if (
          job.entity_name === "order" ||
          job.entity_name === "repair" ||
          job.entity_name === "donation"
        ) {
          endpoint = job.hubspot_object_id
            ? `https://api.hubapi.com/crm/v3/objects/deals/${job.hubspot_object_id}`
            : "https://api.hubapi.com/crm/v3/objects/deals";
          method = job.hubspot_object_id ? "PATCH" : "POST";
          hubspotBody = {
            properties: {
              dealname: `${job.entity_name}-${job.case_id}`,
              pipeline: "default",
              digidromen_id: job.case_id,
              digidromen_type: job.entity_name,
              ...(job.field_changes ?? {}),
            },
          };
        } else {
          throw new Error(`Unsupported entity_name: ${job.entity_name}`);
        }

        const hsResponse = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hubspotToken}`,
          },
          body: JSON.stringify(hubspotBody),
        });

        if (!hsResponse.ok) {
          const errorBody = await hsResponse.text();
          throw new Error(`HubSpot API error ${hsResponse.status}: ${errorBody}`);
        }

        const hsData = await hsResponse.json();

        // Mark as synced
        await supabaseAdmin
          .from("crm_sync_jobs")
          .update({
            state: "synced",
            hubspot_object_id: hsData.id ?? job.hubspot_object_id,
            hubspot_object_type: job.entity_name === "organization" ? "company" : "deal",
            last_successful_sync_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString(),
            failure_reason: null,
            retry_count: 0,
          })
          .eq("id", job.id);

        processed++;
      } catch (jobError: unknown) {
        const reason = jobError instanceof Error ? jobError.message : "Unknown error";
        const retryCount = (job.retry_count ?? 0) + 1;
        const newState = retryCount >= 3 ? "failed" : "retrying";

        await supabaseAdmin
          .from("crm_sync_jobs")
          .update({
            state: newState,
            failure_reason: reason,
            retry_count: retryCount,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: jobs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
