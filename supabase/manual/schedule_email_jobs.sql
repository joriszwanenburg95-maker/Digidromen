-- ════════════════════════════════════════════════════════════════════════
-- Go-live: plan de e-mailtaken met pg_cron.
-- NIET in de migrations-map: voer dit handmatig uit (Supabase SQL editor) NA:
--   1. domein geverifieerd in Brevo (SPF/DKIM) + afzenderadres geverifieerd
--   2. secrets gezet:  supabase secrets set BREVO_API_KEY=... EMAIL_FROM="Digidromen <bestellingen@digidromen.nl>" CRON_SECRET=<sterke-string>
--   3. functies gedeployed:
--        supabase functions deploy process-email-outbox --no-verify-jwt
--        supabase functions deploy notify-ordering-window --no-verify-jwt
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secrets in Vault (vervang de waarden; cron_secret == CRON_SECRET-functiesecret):
--   select vault.create_secret('https://oyxcwfozoxlgdclchden.supabase.co/functions/v1', 'edge_base_url');
--   select vault.create_secret('<zelfde-sterke-string-als-CRON_SECRET>', 'cron_secret');

-- Verzamelmail order-bevestigingen: elke 15 minuten.
select cron.unschedule('process-email-outbox') where exists (
  select 1 from cron.job where jobname = 'process-email-outbox'
);
select cron.schedule(
  'process-email-outbox',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/process-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Bestelvenster-open mail: dagelijks 07:00 UTC (de functie doet alleen iets op
-- de openingsdag uit Instellingen).
select cron.unschedule('notify-ordering-window') where exists (
  select 1 from cron.job where jobname = 'notify-ordering-window'
);
select cron.schedule(
  'notify-ordering-window',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/notify-ordering-window',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Controle:  select jobname, schedule, active from cron.job;
