# Testing Patterns

**Analysis Date:** 2025-05-14

## Test Framework

**Runner:**
- **None Detected.** The project currently does not have an automated test runner (like Vitest or Jest) configured in `portal/package.json`.

**Assertion Library:**
- **Not applicable.**

**Run Commands:**
```bash
# No test commands defined in portal/package.json
```

## Test File Organization

**Location:**
- **Not applicable.** No test files (`*.test.ts`, `*.spec.ts`) were found in the source directories.

**Naming:**
- **Not applicable.**

**Structure:**
```
[No automated tests present]
```

## Test Structure

**Suite Organization:**
- **Not applicable.** Currently, verification is done manually through the browser while running in `dev` mode.

**Patterns:**
- **Not applicable.**

## Mocking

**Framework:** Custom mock logic

**Patterns:**
```typescript
// The portal uses a custom "demo" mode which uses mock data
// defined in src/data/seed-data.ts and handled in portal/src/lib/portal.ts.

// Example of switching between remote and mock/demo data:
export const portalStore = {
  getSnapshot(): LegacySnapshot {
    if (remoteViewer && remoteData) {
      return buildLegacySnapshotFromRaw(remoteData, remoteViewer.role);
    }
    return getLegacySnapshot(); // Uses baseStore with demo data
  },
  // ...
};
```

**What to Mock:**
- **Remote Services:** Supabase and external API calls are mocked using internal storage when `isRemoteMode()` is false.

**What NOT to Mock:**
- **Domain Logic:** The core business rules and workflows are shared and should not be mocked.

## Fixtures and Factories

**Test Data:**
```typescript
// Seed data is maintained in:
// src/data/seed-data.ts
// src/data/contract-seed.ts

// This data is used to populate the portal's initial state in demo mode.
```

**Location:**
- `src/data/seed-data.ts`
- `src/data/contract-seed.ts`

## Coverage

**Requirements:** None enforced.

**View Coverage:**
- **Not applicable.**

## Test Types

**Unit Tests:**
- **Current State:** None.
- **Goal:** Should be implemented for core domain logic in `src/contracts/` and utility functions in `portal/src/lib/`.

**Integration Tests:**
- **Current State:** None.
- **Goal:** Should be implemented for the `portalStore` and `AuthContext`.

**E2E Tests:**
- **Not used.**

## Common Patterns

**Async Testing:**
- **Pattern:** None implemented yet.

**Error Testing:**
- **Pattern:** None implemented yet.

---

*Testing analysis: 2025-05-14*
