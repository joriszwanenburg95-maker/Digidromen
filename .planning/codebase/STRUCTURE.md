# Codebase Structure

**Analysis Date:** 2025-03-12

## Directory Layout

```
/
├── portal/             # Frontend Application
│   ├── src/            # Frontend Source Code
│   │   ├── components/ # Shared UI components
│   │   ├── pages/      # Route-level components
│   │   ├── lib/        # Core portal logic and adapters
│   │   └── context/    # React contexts (Auth, etc.)
│   └── public/         # Static assets
├── src/                # Shared Core Logic
│   ├── contracts/      # Domain types and interface definitions
│   ├── store/          # Shared state management implementation
│   └── data/           # Seed data and business logic helpers
└── supabase/           # Database Schema and Migrations
```

## Directory Purposes

**portal/src/lib/:**
- Purpose: The "brains" of the frontend. Bridges React with the backend/store.
- Contains: `portal.ts` (Store adapter), `portal-remote.ts` (Supabase integration), `supabase.ts`.
- Key files: `portal.ts` (primary state interface for components).

**src/contracts/:**
- Purpose: Shared domain model and contract definitions.
- Contains: `domain.ts` (Types), `workflows.ts` (Rules), `adapters.ts` (Interfaces).
- Key files: `domain.ts` (Entities), `workflows.ts` (Transition rules).

**src/store/:**
- Purpose: Shared state container.
- Contains: Implementation of the `PortalStoreContract`.
- Key files: `portal-store.ts`.

**src/data/:**
- Purpose: Data-centric business logic and utilities.
- Contains: `csv.ts` (Export logic), `metrics.ts` (Reporting logic), `contract-seed.ts`.
- Key files: `contract-seed.ts` (Initial system state).

**supabase/migrations/:**
- Purpose: Relational database schema definition.
- Contains: SQL migration files.

## Key File Locations

**Entry Points:**
- `portal/src/main.tsx`: React/Vite main entry.
- `portal/src/App.tsx`: Root React component and routing.

**Configuration:**
- `portal/vite.config.ts`: Frontend build config.
- `portal/tailwind.config.js`: Styling config.

**Core Logic:**
- `src/contracts/workflows.ts`: Status transition rules.
- `src/store/portal-store.ts`: Local state mutation logic.
- `portal/src/lib/portal-remote.ts`: Supabase integration logic.

## Naming Conventions

**Files:**
- React Components: `PascalCase.tsx`
- Contracts/Store/Lib: `kebab-case.ts`
- Migrations: `timestamp_description.sql`

**Directories:**
- Feature-based in `portal/src/pages/`.
- Layer-based in `src/`.

## Where to Add New Code

**New Feature (e.g., Inventory Management):**
- **Domain:** Add types to `src/contracts/domain.ts`.
- **Contracts:** Add service methods to `src/contracts/adapters.ts`.
- **Store:** Implement logic in `src/store/portal-store.ts`.
- **Remote:** Add Supabase calls in `portal/src/lib/portal-remote.ts`.
- **UI:** Create pages in `portal/src/pages/` and components in `portal/src/components/`.

**New Business Rule:**
- Update `src/contracts/workflows.ts` (e.g., adding a new status or transition).

**Shared Utility:**
- Shared logic: `src/data/`.
- Frontend only: `portal/src/utils/`.

## Special Directories

**supabase/.temp/:**
- Purpose: Supabase CLI metadata.
- Generated: Yes.
- Committed: Yes (partial).

---

*Structure analysis: 2025-03-12*
