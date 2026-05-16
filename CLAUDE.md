# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Run migrations (dev — prompts for migration name)
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio at localhost:5555
```

There are no automated tests. Type-check with `npx tsc --noEmit`.

## Environment

Required env vars (`.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret
- `ANTHROPIC_API_KEY` — for the AI Kitchen Lab
- `REDIS_URL` — for BullMQ background jobs (optional if not using auto-prep/auto-order)
- `SMTP_*` — for email (roster invites)

`next.config.ts` allows dev origin `192.168.1.10` for LAN tablet access.

## Architecture

### Stack
- **Next.js 16** App Router — see `AGENTS.md` warning: this version has breaking changes, read `node_modules/next/dist/docs/` before writing new route/layout patterns.
- **Prisma 7** + PostgreSQL via `@prisma/adapter-pg`
- **NextAuth v5** (beta) — JWT strategy, credentials provider
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, not a config file
- **Socket.io** — real-time KDS updates
- **BullMQ + Redis** — background jobs (auto-prep, auto-order)
- **Anthropic SDK** — AI Kitchen Lab (`src/lib/claude.ts`)

### Multi-Restaurant Tenancy

Every data model has a `restaurantId`. The active restaurant is stored in a cookie `rms-rid` and resolved server-side via `getRestaurantId(userId)` in `src/lib/restaurant.ts`. **Every API route must call this and scope all DB queries to the resolved `restaurantId`.** Never trust `restaurantId` from the request body.

The `RestaurantSwitcher` component sets this cookie client-side; the API route `/api/restaurants/switch` sets it server-side.

### Auth & Permissions

- `src/lib/auth.ts` — NextAuth config; `role` and `id` are injected into the JWT and session.
- `src/proxy.ts` — the actual Next.js middleware file (note: not `src/middleware.ts`). Handles redirect-to-login and RBAC for page routes. API routes handle their own auth.
- `src/lib/permissions.ts` — `ROUTE_PERMISSIONS` maps route prefixes to allowed roles. `canAccess(role, pathname)` is used by middleware.
- Roles: `ADMIN > MANAGER > HEAD_CHEF > CHEF/SOUS_CHEF > WAITER/BARTENDER`

### API Routes

All under `src/app/api/`. Pattern:
1. Call `auth()` to get session — return 401 if missing.
2. Call `getRestaurantId(session.user.id)` — return 403 if null.
3. Scope every `db.*` query with `restaurantId`.

### Shared Types

`src/types/index.ts` — all shared frontend/backend interfaces (`OrderWithItems`, `MenuItemWithRecipe`, `KdsTicket`, etc.). Prisma enums are re-exported from here. **Always import types from `@/types`, not from `@prisma/client` directly.**

### Key Library Files

| File | Purpose |
|---|---|
| `src/lib/db.ts` | Singleton Prisma client (singleton pattern prevents hot-reload leaks) |
| `src/lib/utils.ts` | `cn()`, `formatCurrency()`, unit conversion helpers |
| `src/lib/notify.ts` | `notify(restaurantId, type, title, body, link?)` — fans out to all relevant role members |
| `src/lib/autoOrder.ts` | `maybeCreateAutoPo()` — creates a draft PO when stock drops below reorder point |
| `src/lib/autoPrep.ts` | Auto-generates prep tasks from routines |
| `src/lib/mailer.ts` | Nodemailer wrapper for roster invite emails |

### Theme System

Light/dark theme is toggled by setting `data-theme="light"` on `<html>`. The ThemeProvider (`src/components/layout/ThemeProvider.tsx`) persists to `localStorage` and exposes `useTheme()`. CSS variables for Tailwind's gray scale are remapped in `globals.css` under `[data-theme="light"]`. The sidebar gets separate overrides scoped to `aside`. An inline script in `layout.tsx` applies the saved theme before first paint to prevent flash.

### UI Primitives & Design Standards

**These rules apply to every new feature. Do not skip them.**

#### Shared components — always use, never rebuild inline

| Component | Import | Use for |
|---|---|---|
| `Modal` | `@/components/ui/Modal` | Any overlay dialog — pass `open`, `onClose`, optional `title` |
| `Button` | `@/components/ui/Button` | All clickable buttons — variants: `primary`, `secondary`, `ghost`, `danger`, `warning` |
| `Badge` | `@/components/ui/Badge` | Role chips, status tags, category pills — pass color class via `className` |
| `DatePicker` | `@/components/ui/DatePicker` | Single date selection |
| `TimePicker` | `@/components/ui/TimePicker` | Single time selection (24h input, 12h display, 15-min steps) |
| `DateRangePicker` | `@/components/ui/DateRangePicker` | Date-only range selection |
| `DateRangePicker` (POS) | `@/components/pos/DateRangePicker` | Date+time range with presets — POS/analytics only |

Never implement a modal as a raw `<div className="fixed inset-0 ...">`. Always use `<Modal>`.

#### Form fields — use the global CSS classes

```tsx
<label className="label">Field name</label>
<input className="input" ... />
<select className="select" ... />   {/* same as input */}
<textarea className="input resize-none" ... />
<p className="error">{errorMsg}</p>
```

These classes are defined in `globals.css` and theme correctly in light/dark mode. Do **not** inline `bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm ...` — use `.input` instead.

#### Color maps — import from `src/lib/colors.ts`

Never define per-component color maps. Import from the central file:

```ts
import { ROLE_COLORS, CATEGORY_COLORS, DIETARY_TAG_COLORS, DIETARY_TAG_LABELS,
         LEAVE_TYPE_COLORS, LEAVE_STATUS_COLORS } from "@/lib/colors";
```

If a new feature needs a color map (e.g. order status colors, payment method colors), add it to `src/lib/colors.ts` — not inline in the component.

#### Modal standard

```tsx
<Modal open={open} onClose={onClose} title="Dialog title">
  <div className="space-y-4">
    <div>
      <label className="label">Field</label>
      <input className="input" ... />
    </div>
    <Button variant="primary" className="w-full" onClick={submit} disabled={saving}>
      {saving ? "Saving…" : "Save"}
    </Button>
  </div>
</Modal>
```

- Backdrop is always `bg-black/60 backdrop-blur-sm` (enforced by `Modal`)
- Container is always `bg-gray-900 border border-gray-700 rounded-2xl` (enforced by `Modal`)
- Use `maxWidth` prop to override default `max-w-md`

#### Accent & semantic colors

Orange (`orange-500`) is the primary accent. Do not introduce new accent colors. Semantic colors:
- Success / ready: `emerald-400` / `green-400`
- Error / danger: `red-400` / `red-500`
- Warning: `amber-400`
- Info: `blue-400`
- Secondary / muted: `gray-400` / `gray-500`

### POS System

The POS has two distinct modes driven by `Restaurant.type`:
- **DINE_IN** — full-featured: table floor map, course management, drag-drop reordering, fire-by-course, table move/join/split.
- **CAFE** — fast-add mode: single tap adds item to cart instantly (no modal), simplified cart without course concepts.

The order screen lives at `/pos/order/[orderId]` (`src/components/pos/OrderScreen.tsx`). The floor map is the entry point (`src/components/pos/FloorMap.tsx`).

### KDS (Kitchen Display System)

`/kds` — real-time ticket board using Socket.io. Two modes: `kitchen` (all food items) and `bar` (beverages). Read-only for WAITER/BARTENDER in kitchen mode. `src/components/kds/KdsBoard.tsx` is the main component.

### AI Kitchen Lab

`/lab` — chat interface powered by Anthropic Claude. Sessions store message history in `LabSession`/`LabMessage`. Generated recipes land in `LabRecipe` with `PENDING` status; ADMIN/MANAGER can approve to promote them to the recipe library.

### Central Kitchen

`Restaurant` records with `type: CENTRAL_KITCHEN` act as a supply hub. Linked via `CentralKitchenLink`. Branch restaurants create `DistributionRequest` records; the CK approves and dispatches ingredients via `DistributionItem`.

### Notifications

In-app only (no push). `notify()` creates `Notification` rows for all active members of the restaurant matching the role map in `src/lib/notify.ts`. `NotificationBell` polls `/api/notifications` and shows unread count.
