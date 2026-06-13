# Rydez India Production Audit

Date: 2026-06-13

## Result

The Next.js application builds successfully for production and ESLint passes. The codebase now includes the missing functional routes and production support required for the three marketplace modules.

## Live Supabase Schema Check

The configured Supabase project was checked with the service-role key.

Current production schema status:

- `return_journeys`: exists, but missing new common marketplace columns such as `vehicle_name`, `pickup_city`, `drop_city`, `journey_time`, and `price`.
- `bookings`: exists, but missing marketplace booking columns such as `booking_type`, `reference_id`, `amount`, and `booking_status`.
- `owners`: missing from schema cache.
- `vehicles`: missing from schema cache.
- `driver_vehicles`: missing from schema cache.
- `self_drive_vehicles`: missing from schema cache.

Required SQL files to run in Supabase SQL Editor, in order:

1. `supabase/migrations/003_bootstrap_marketplace_core.sql`
2. `supabase/migrations/004_three_module_common_fields.sql`
3. `supabase/migrations/005_seed_marketplace_sample_data.sql` (optional sample data)

## Functional Fixes Added

- Added `/vehicle/[id]` as the requested unified vehicle detail page for return journey, self-drive, and driver vehicle listings.
- Added `/booking/confirmation/[id]` for saved booking confirmation.
- Added Supabase Auth actions in `server/actions/auth.ts`.
- Added `/login` using Supabase email/password login.
- Connected existing `/user/register` flow to Supabase Auth user creation and `users` profile upsert.
- Added `proxy.ts` to refresh Supabase Auth cookies using the Next.js 16 proxy convention.
- Updated booking actions to write marketplace booking metadata when schema columns exist.
- Added idempotent sample marketplace seed data in `005_seed_marketplace_sample_data.sql`.
- Updated query helpers to read vehicle details and booking confirmation records safely.
- Excluded legacy non-App-Router Express JS files from ESLint so lint reflects the production Next.js app.

## Verification

- Forms audited:
  - Owner registration saves through `registerOwner`.
  - Return journey vehicle registration saves through `registerVehicle`.
  - Self-drive and driver vehicle registration save through `registerMarketplaceVehicle`.
  - Return journey, self-drive, and driver bookings save through `createBooking` / `createMarketplaceBooking`.
  - User registration now creates Supabase Auth users through `signUpUser`.
- Search pages audited:
  - `/search`
  - `/search-return`
  - `/search-self-drive`
  - `/search-driver`
  - API routes under `/api/search-*`
- Dashboard stats audited:
  - Owner dashboard uses `getPlatformStats`.
  - Admin dashboard uses `getPlatformStats`.
  - Queries are schema-safe and return empty data or zero where new production tables are not yet present.
- `npm run lint`: passed.
- `npm run build`: passed.

## Remaining Production Tasks

- Run migrations `003`, `004`, and optionally `005` in Supabase SQL Editor.
- Refresh Supabase schema cache after migrations if the dashboard still reports missing columns.
- Configure Supabase Auth email settings and production redirect URLs.
- Add payment gateway integration when real payments are required.
- Replace sample seed data with real owner and vehicle records before launch.
