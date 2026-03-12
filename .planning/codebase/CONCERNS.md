# Codebase Concerns

**Analysis Date:** 2024-05-24

## Tech Debt

**Dual Store Implementation & Missing Logic:**
- Issue: The application splits data management between a local store (`portal-store.ts`) and a remote Supabase store (`portal-remote.ts`). Crucial business logic, such as stock reconciliation (`reconcileOrderStock`), is implemented in the local store but missing entirely from the remote Supabase implementation.
- Files: `src/store/portal-store.ts`, `portal/src/lib/portal-remote.ts`, `portal/src/lib/portal.ts`
- Impact: Depending on whether the application runs with mock data or the actual database, behavior diverges. Using the remote store will result in inconsistent stock levels because reservations are not calculated.
- Fix approach: Move business logic (like stock deduction and status validation) into PostgreSQL functions or edge functions so both the frontend and backend share the same source of truth. Remove the local store if remote is the primary target.

**Client-Side ID Generation:**
- Issue: Records use a client-side `makeId` function which falls back to `Math.random().toString(16)` for primary keys.
- Files: `portal/src/lib/portal-remote.ts`, `src/store/portal-store.ts`
- Impact: Increased risk of ID collisions, particularly without true UUID generation. It also moves responsibility away from the database.
- Fix approach: Rely on PostgreSQL's `gen_random_uuid()` or `serial` types for primary key generation when inserting new records.

## Security Considerations

**Permissive Row Level Security (RLS):**
- Risk: Multi-tenancy isolation is broken. Read policies for almost all major tables (`organizations`, `orders`, `repair_cases`, `donation_batches`) use `using (true)`, meaning any authenticated user can read all data from any organization. Insert policies for `messages` and `documents` also allow any authenticated user to insert records for any case.
- Files: `supabase/migrations/20260312123000_portal_initial.sql`
- Current mitigation: Client-side filtering in `usePortalContext` prevents the UI from showing records belonging to other organizations, but a malicious user can still fetch them directly via the Supabase API.
- Recommendations: Update RLS policies to enforce strict tenant isolation. E.g., `using (organization_id = public.current_organization_id() or public.is_staff_or_admin())`.

## Performance Bottlenecks

**Initial Data Fetching (Over-fetching):**
- Problem: The portal fetches the entire database on load or refresh.
- Files: `portal/src/lib/portal-remote.ts` (`loadRemotePortalData`)
- Cause: 14 parallel `select("*")` queries are executed to dump the full database state into memory for the client store.
- Improvement path: Implement proper pagination, lazy loading, and server-side filtering. Instead of pulling all orders into memory, fetch only those belonging to the current user's organization and only load details when viewing a specific record.

## Fragile Areas

**Sequential Remote Inserts (Lack of Transactions):**
- Files: `portal/src/lib/portal-remote.ts`
- Why fragile: Multi-step creations (e.g., `createRemoteOrder` inserts into `orders`, `order_lines`, `workflow_events`, and `crm_sync_jobs` consecutively) are not wrapped in database transactions. If the network drops or a constraint fails mid-process, the database is left in a partially mutated state.
- Safe modification: Move complex multi-table inserts into a PostgreSQL RPC function and call it via `supabase.rpc()` to ensure atomicity.
- Test coverage: No tests ensure rollback on partial failure.

**Race Conditions in Stock Mutations:**
- Files: `portal/src/lib/portal-remote.ts` (`recordRemoteStockMutation`)
- Why fragile: The function reads the current stock quantity, performs client-side math, and then writes the new value back. This is susceptible to race conditions if multiple concurrent updates occur.
- Safe modification: Perform atomic increments in PostgreSQL, e.g., via an RPC function or `update inventory_items set quantity = quantity + delta`.
- Test coverage: Not tested for concurrency.

---

*Concerns audit: 2024-05-24*
