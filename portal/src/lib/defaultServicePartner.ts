/**
 * Standaard servicepartner (Aces Direct) voor orders en donaties.
 * Live default staat ook in `portal_config.default_service_partner_organization_id` (via migratie);
 * admins kunnen die key aanpassen; triggers vullen NULL-waarden bij insert/update.
 */
export const DEFAULT_SERVICE_PARTNER_ORG_ID = "org-aces-direct";
