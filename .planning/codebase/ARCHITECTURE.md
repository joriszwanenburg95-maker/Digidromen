# Architecture

**Analysis Date:** 2025-03-12

## Pattern Overview

**Overall:** Contract-First / Port & Adapters (Hexagonal-lite)

**Key Characteristics:**
- **Contract-First Design:** All domain entities and service interfaces are defined as TypeScript contracts in a central location (`src/contracts/`), shared between the frontend and potential backend services.
- **Port & Adapters:** The core business logic interacts with abstract contracts (Ports). Real implementations (Adapters) for Supabase, Local Storage, or Mock CRM are swapped based on configuration.
- **Role-Based Workflow Engine:** State transitions for business cases (Orders, Repairs, Donations) are strictly defined by role-based rules in `src/contracts/workflows.ts`.

## Layers

**Frontend (Portal):**
- Purpose: Provides the user interface for different stakeholders (Help Org, Staff, Service Partner).
- Location: `portal/src/`
- Contains: React components, pages, hooks, and a portal-specific bridge library.
- Depends on: `src/contracts/`, `src/store/`, `src/data/`
- Used by: End users via browser.

**Domain Contracts (Shared):**
- Purpose: Single source of truth for types, interfaces, and business rules.
- Location: `src/contracts/`
- Contains: Entity types (`domain.ts`), Service interfaces (`adapters.ts`, `persistence.ts`), and Workflow rules (`workflows.ts`).
- Depends on: None.
- Used by: All other layers.

**State Management (Store):**
- Purpose: Centralized state container that enforces business logic and data consistency.
- Location: `src/store/`
- Contains: `portal-store.ts` (Implementation of `PortalStoreContract`), handling mutations and side effects (e.g., stock reconciliation).
- Depends on: `src/contracts/`
- Used by: `portal/src/lib/portal.ts`

**Infrastructure / Adapters:**
- Purpose: External service integrations and data persistence.
- Location: `portal/src/lib/` (Supabase) and `src/store/` (Local Storage).
- Contains: `supabase.ts`, `portal-remote.ts` (Supabase adapter), `local-storage.ts`.
- Depends on: `src/contracts/`
- Used by: Portal and Store.

## Data Flow

**Case Mutation Flow:**

1. **Trigger:** User interacts with a React component in `portal/src/pages/`.
2. **Bridge:** Component calls an action on `portalStore` in `portal/src/lib/portal.ts`.
3. **Dispatch:** `portalStore` determines if it's in "Remote Mode" (Supabase) or "Local Mode" (Mock).
4. **Logic:** 
   - If Local: `PortalStore` in `src/store/portal-store.ts` validates the transition against `src/contracts/workflows.ts` and mutates state.
   - If Remote: `portal-remote.ts` calls Supabase functions.
5. **Persistence:** State is persisted to `localStorage` or remote database.
6. **Reactivity:** Store notifies listeners, and React components re-render via `useSyncExternalStore`.

**State Management:**
- Handled via a custom Store pattern in `src/store/portal-store.ts` that implements a subscription model for React.

## Key Abstractions

**Workflow Transitions:**
- Purpose: Enforce business rules for status changes.
- Examples: `orderTransitions` in `src/contracts/workflows.ts`.
- Pattern: Finite State Machine definitions.

**PortalStoreContract:**
- Purpose: Abstract interface for data operations.
- Examples: `PortalStoreContract` in `src/contracts/adapters.ts`.
- Pattern: Repository / Service Pattern.

## Entry Points

**Portal Entry:**
- Location: `portal/src/main.tsx`
- Triggers: Browser page load.
- Responsibilities: Initialize React, setup Auth providers, and mount the App.

**Remote Initialization:**
- Location: `portal/src/lib/portal.ts` -> `configureRemotePortal`
- Triggers: Successful login or auth check.
- Responsibilities: Connect to Supabase and fetch initial remote state.

## Error Handling

**Strategy:** Contract-driven validation and centralized adapter error handling.

**Patterns:**
- **Transition Guard:** Throws error if a status change is not allowed for the current role.
- **Supabase Assert:** `assertNoError` utility in `portal/src/lib/portal-remote.ts` for uniform API error handling.

## Cross-Cutting Concerns

**Logging:** Currently uses `console` or metadata in `WorkflowEvents`.
**Validation:** Typescript interfaces for structural integrity; workflow rules for business integrity.
**Authentication:** Managed via `AuthContext.tsx` and Supabase Auth integration.

---

*Architecture analysis: 2025-03-12*
