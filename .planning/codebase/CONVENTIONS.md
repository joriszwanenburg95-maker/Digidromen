# Coding Conventions

**Analysis Date:** 2025-05-14

## Naming Patterns

**Files:**
- Components and Pages use **PascalCase**: `CrmPreparationCard.tsx`, `Dashboard.tsx`, `Layout.tsx`.
- Library and Utility files use **kebab-case**: `crm-preparation.ts`, `portal-remote.ts`, `supabase.ts`.
- CSS files use **PascalCase** or **kebab-case**: `App.css`, `index.css`.

**Functions:**
- Standard functions use **camelCase**: `formatDateTime`, `getCrmPreparationStatus`.
- React components use **PascalCase**: `Dashboard`, `Timeline`.

**Variables:**
- Standard variables use **camelCase**: `preparedMutationCount`, `recentDocs`.
- Constants and Config objects often use **camelCase** but can be descriptive: `crmPreparationConfig`, `sidebarLinks`.

**Types:**
- Interfaces (especially for Props) use **PascalCase**: `CrmPreparationCardProps`.
- Internal types use **PascalCase**: `DashboardListItem`, `CrmPreparationState`.
- Suffixes like `Props` or `State` are common.

## Code Style

**Formatting:**
- No explicit Prettier configuration detected.
- Code follows standard React/TypeScript formatting (2-space indentation, semi-colons).
- Tailwind CSS classes are written inline in `className` strings.

**Linting:**
- ESLint is used with `typescript-eslint` and React hooks plugins.
- Config location: `portal/eslint.config.js`.

## Import Organization

**Order:**
1. React and standard hooks (`import React, { useMemo, ... } from "react";`)
2. Third-party libraries (`import { Link, ... } from "react-router-dom";`, `lucide-react`)
3. Context/Hooks (`import { useAuth } from "../context/AuthContext";`)
4. Internal Libraries/Utilities (`import { formatDateTime } from "../lib/portal";`)
5. Types (`import type { Role } from "../types";`)
6. Styles (`import "./App.css";`)

**Path Aliases:**
- The codebase uses relative paths extensively: `../lib/portal`, `../../../src/contracts/domain`.
- No root-level aliases (like `@/`) are configured in `tsconfig.json`.

## Error Handling

**Patterns:**
- Use of optional chaining and nullish coalescing for safe property access.
- Guard clauses at the beginning of functions.
- `try/catch` blocks around remote/async operations in `portal-remote.ts` and `portal.ts`.
- UI handles missing data with fallback text or empty states (e.g., `syncStates.length === 0`).

## Logging

**Framework:** `console`

**Patterns:**
- Minimal logging in production code.
- Errors in remote operations are caught and can be returned as part of the state.

## Comments

**When to Comment:**
- Comments are sparse; code is intended to be self-documenting through clear naming.
- Occasional explanatory comments for complex logic or business rules.

**JSDoc/TSDoc:**
- Not strictly enforced but used occasionally for complex function signatures.

## Function Design

**Size:**
- Components are generally kept focused. Large components like `Dashboard` are structured with sub-renders or separate component files.

**Parameters:**
- Destructuring is preferred for props: `const CrmPreparationCard: React.FC<CrmPreparationCardProps> = ({ subjectLabel, ... }) => { ... }`.

**Return Values:**
- Functional components return JSX or `null`.
- Utility functions return explicit types or primitives.

## Module Design

**Exports:**
- `export default` is used for React components (one per file).
- Named exports are used for libraries and utilities (`portal/src/lib/`).

**Barrel Files:**
- Used in `src/contracts/index.ts` and `portal/src/types/index.ts` to consolidate exports.

---

*Convention analysis: 2025-05-14*
