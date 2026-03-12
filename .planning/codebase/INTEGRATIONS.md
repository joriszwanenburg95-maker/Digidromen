# External Integrations

**Analysis Date:** 2025-05-22

## APIs & External Services

**Supabase:**
- Backend-as-a-Service for database, authentication, and remote state.
- Client: `@supabase/supabase-js` ^2.99.1 in `portal/src/lib/supabase.ts`.
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

**CRM Sync (Future Integration):**
- Mechanism for syncing domain data (orders, repairs, donations) with an external CRM system.
- Implementation: Sync jobs are buffered in the `crm_sync_jobs` table in Supabase.
- Configured in: `portal/src/lib/portal-remote.ts` and `src/contracts/workflows.ts`.

## Data Storage

**Databases:**
- **Supabase (PostgreSQL):** Primary remote database.
  - Connection: `supabase-js` client using the anon key for RLS-based access.
  - Client: `portal/src/lib/supabase.ts`.

- **Local Storage:**
  - Used for persistence in the local-first demo mode.
  - Client: `src/store/local-storage.ts`.

**File Storage:**
- **Supabase Storage:** Used for document and photo uploads.
- Implementation: Tracked in `portal/src/lib/portal-remote.ts` via the `documents` table.

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth:**
  - Implementation: `portal/src/context/AuthContext.tsx` manages user session.
  - Identity Sync: User profiles are synced with Supabase auth users in `supabase/migrations/20260312143000_auth_profile_sync.sql`.

## Monitoring & Observability

**Error Tracking:**
- Not detected (e.g., no Sentry found).

**Logs:**
- Browser console used for development logging.

## CI/CD & Deployment

**Hosting:**
- Likely **Vercel** for the portal (indicated by `vercel-launch-plan.md` in `docs/`).

**CI Pipeline:**
- Not explicitly configured in the repository (e.g., no `.github/workflows`).

## Environment Configuration

**Required env vars (portal/.env.local):**
- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase project anonymous key.

**Secrets location:**
- Not checked directly (kept in local `.env` files and deployment platform).

## Webhooks & Callbacks

**Incoming:**
- Not detected (likely handled via Supabase edge functions or future backend).

**Outgoing:**
- Not detected (likely handled via Supabase triggers or future CRM sync workers).

---

*Integration audit: 2025-05-22*
