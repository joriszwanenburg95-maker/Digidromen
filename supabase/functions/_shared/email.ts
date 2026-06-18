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

// Digidromen-huisstijl (afgeleid van de nieuwsbrief-template).
const BRAND = {
  orange: "#EE7219",
  yellow: "#FFD500",
  dark: "#1F2D3D",
  body: "#3b3f44",
  cream: "#FBF4EB",
  blue: "#87CEDC",
  logo: "https://img.mailinblue.com/10757710/images/content_library/original/69ca29ca15d68402165c094e.png",
  logoFooter: "https://img.mailinblue.com/10757710/images/content_library/original/69e08d08e35f98d3cd0dbf4a.png",
  facebookIcon: "https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/facebook_32px.png",
  linkedinIcon: "https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png",
  facebookUrl: "https://www.facebook.com/people/Digidromen/61558772872416/",
  linkedinUrl: "https://www.linkedin.com/company/digidromen/",
  siteUrl: "https://www.digidromen.nl",
  address: "Europalaan 28D, 5232 BC, 's-Hertogenbosch",
  phone: "073 203 27 45",
  headingFont: "'Sora', Arial, sans-serif",
  bodyFont: "'Roboto', Arial, sans-serif",
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

/** Gebrande geel/oranje CTA-knop (huisstijl). Geef rauwe, vertrouwde URL mee. */
export function renderButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 4px;"><tr><td align="center" bgcolor="${BRAND.yellow}" style="border-radius:15px;border:1px solid ${BRAND.orange};">
    <a href="${url}" target="_blank" style="display:inline-block;padding:12px 26px;font-family:${BRAND.bodyFont};font-size:16px;font-weight:bold;color:#000000;text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;
}

/** Wikkel content in een gebrande, responsieve e-maillayout (Digidromen-huisstijl). */
export function renderLayout(opts: {
  heading: string;
  intro?: string;
  bodyHtml: string;
  footnote?: string;
  cta?: { label: string; url: string };
}): string {
  return `<!doctype html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if !mso]><!--><style>@import url("https://fonts.googleapis.com/css2?family=Roboto&family=Sora&display=swap");</style><!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${BRAND.bodyFont};color:${BRAND.body};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;width:100%;">
    <tr><td align="center" style="padding:0;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;">
        <!-- Logo -->
        <tr><td align="center" style="padding:24px 15px 8px;">
          <img src="${BRAND.logo}" width="200" alt="Digidromen" style="display:block;width:200px;max-width:60%;border:0;">
        </td></tr>
        <!-- Kop -->
        <tr><td align="center" style="padding:8px 24px 0;">
          <h1 style="margin:0;font-family:${BRAND.headingFont};font-size:30px;font-weight:400;line-height:1.25;color:${BRAND.orange};">${esc(opts.heading)}</h1>
          ${opts.intro ? `<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:${BRAND.body};">${esc(opts.intro)}</p>` : ""}
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:20px 24px 4px;font-size:16px;line-height:1.6;color:${BRAND.body};">
          ${opts.bodyHtml}
        </td></tr>
        ${opts.cta ? `<tr><td align="center" style="padding:8px 24px 4px;">${renderButton(opts.cta.label, opts.cta.url)}</td></tr>` : ""}
        <!-- Divider -->
        <tr><td style="padding:24px 24px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px dashed ${BRAND.orange};font-size:1px;line-height:1px;"><tr><td>&nbsp;</td></tr></table>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:4px 24px 28px;font-size:13px;line-height:1.6;color:${BRAND.body};">
          <img src="${BRAND.logo}" width="140" alt="Digidromen" style="display:block;margin:0 auto 12px;width:140px;border:0;">
          <p style="margin:0;font-size:13px;color:${BRAND.body};">${BRAND.address}</p>
          <p style="margin:4px 0 0;font-size:13px;"><span style="color:${BRAND.orange};">${BRAND.phone}</span> &middot; <a href="${BRAND.siteUrl}" style="color:${BRAND.orange};text-decoration:underline;">digidromen.nl</a></p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;"><tr>
            <td style="padding:0 6px;"><a href="${BRAND.facebookUrl}" target="_blank"><img src="${BRAND.facebookIcon}" width="28" alt="Facebook" style="display:block;border:0;"></a></td>
            <td style="padding:0 6px;"><a href="${BRAND.linkedinUrl}" target="_blank"><img src="${BRAND.linkedinIcon}" width="28" alt="LinkedIn" style="display:block;border:0;"></a></td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:12px;color:#8a93a3;">
            ${opts.footnote ? `${esc(opts.footnote)}<br>` : ""}
            Deze e-mail is automatisch verstuurd vanuit de Digidromen portal. Reageren is niet nodig.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export { BRAND };
