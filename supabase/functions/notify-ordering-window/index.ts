// Stuurt één keer per maand een "het bestelvenster is open"-mail naar
// hulporganisaties, op de dag die in Instellingen staat (portal_config.ordering_windows.open_day).
// Bedoeld om dagelijks aangeroepen te worden via pg_cron; doet alleen iets op de openingsdag.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailConfigured, renderLayout, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://digidromenportal.vercel.app";

function amsterdamDateParts(): { day: number; month: number; year: number } {
  const fmt = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { day: get("day"), month: get("month"), year: get("year") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Met ?force=1 kun je handmatig testen, ongeacht de dag.
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!emailConfigured()) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "BREVO_API_KEY niet ingesteld" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Bestelvenster-config uit Instellingen.
    const { data: cfgRow } = await supabase
      .from("portal_config")
      .select("value")
      .eq("key", "ordering_windows")
      .single();
    const cfg = (cfgRow?.value ?? {}) as Record<string, unknown>;
    const openDay = Number(cfg.open_day ?? 1);
    const closeDay = Number(cfg.close_day ?? 7);
    const enabled = cfg.enabled === undefined ? true : Boolean(cfg.enabled);

    // Bestelvenster uitgeschakeld door beheer → geen openingsmail.
    if (!enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "bestelvenster staat uit (enabled=false)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { day, month, year } = amsterdamDateParts();
    if (!force && day !== openDay) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `vandaag (${day}) is niet de openingsdag (${openDay})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dedupeKey = `${year}-${String(month).padStart(2, "0")}`;

    // Actieve hulporganisaties → bijbehorende help_org-gebruikers.
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("type", "help_org")
      .eq("active", true);
    const orgIds = (orgs ?? []).map((o: { id: string }) => o.id);
    if (orgIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "geen actieve hulporganisaties" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: users } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("role", "help_org")
      .in("organization_id", orgIds);

    const emails = [
      ...new Set(
        (users ?? [])
          .map((u: { email: string | null }) => (u.email ?? "").trim().toLowerCase())
          .filter((e: string) => e.length > 0),
      ),
    ];

    // Al verstuurd deze maand?
    const { data: alreadySent } = await supabase
      .from("email_send_log")
      .select("recipient_email")
      .eq("email_type", "ordering_window_open")
      .eq("dedupe_key", dedupeKey);
    const sentSet = new Set(
      (alreadySent ?? []).map((r: { recipient_email: string }) => r.recipient_email),
    );

    const subject = "Het bestelvenster van Digidromen is open";
    const html = renderLayout({
      heading: "Het bestelvenster is open",
      intro: `Je kunt nu aanvragen plaatsen, tot en met dag ${closeDay} van de maand.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Vanaf vandaag kun je in de Digidromen webshop laptoppakketten en vervangingen aanvragen voor je organisatie.</p>
        <p style="margin:0 0 20px;">Wacht niet te lang: het venster sluit weer op dag ${closeDay} van de maand.</p>
        <a href="${PORTAL_URL}/orders" style="display:inline-block;background:#EE7219;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:14px;">Open de webshop</a>`,
      footnote: "Je ontvangt deze mail omdat je gebruiker bent van een hulporganisatie in de Digidromen portal.",
    });

    let sent = 0;
    for (const email of emails) {
      if (sentSet.has(email)) continue;
      try {
        await sendEmail({ to: email, subject, html });
        await supabase.from("email_send_log").insert({
          email_type: "ordering_window_open",
          dedupe_key: dedupeKey,
          recipient_email: email,
        });
        sent += 1;
      } catch (_err) {
        // Sla over; volgende run probeert opnieuw (nog niet gelogd).
      }
    }

    return new Response(
      JSON.stringify({ sent, candidates: emails.length, dedupeKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
