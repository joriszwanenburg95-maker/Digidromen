/**
 * Single source for converting raw exceptions / Supabase errors / Postgres
 * trigger messages into Dutch user-friendly text.
 *
 * Used by every form's catch-block. Add new patterns here, never inline.
 */

type AnyError = unknown;

interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function asSupabaseError(err: AnyError): SupabaseLikeError | null {
  if (!err || typeof err !== "object") return null;
  return err as SupabaseLikeError;
}

/** Extract a raw message string from any error shape. */
export function rawMessage(err: AnyError): string {
  if (err instanceof Error) return err.message;
  const sb = asSupabaseError(err);
  if (sb?.message) return sb.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Onbekende fout";
  }
}

/** Domain-specific Postgres trigger messages → user-friendly Dutch. */
const TRIGGER_PATTERNS: Array<{ test: RegExp; message: string }> = [
  {
    test: /Voedingskabel defect vereist/i,
    message:
      "Voedingskabel: het serienummer (SRN) van de laptop ontbreekt, of connectortype en wattage zijn niet beide ingevuld. Vul alle drie in en dien opnieuw in.",
  },
  {
    test: /Laptop defect vereist/i,
    message: "Laptopvervanging: serienummer en klachtomschrijving zijn verplicht.",
  },
  {
    test: /Accessoire-vervanging|Muis\/rugzak vervanging|Headset-vervanging|Powerbank defect vereist/i,
    message:
      "Accessoirevervanging: de bestelling kon niet worden verwerkt. Vernieuw de pagina en probeer opnieuw; neem contact op met support als het blijft optreden.",
  },
];

/** Generic Postgres error codes → friendly text. */
function fromPostgresCode(code: string | undefined, msg: string): string | null {
  switch (code) {
    case "23505":
      return "Deze waarde bestaat al. Controleer of je dezelfde gegevens niet eerder hebt ingevoerd.";
    case "23502":
      return "Een verplicht veld is leeg. Controleer alle velden met een sterretje.";
    case "23503":
      return "De gekoppelde gegevens zijn niet (meer) geldig. Vernieuw de pagina en probeer opnieuw.";
    case "23514":
      return "De ingevoerde waarde voldoet niet aan de regels. Controleer het formulier.";
    case "42501":
    case "PGRST301":
      return "Je hebt geen rechten voor deze actie. Neem contact op met een beheerder.";
    case "PGRST116":
      return "Niet gevonden. Vernieuw de pagina en probeer opnieuw.";
    default:
      return null;
  }
}

const RLS_PATTERN = /row-level security|RLS/i;
const JWT_PATTERN = /jwt|token (is )?expired/i;
const NETWORK_PATTERN = /network|fetch|failed to fetch/i;
const AUTH_SESSION_PATTERN = /auth session missing|session.*missing|no current user/i;
const AUTH_LINK_PATTERN = /otp.*expired|email link.*invalid|magic link.*invalid|invalid.*flow|flow state|pkce|code verifier|refresh token/i;
const MIME_PATTERN = /valid JavaScript MIME type|Failed to fetch dynamically imported module/i;

/**
 * Translate any error into Dutch user-facing text.
 *
 * @param err   The raw error (Error, Supabase error, string, ...)
 * @param fallback Text shown if no pattern matches.
 */
export function translateError(
  err: AnyError,
  fallback = "Er is iets misgegaan. Probeer het opnieuw of neem contact op met support.",
): string {
  const msg = rawMessage(err).trim();
  if (!msg) return fallback;

  for (const pattern of TRIGGER_PATTERNS) {
    if (pattern.test.test(msg)) return pattern.message;
  }

  const sb = asSupabaseError(err);
  const codeMatch = fromPostgresCode(sb?.code, msg);
  if (codeMatch) return codeMatch;

  if (RLS_PATTERN.test(msg)) {
    return "Je hebt geen rechten voor deze actie. Neem contact op met een beheerder.";
  }
  if (AUTH_LINK_PATTERN.test(msg)) {
    return "Deze login-link is verlopen of al gebruikt. Vraag een nieuwe magic link aan.";
  }
  if (AUTH_SESSION_PATTERN.test(msg)) {
    return "Je sessie kon niet worden gevonden. Log opnieuw in.";
  }
  if (JWT_PATTERN.test(msg)) {
    return "Je sessie is verlopen. Log opnieuw in.";
  }
  if (MIME_PATTERN.test(msg)) {
    return "De portal is net bijgewerkt. Laad de pagina opnieuw om de nieuwste versie te openen.";
  }
  if (NETWORK_PATTERN.test(msg)) {
    return "Geen verbinding. Controleer je internet en probeer opnieuw.";
  }

  return msg.length > 200 ? fallback : msg;
}
