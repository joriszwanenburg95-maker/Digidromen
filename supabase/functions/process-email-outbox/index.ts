// Bundelt openstaande order-bevestigingen per besteller tot één verzamelmail.
// Bedoeld om periodiek (bijv. elke 15 min) aangeroepen te worden via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailConfigured, esc, renderLayout, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Regels ouder dan dit worden niet meer gemaild (voorkomt backlog-spam).
const MAX_AGE_HOURS = 48;
const MAX_ATTEMPTS = 5;

interface OutboxRow {
  id: string;
  recipient_email: string;
  order_id: string | null;
  created_at: string;
  attempts: number;
}

function lineLabel(line: {
  quantity: number;
  rma_category: string | null;
  line_type: string;
  products?: { name?: string | null } | null;
}): string {
  const name = line.products?.name ?? (line.rma_category ? `Vervanging ${line.rma_category}` : "Product");
  const qty = line.quantity && line.quantity > 1 ? `${line.quantity}× ` : "";
  return `${qty}${name}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Eenvoudige cron-beveiliging: vereis x-cron-secret als CRON_SECRET is gezet.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!emailConfigured()) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "RESEND_API_KEY niet ingesteld" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 3_600_000).toISOString();

    // Markeer te oude openstaande regels als 'skipped'.
    await supabase
      .from("email_outbox")
      .update({ status: "skipped", last_error: "ouder dan 48u bij verwerking" })
      .eq("status", "pending")
      .eq("email_type", "order_confirmation")
      .lt("created_at", cutoff);

    // Haal verse openstaande regels op.
    const { data: pending, error: pendingError } = await supabase
      .from("email_outbox")
      .select("id, recipient_email, order_id, created_at, attempts")
      .eq("status", "pending")
      .eq("email_type", "order_confirmation")
      .gte("created_at", cutoff)
      .order("recipient_email", { ascending: true })
      .order("created_at", { ascending: true });
    if (pendingError) throw pendingError;

    const rows = (pending ?? []) as OutboxRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, recipients: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Groepeer per ontvanger.
    const byRecipient = new Map<string, OutboxRow[]>();
    for (const row of rows) {
      const list = byRecipient.get(row.recipient_email) ?? [];
      list.push(row);
      byRecipient.set(row.recipient_email, list);
    }

    let sentCount = 0;
    let recipientCount = 0;

    for (const [email, group] of byRecipient) {
      const orderIds = [...new Set(group.map((g) => g.order_id).filter(Boolean))] as string[];

      // Haal orderdetails op.
      const { data: orders } = await supabase
        .from("orders")
        .select(
          "id, status, created_at, preferred_delivery_date, order_lines(quantity, rma_category, line_type, products(name))",
        )
        .in("id", orderIds);

      const orderCards = (orders ?? [])
        .map((o: Record<string, unknown>) => {
          const lines = (o.order_lines as Array<Record<string, unknown>> | null) ?? [];
          const items = lines
            .map((l) => `<li style="margin:2px 0;">${esc(lineLabel(l as never))}</li>`)
            .join("");
          const created = o.created_at
            ? new Date(o.created_at as string).toLocaleDateString("nl-NL")
            : "";
          const shortId = String(o.id).slice(0, 8);
          return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #F5F0EB;border-radius:14px;">
              <tr><td style="padding:14px 16px;">
                <div style="font-size:12px;color:#8a93a3;">Aanvraag ${esc(shortId)} · ${esc(created)}</div>
                <ul style="margin:8px 0 0;padding-left:18px;font-size:14px;color:#2E3848;">${items || "<li>—</li>"}</ul>
              </td></tr>
            </table>`;
        })
        .join("");

      const count = orderIds.length;
      const subject =
        count === 1
          ? "Bevestiging van je aanvraag bij Digidromen"
          : `Bevestiging van je ${count} aanvragen bij Digidromen`;

      const html = renderLayout({
        heading:
          count === 1 ? "We hebben je aanvraag ontvangen" : `We hebben je ${count} aanvragen ontvangen`,
        intro:
          "Bedankt voor je aanvraag. Digidromen beoordeelt de aanvraag; de status volg je in de portal.",
        bodyHtml:
          orderCards +
          `<p style="margin:16px 0 0;font-size:14px;color:#566074;">Je kunt de status van je aanvragen altijd terugvinden in de Digidromen webshop onder je eigen organisatie.</p>`,
        footnote: "Je ontvangt deze mail omdat je een aanvraag hebt geplaatst in de Digidromen portal.",
      });

      try {
        await sendEmail({ to: email, subject, html });
        const ids = group.map((g) => g.id);
        await supabase
          .from("email_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", ids);
        sentCount += ids.length;
        recipientCount += 1;
      } catch (sendErr) {
        const message = sendErr instanceof Error ? sendErr.message : "verzendfout";
        for (const g of group) {
          const attempts = (g.attempts ?? 0) + 1;
          await supabase
            .from("email_outbox")
            .update({
              attempts,
              last_error: message,
              status: attempts >= MAX_ATTEMPTS ? "error" : "pending",
            })
            .eq("id", g.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, recipients: recipientCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
