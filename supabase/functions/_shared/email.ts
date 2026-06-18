// Gedeelde e-mailhelper: verzendt via Brevo (transactionele e-mail-API) en
// wikkelt content in een gebrande Digidromen-layout (inline styles i.v.m.
// e-mailclients).

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
// Afzender: stel in via secret EMAIL_FROM, bijv. "Digidromen <bestellingen@digidromen.nl>".
// Het e-mailadres moet een geverifieerde afzender/domein in Brevo zijn.
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Digidromen <bestellingen@digidromen.nl>";

/** Splits "Naam <adres@domein.nl>" (of een kaal adres) in naam + e-mail. */
function parseFrom(value: string): { name: string; email: string } {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1] || "Digidromen", email: match[2].trim() };
  }
  return { name: "Digidromen", email: value.trim() };
}

const BRAND = {
  orange: "#EE7219",
  dark: "#2E3848",
  cream: "#F5F0EB",
  warm: "#FBF4EB",
  yellow: "#FFD500",
};

export function emailConfigured(): boolean {
  return Boolean(BREVO_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY ontbreekt (zet de Supabase-secret).");
  }
  const sender = parseFrom(EMAIL_FROM);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo ${res.status}: ${text}`);
  }
}

/** HTML-escape voor gebruikersinvoer in templates. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Wikkel content in een gebrande, responsieve e-maillayout. */
export function renderLayout(opts: {
  heading: string;
  intro?: string;
  bodyHtml: string;
  footnote?: string;
}): string {
  return `<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.warm};font-family:Arial,Helvetica,sans-serif;color:${BRAND.dark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warm};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.cream};">
        <tr><td style="background:linear-gradient(135deg,#fff9ea 0%,#ffffff 70%);padding:24px 28px;border-bottom:1px solid ${BRAND.cream};">
          <div style="display:inline-block;background:${BRAND.yellow};color:${BRAND.dark};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">Digidromen</div>
          <h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;color:${BRAND.dark};">${esc(opts.heading)}</h1>
          ${opts.intro ? `<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#566074;">${esc(opts.intro)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6;color:${BRAND.dark};">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.cream};background:${BRAND.warm};font-size:12px;line-height:1.6;color:#8a93a3;">
          ${opts.footnote ? `${esc(opts.footnote)}<br><br>` : ""}
          Deze e-mail is automatisch verstuurd vanuit de Digidromen portal. Reageren is niet nodig.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export { BRAND };
