# Technology Stack

**Analysis Date:** 2025-05-22

## Languages

**Primary:**
- TypeScript 5.6.2 - Used for both the frontend portal and the shared domain logic in `src/`.
- SQL - Used for Supabase database migrations and seeding in `supabase/`.

**Secondary:**
- JavaScript - Limited to configuration files like `eslint.config.js`.

## Runtime

**Environment:**
- Node.js (v20+ recommended for Vite 6)
- Modern Web Browsers (Target: ES2020)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present in root and `portal/`.

## Frameworks

**Core:**
- React 18.3.1 - Frontend UI framework.
- React Router 7.13.1 - Client-side routing.

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework.
- PostCSS 8.5.8 - CSS transformation tool.

**Build/Dev:**
- Vite 6.0.3 - Build tool and development server.
- TypeScript 5.6.2 - Static type checking.

## Key Dependencies

**Frontend Utilities:**
- `lucide-react` ^0.577.0 - Icon library.
- `date-fns` ^4.1.0 - Date formatting and manipulation.
- `clsx` ^2.1.1 & `tailwind-merge` ^3.5.0 - Utility for conditional CSS classes.

**Data & Storage:**
- `@supabase/supabase-js` ^2.99.1 - Supabase client for database, auth, and storage.
- `xlsx` ^0.18.5 - Library for exporting data to Excel format.

## Domain Logic (src/)

**Core Architecture:**
- Contract-driven design using TypeScript interfaces in `src/contracts/`.
- State management via a custom store in `src/store/portal-store.ts`.
- Local-first capability with `src/store/local-storage.ts`.
- Selector-based data access in `src/data/selectors.ts`.

## Configuration

**Environment:**
- Vite-style environment variables (`import.meta.env`).
- Environment variables configured in `portal/.env.local` (based on `.env.local.example`).

**Build:**
- `portal/vite.config.ts`: Vite configuration for React and path resolution.
- `portal/tsconfig.json` & `portal/tsconfig.app.json`: TypeScript configuration including shared `src/`.

## Platform Requirements

**Development:**
- Node.js environment with npm.
- Supabase CLI (optional but recommended for database management).

**Production:**
- Vercel or similar static hosting for the Vite-built portal.
- Supabase project for the backend (PostgreSQL, Auth).

---

*Stack analysis: 2025-05-22*
