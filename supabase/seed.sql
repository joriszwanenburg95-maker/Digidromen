truncate table
  public.notification_role_scope,
  public.notifications,
  public.documents,
  public.messages,
  public.workflow_events,
  public.order_lines,
  public.orders,
  public.repair_cases,
  public.inventory_items,
  public.products,
  public.donation_batches,
  public.crm_sync_jobs,
  public.user_profiles,
  public.organizations
restart identity cascade;

insert into public.organizations (id, name, type, city, contact_name, contact_email, active, crm_relation_id) values
  ('org-digidromen', 'Digidromen', 'digidromen', 'Den Bosch', 'Karin van der Leest', 'karin@digidromen.nl', true, null),
  ('org-help-amsterdam', 'Jeugdfonds Amsterdam', 'help_org', 'Amsterdam', 'Sanne de Vries', 'sanne@jeugdfonds.nl', true, null),
  ('org-help-rotterdam', 'Buurtteam Rotterdam Zuid', 'help_org', 'Rotterdam', 'Mourad El Idrissi', 'mourad@buurtteam.nl', true, null),
  ('org-help-eindhoven', 'Stichting Leerkans Eindhoven', 'help_org', 'Eindhoven', 'Linda van Dijk', 'linda@leerkans.nl', true, null),
  ('org-servicepartner', 'Aces Direct Service Desk', 'service_partner', 'Tilburg', 'Tom van Aalst', 'tom@acesdirect.nl', true, null),
  ('org-sponsor-techforgood', 'Tech for Good BV', 'sponsor', 'Utrecht', 'Eva Bos', 'impact@techforgood.nl', true, null),
  ('org-sponsor-nexbyte', 'Nexbyte Nederland', 'sponsor', 'Amersfoort', 'Job Meurs', 'donaties@nexbyte.nl', true, null);

insert into public.user_profiles (id, auth_user_id, organization_id, role, name, email, title, avatar_label) values
  ('user-help-amsterdam', null, 'org-help-amsterdam', 'help_org', 'Sanne de Vries', 'sanne@jeugdfonds.nl', 'Coordinatie', 'SD'),
  ('user-help-rotterdam', null, 'org-help-rotterdam', 'help_org', 'Mourad El Idrissi', 'mourad@buurtteam.nl', 'Maatschappelijk werker', 'ME'),
  ('user-help-eindhoven', null, 'org-help-eindhoven', 'help_org', 'Linda van Dijk', 'linda@leerkans.nl', 'Projectleider', 'LD'),
  ('user-digidromen-staff', null, 'org-digidromen', 'digidromen_staff', 'Noah Janssen', 'operations@digidromen.nl', 'Operations', 'NJ'),
  ('user-digidromen-admin', null, 'org-digidromen', 'digidromen_admin', 'Karin van der Leest', 'karin@digidromen.nl', 'Beheer', 'KL'),
  ('user-service-partner', null, 'org-servicepartner', 'service_partner', 'Tom van Aalst', 'tom@acesdirect.nl', 'Fulfilment lead', 'TV'),
  ('user-digidromen-pauline', null, 'org-digidromen', 'digidromen_staff', 'Pauline', 'pauline@digidromen.nl', 'Operations', 'PA'),
  ('user-joris-eyeti', null, 'org-digidromen', 'digidromen_admin', 'Joris Zwanenburg', 'joris.zwanenburg@eyeti.nl', 'Platform beheer', 'JZ');

insert into public.products (id, sku, name, category, description, stock_on_hand, stock_reserved, specification_summary, active) values
  ('product-laptop', 'LAPTOP-CANONICAL', 'Laptop', 'laptop', 'Geaggregeerde laptopvoorraad voor uitlevering en service.', 34, 3, '{"Laptop"}', true);

insert into public.inventory_items (id, product_id, serial_number, warehouse_location, condition, quantity, available_quantity, incoming_quantity, incoming_eta, last_mutation_at) values
  ('inventory-laptop-a1', 'product-laptop', null, 'Tilburg-A1', 'refurbished', 24, 20, 4, '2026-03-18', '2026-03-09T16:00:00.000Z'),
  ('inventory-laptop-buffer', 'product-laptop', null, 'Tilburg-Buffer', 'reserved', 10, 7, 2, '2026-03-20', '2026-03-09T15:30:00.000Z'),
  ('inventory-laptop-repair', 'product-laptop', null, 'Tilburg-Repair', 'in_repair', 0, 0, 0, null, '2026-03-09T08:25:00.000Z');

insert into public.orders (id, organization_id, requester_user_id, status, priority, preferred_delivery_date, requested_at, motivation, delivery_address, stock_badge, assigned_service_partner_id, crm_case_id) values
  ('order-1001', 'org-help-amsterdam', 'user-help-amsterdam', 'IN_BEHANDELING', 'high', '2026-03-17', '2026-03-02T08:30:00.000Z', 'Nieuwe uitgifte voor vijf brugklasleerlingen.', 'Wibautstraat 101, 1091 GL Amsterdam', 'limited', 'org-servicepartner', null),
  ('order-1002', 'org-help-rotterdam', 'user-help-rotterdam', 'IN_VOORBEREIDING', 'urgent', '2026-03-12', '2026-03-04T11:10:00.000Z', 'Spoeduitvraag voor twee examenkandidaten.', 'Putselaan 12, 3074 JB Rotterdam', 'limited', 'org-servicepartner', null),
  ('order-1003', 'org-help-eindhoven', 'user-help-eindhoven', 'VERZONDEN', 'normal', '2026-03-08', '2026-03-01T15:10:00.000Z', 'Aanvulling voor drie leerlingen in bovenbouw.', 'Kanaaldijk 4, 5611 AC Eindhoven', 'in_stock', 'org-servicepartner', null);

insert into public.order_lines (id, order_id, product_id, quantity) values
  ('orderline-1001-1', 'order-1001', 'product-laptop', 5),
  ('orderline-1002-1', 'order-1002', 'product-laptop', 2),
  ('orderline-1003-1', 'order-1003', 'product-laptop', 3);

insert into public.repair_cases (id, organization_id, requester_user_id, status, subtype, serial_number, issue_type, notes, photo_placeholder_count, received_at, assigned_service_partner_id) values
  ('repair-2001', 'org-help-amsterdam', 'user-help-amsterdam', 'DIAGNOSE', 'GENERAL_REPAIR', 'DL-14002', 'battery', 'Laptop valt na 20 minuten uit.', 2, '2026-03-06T09:15:00.000Z', 'org-servicepartner'),
  ('repair-2002', 'org-help-rotterdam', 'user-help-rotterdam', 'IN_REPARATIE', 'GENERAL_REPAIR', 'TP-13002', 'screen', 'Scherm flikkert en toont strepen.', 1, '2026-03-04T16:10:00.000Z', 'org-servicepartner');

insert into public.donation_batches (id, sponsor_organization_id, status, device_count_promised, pickup_address, pickup_contact_name, pickup_contact_email, pickup_window, registered_at, assigned_service_partner_id, refurbish_ready_count, rejected_count, notes) values
  ('donation-3001', 'org-sponsor-techforgood', 'OPHAALAFSPRAAK_GEPLAND', 24, 'Dataweg 8, 3528 BG Utrecht', 'Eva Bos', 'impact@techforgood.nl', '2026-03-12 ochtend', '2026-03-04T10:00:00.000Z', 'org-servicepartner', null, null, 'Kantoorvervanging Q1.'),
  ('donation-3002', 'org-sponsor-nexbyte', 'IN_VERWERKING', 18, 'Stationsplein 1, 3818 LE Amersfoort', 'Job Meurs', 'donaties@nexbyte.nl', '2026-03-06 middag', '2026-03-02T11:25:00.000Z', 'org-servicepartner', null, null, 'Batch na office refresh.'),
  ('donation-3003', 'org-sponsor-techforgood', 'OP_VOORRAAD', 15, 'Dataweg 8, 3528 BG Utrecht', 'Eva Bos', 'impact@techforgood.nl', '2026-02-26 middag', '2026-03-01T12:00:00.000Z', 'org-servicepartner', 12, 3, 'Batch al afgerond en toegevoegd aan voorraad.');

insert into public.workflow_events (id, case_type, case_id, status, title, description, created_at, actor_role, actor_name, metadata) values
  ('order-1001-event-1', 'order', 'order-1001', 'INGEDIEND', 'Aanvraag ingediend', 'Orderaanvraag voor 5 laptops ontvangen.', '2026-03-02T08:30:00.000Z', 'help_org', 'Sanne de Vries', '{"actorUserId":"user-help-amsterdam"}'),
  ('order-1001-event-2', 'order', 'order-1001', 'BEOORDEELD', 'Aanvraag beoordeeld', 'Aanvraag is compleet en akkoord bevonden.', '2026-03-03T09:20:00.000Z', 'digidromen_staff', 'Noah Janssen', '{"actorUserId":"user-digidromen-staff"}'),
  ('repair-2001-event-1', 'repair', 'repair-2001', 'ONTVANGEN', 'Reparatieverzoek ontvangen', 'Batterijprobleem gemeld.', '2026-03-06T09:15:00.000Z', 'help_org', 'Sanne de Vries', '{"actorUserId":"user-help-amsterdam"}'),
  ('donation-3001-event-1', 'donation', 'donation-3001', 'TOEGEZEGD', 'Donatie geregistreerd', 'Donatie van 24 devices geregistreerd.', '2026-03-04T10:00:00.000Z', 'digidromen_staff', 'Noah Janssen', '{"actorUserId":"user-digidromen-staff"}');

insert into public.messages (id, case_type, case_id, author_user_id, author_role, author_name, kind, body, created_at, internal_only) values
  ('order-1001-message-1', 'order', 'order-1001', 'user-digidromen-staff', 'digidromen_staff', 'Noah Janssen', 'manual', 'Wij hebben de aanvraag gecontroleerd en pakken deze op.', '2026-03-03T09:30:00.000Z', false);

insert into public.documents (id, case_type, case_id, file_name, file_size_label, mime_type, uploaded_at, uploaded_by_user_id, uploaded_by_name, kind, storage_mode) values
  ('order-1001-document-1', 'order', 'order-1001', 'aanvraag-cohort-amsterdam.pdf', '184 KB', 'application/pdf', '2026-03-02T08:31:00.000Z', 'user-help-amsterdam', 'Sanne de Vries', 'request_attachment', 'metadata_only'),
  ('donation-3003-document-1', 'donation', 'donation-3003', 'refurbish-rapport-3003.xlsx', '72 KB', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '2026-03-06T16:20:00.000Z', 'user-service-partner', 'Tom van Aalst', 'donation_report', 'metadata_only');

insert into public.notifications (id, title, body, created_at, channel, level, related_case_type, related_case_id) values
  ('order-1001-notification-1', 'Nieuwe orderaanvraag', 'Order order-1001 wacht op beoordeling.', '2026-03-02T08:30:00.000Z', 'portal', 'info', 'order', 'order-1001'),
  ('repair-2001-notification-1', 'Nieuw reparatieverzoek', 'Repair repair-2001 wacht op intake.', '2026-03-06T09:15:00.000Z', 'portal', 'info', 'repair', 'repair-2001'),
  ('donation-3001-notification-1', 'Nieuwe donatiebatch', 'Donatie donation-3001 wacht op pickup planning.', '2026-03-04T10:00:00.000Z', 'portal', 'info', 'donation', 'donation-3001');

insert into public.notification_role_scope (notification_id, role, is_read) values
  ('order-1001-notification-1', 'digidromen_staff', false),
  ('order-1001-notification-1', 'digidromen_admin', false),
  ('repair-2001-notification-1', 'digidromen_staff', false),
  ('repair-2001-notification-1', 'digidromen_admin', false),
  ('donation-3001-notification-1', 'digidromen_staff', false),
  ('donation-3001-notification-1', 'digidromen_admin', false),
  ('donation-3001-notification-1', 'service_partner', false);

insert into public.crm_sync_jobs (id, case_type, case_id, state, entity_name, buffered_changes, last_attempt_at, last_successful_sync_at, failure_reason, retry_count) values
  ('crm-job-order-1001', 'order', 'order-1001', 'synced', 'order', '{}', '2026-03-05T10:16:00.000Z', '2026-03-05T10:16:00.000Z', null, 0),
  ('crm-job-order-1002', 'order', 'order-1002', 'queued', 'order', '{"Status gewijzigd naar IN_VOORBEREIDING"}', '2026-03-09T14:46:00.000Z', null, null, 0),
  ('crm-job-repair-2001', 'repair', 'repair-2001', 'failed', 'repair', '{"Status gewijzigd naar DIAGNOSE"}', '2026-03-09T11:35:00.000Z', null, 'CRM time-out tijdens bijwerken dossier.', 1);
