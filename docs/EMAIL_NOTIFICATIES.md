# E-mailnotificaties

Twee soorten mails, beide via **Resend**:

1. **Order-bevestiging** — gebundeld per besteller. Bij indienen zet een DB-trigger
   een regel in `email_outbox`. De edge function `process-email-outbox` draait elke
   ~15 min en stuurt één verzamelmail per besteller voor alle openstaande
   bevestigingen. Meerdere bestellingen vlak na elkaar → één mail.
2. **Bestelvenster open** — `notify-ordering-window` draait dagelijks en mailt
   hulporganisaties op de openingsdag uit Instellingen
   (`portal_config.ordering_windows.open_day`). Dedupe via `email_send_log`
   (één keer per maand per ontvanger).

## Onderdelen

| Onderdeel | Locatie |
|---|---|
| Wachtrij + trigger + log | `supabase/migrations/20260609140000_email_outbox.sql` (toegepast) |
| Verzendhelper + template | `supabase/functions/_shared/email.ts` |
| Verzamelmail-verwerker | `supabase/functions/process-email-outbox/` |
| Bestelvenster-mail | `supabase/functions/notify-ordering-window/` |
| Cron-planning (handmatig) | `supabase/manual/schedule_email_jobs.sql` |

## Go-live (eenmalig)

1. **Domein verifiëren** in Resend (bijv. `digidromen.nl`) en een API-key maken.
2. **Secrets zetten:**
   ```bash
   supabase secrets set \
     RESEND_API_KEY=re_xxx \
     EMAIL_FROM="Digidromen <bestellingen@digidromen.nl>" \
     CRON_SECRET=<sterke-willekeurige-string> \
     PORTAL_URL=https://digidromenportal.vercel.app
   ```
3. **Functies deployen:**
   ```bash
   supabase functions deploy process-email-outbox --no-verify-jwt
   supabase functions deploy notify-ordering-window --no-verify-jwt
   ```
4. **Plannen:** voer `supabase/manual/schedule_email_jobs.sql` uit (zet eerst de twee
   Vault-secrets `edge_base_url` en `cron_secret` zoals bovenin dat bestand staat).

## Testen
- Verzamelmail nu draaien: `curl -X POST .../functions/v1/process-email-outbox -H "x-cron-secret: <CRON_SECRET>"`
- Bestelvenster-mail forceren: `.../functions/v1/notify-ordering-window?force=1` (met `x-cron-secret`).

Zonder `RESEND_API_KEY` doen de functies niets (ze geven `skipped` terug) — veilig.
