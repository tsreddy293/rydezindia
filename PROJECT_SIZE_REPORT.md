# Project Size Report

**Project:** Rydez India  
**Date:** 2026-06-17  
**Root:** `c:\Users\admin\Desktop\rydezindia\rydezindia`  
**Excluded from size totals:** `node_modules/`, `.next/`, `.git/`, `server/node_modules/`

---

## 1. Overall Size

| Metric | Value |
|--------|-------|
| Total source + assets (excl. node_modules, .next) | **~12.3 MB** |
| Legacy Express server + nested node_modules | **~13.4 MB** (deletable subset) |
| Root `node_modules/` | Not measured (standard Next.js install) |

---

## 2. Largest Folders (Top Level)

| Folder | Size (MB) | Notes |
|--------|-----------|-------|
| `images/` | 4.85 | **Duplicate** of `public/images/` — not served by Next.js |
| `screenshots/` | 3.42 | Design QA captures — **zero code references** |
| `public/` | 2.59 | Served static assets (`public/images/`) |
| `components/` | 0.31 | React components |
| `lib/` | 0.24 | Services, queries, utilities |
| `app/` | 0.22 | Next.js App Router pages + API routes |
| `server/` | 0.19 | TypeScript actions only (excl. node_modules) |
| `supabase/` | 0.11 | Migrations + RUN scripts |
| `scripts/` | 0.01 | Build/migration helper scripts |

**Recoverable space if legacy server + duplicate assets removed:** ~22 MB (13.4 MB Express + 4.85 MB root images + 3.42 MB screenshots, minus any assets you choose to keep).

---

## 3. Largest Files (Top 25, excl. node_modules)

| Size (MB) | Path |
|-----------|------|
| 1.80 | `images/image 3.png` |
| 1.80 | `public/images/image 3.png` *(duplicate)* |
| 1.68 | `images/logo copy 2.png` |
| 1.37 | `images/logo copy.png` |
| 0.64 | `screenshots/navbar-logo-verification.png` |
| 0.62 | `screenshots/navbar-80px-logo-verification.png` |
| 0.62 | `screenshots/navbar-logo-copy-2.png` |
| 0.62 | `screenshots/navbar-80px-transparent-logo.png` |
| 0.61 | `screenshots/navbar-dark-text-logo.png` |
| 0.29 | `package-lock.json` |
| 0.27 | `public/images/rydez-logo-sports.png` |
| 0.26 | `public/images/logo copy 2.png` |
| 0.21 | `public/images/rydez-logo.png` |
| 0.16 | `screenshots/navbar-logo-copy-2-mobile.png` |
| 0.15 | `screenshots/navbar-dark-text-logo-mobile.png` |
| 0.08 | `lib/supabase/queries.ts` |
| 0.04 | `server/package-lock.json` |
| 0.04 | `public/images/rydez-logo-navbar.png` |
| 0.02 | `app/favicon.ico` |
| 0.02 | `server/actions/vehicles.ts` |
| 0.02 | `server/actions/adminManagement.ts` |
| 0.02 | `components/search/SearchWithMaps.tsx` |
| 0.02 | `supabase/migrations/008_phase2_trust_growth.sql` |
| 0.02 | `components/home/HeroSearchForm.tsx` |
| 0.02 | `server/actions/auth.ts` |

**Largest code file:** `lib/supabase/queries.ts` (~80 KB)

---

## 4. Unused npm Dependencies (`package.json`)

Analysis via `npx depcheck` + manual verification.

### Confirmed unused (safe to remove from package.json)

| Package | Reason |
|---------|--------|
| `@radix-ui/react-avatar` | Zero imports in codebase |
| `@radix-ui/react-dialog` | Zero imports |
| `@radix-ui/react-dropdown-menu` | Zero imports |
| `@radix-ui/react-label` | Zero imports |
| `@radix-ui/react-select` | Zero imports |
| `@radix-ui/react-separator` | Zero imports |
| `@radix-ui/react-slot` | Zero imports |
| `@radix-ui/react-tabs` | Zero imports |
| `class-variance-authority` | Zero imports (shadcn scaffold never used) |
| `recharts` | Zero imports; admin dashboard uses custom `ChartBars` + Lucide icons |

**Estimated savings:** ~2–5 MB in `node_modules` after reinstall (depends on transitive deps).

### False positives from depcheck (keep these)

| Package | Actually used by |
|---------|-----------------|
| `tailwindcss` | `postcss.config`, `globals.css` |
| `@tailwindcss/postcss` | PostCSS pipeline |
| `@types/google.maps` | `components/maps/*` TypeScript types |
| `@types/react-dom` | React 19 TypeScript baseline |

### Used but underutilized

| Package | Usage |
|---------|-------|
| `clsx` + `tailwind-merge` | Imported in `lib/utils.ts` but `cn()` helper is **never called** elsewhere |
| `framer-motion` | 18 home/marketing components |
| `@react-google-maps/api` | 3 map components |
| `pg` | `scripts/apply-migration-012.mjs` only (dev script) |

---

## 5. Duplicate npm Packages

| Location | Packages | Notes |
|----------|----------|-------|
| Root `package.json` | Next.js 16, React 19, Supabase | Active app |
| `server/package.json` | Express 4, Mongoose 8, bcryptjs, JWT | **Legacy nested install** — entire `server/node_modules/` (~13 MB) is duplicate ecosystem |

No duplicate versions of the same package exist within root `package.json`. The only meaningful duplication is the **legacy Express server's isolated `node_modules/` tree**.

---

## 6. Unused / Duplicate Images & Assets

### Actively used (keep)

| Asset | Referenced by |
|-------|---------------|
| `public/images/image 3.png` | `Hero.tsx`, `OwnerEarnings.tsx` |
| `public/images/logo copy 2.png` | `HeaderClient.tsx` |
| `public/images/rydez-logo-sports.png` | `Footer.tsx` |

### Unused in code (candidates for cleanup review)

| Asset | Size | Issue |
|-------|------|-------|
| **Entire `images/` folder (root)** | 4.85 MB | Duplicate of `public/images/`; Next.js only serves `public/` |
| **Entire `screenshots/` folder** | 3.42 MB | Zero references — design verification artifacts |
| `public/images/rydez-logo.png` | 218 KB | No code references |
| `public/images/rydez-logo-navbar.png` | 43 KB | No code references |
| `images/logo copy.png` | 1.37 MB | Root duplicate, unused |
| `public/images/logo copy 2.png` | 270 KB | Smaller copy exists in public; header uses this path ✓ |

### Duplicate pairs

| Original (unused) | Served copy (used) |
|-------------------|-------------------|
| `images/image 3.png` | `public/images/image 3.png` |
| `images/logo copy 2.png` | `public/images/logo copy 2.png` |

### Default Next.js boilerplate SVGs (unused)

| File | Status |
|------|--------|
| `public/next.svg` | Unused |
| `public/vercel.svg` | Unused |
| `public/globe.svg` | Unused |
| `public/file.svg` | Unused |
| `public/window.svg` | Unused |
| `public/icon.svg` | Possibly used as favicon alternative |

---

## 7. Size Optimization Opportunities (Ranked)

| Priority | Action | Est. Savings |
|----------|--------|--------------|
| 1 | Remove legacy Express `server/node_modules/` + routes/models | ~13 MB |
| 2 | Delete root `images/` folder (keep `public/images/`) | ~4.9 MB |
| 3 | Archive or delete `screenshots/` | ~3.4 MB |
| 4 | Compress `image 3.png` (1.8 MB PNG → WebP) | ~1.5 MB |
| 5 | Remove unused Radix + recharts + cva from package.json | ~2–5 MB node_modules |
| 6 | Remove unused logo PNGs from `public/images/` | ~260 KB |

---

*End of report. No files were modified or deleted.*
