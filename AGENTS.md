<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Phase-1 (frozen)

Vehicle Registration, Owner/Customer Approval, Search, Vehicle Rendering, Service Types, and Trip Types are **stable**. Bugfixes only — no redesign.

## Phase-2 (active)

Booking workflow only, in order: Booking Review → Rider Auth → Payment → Confirmation → My Bookings → Cancellation → Refund → Owner Earnings → Wallet → Notifications.

See `.cursor/rules/phase1-freeze-booking-workflow.mdc` for full scope.
