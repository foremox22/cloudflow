---
name: rms-project
description: Project-specific guidance for working on the RMS Next.js application in D:\Project P\rms. Use when modifying, reviewing, debugging, or explaining this repository, especially tasks involving Next.js 16.2.4, the App Router, Prisma, NextAuth, Tailwind CSS 4, restaurant management workflows, dashboard modules, API routes, seed data, or local validation commands.
---

# RMS Project Skill

Use this skill when working in this repository. Treat it as the local project playbook for changes to the restaurant management system.

## First Steps

1. Read `AGENTS.md` before editing. This project uses a Next.js version with breaking changes.
2. Before writing Next.js code, read the relevant local guide in `node_modules/next/dist/docs/`.
3. Inspect the existing route, component, and data patterns before adding new abstractions.
4. Keep changes scoped to the requested feature or bug.

## Project Shape

- App code lives in `src/app`.
- Shared UI and feature components live in `src/components`.
- Shared helpers, data access, and service logic live in `src/lib`.
- Shared types live in `src/types`.
- Prisma schema and seed scripts live in `prisma`.
- Route groups include `src/app/(auth)` and `src/app/(dashboard)`.
- API routes live in `src/app/api`.

## Local Commands

Use these commands from the repository root:

```powershell
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

Prefer `npm run build` plus `npm run lint` for broad validation. Use database commands only when the task changes Prisma schema, generated client behavior, migrations, or seed data.

## Next.js Rules

- Do not rely on memory of older Next.js APIs. Read the local documentation under `node_modules/next/dist/docs/` first.
- Use App Router conventions already present in `src/app`.
- Keep server and client component boundaries intentional. Add `"use client"` only for browser state, effects, event handlers, or client-only libraries.
- Prefer existing data-fetching and route handler patterns from nearby files.
- Check deprecation notes in the local docs when touching routing, metadata, caching, forms, server actions, middleware/proxy, or config.

## UI Rules

- Match the existing dashboard style and component patterns.
- **Always use `src/components/ui` primitives** — `Modal`, `Button`, `Badge`, `DateRangePicker`. Never rebuild these inline.
- **Always use `.input`, `.label`, `.error` CSS classes** for form fields. Never inline `bg-gray-800 border border-gray-700 ...` on an input.
- **Always import color maps from `src/lib/colors.ts`** — never define `ROLE_COLORS`, `STATUS_COLORS`, or similar maps inline in a component.
- Use `lucide-react` icons for icon buttons and navigation affordances.
- Keep dense operational screens easy to scan; this is a restaurant management tool, not a marketing site.
- Avoid broad visual redesigns unless the user explicitly asks for one.
- See the **"UI Primitives & Design Standards"** section in `CLAUDE.md` for the full reference.

## Data And Auth Rules

- Read `prisma/schema.prisma` before changing models, queries, or seed data.
- Preserve existing relationships and enum semantics unless the task requires a schema change.
- After schema changes, run `npm run db:generate`; run migrations only when an actual database migration is intended.
- Follow existing NextAuth patterns around `auth.ts`, protected routes, and session handling.
- Never expose secrets from `.env` in logs, UI, docs, or examples.

## Known Bug: Next.js 16 Implicit-Any on Callback Parameters

Next.js 16 runs a stricter TypeScript check at build time than `tsc --noEmit` locally. Prisma query results lose type inference in `.map()`, `.filter()`, and `.reduce()` callbacks during `npm run build`, even when the local check passes clean.

**Always use these fix patterns when writing new API routes or page components:**

```ts
// map / filter on Prisma result
type Row = (typeof prismaResult)[number];
prismaResult.map((r: Row) => r.id)

// reduce — always type the accumulator explicitly
arr.reduce((s: number, x) => s + x.value, 0)

// nested callbacks
type RawRecipe = (typeof rawRecipes)[number];
type Ingredient = RawRecipe["ingredients"][number];
rawRecipes.map((r: RawRecipe) => ({
  cost: r.ingredients.reduce((s: number, i: Ingredient) => s + i.cost, 0)
}))

// NEVER use .then((list) => list.map(...)) on Prisma queries inside Promise.all
// Await the query first, then map separately
const raw = await db.recipe.findMany({...});
const result = raw.map((r: (typeof raw)[number]) => ({ ...r, extra: true }));
```

// ternary returning Prisma result | never[] — TypeScript resolves to {} — always annotate explicitly
type WasteIngredient = { id: string; category: string; costPerUnit: number };
const items: WasteIngredient[] = condition
  ? await db.ingredient.findMany({ select: { id: true, category: true, costPerUnit: true } })
  : [];
```

`tsc --noEmit` will NOT catch these — always do a full `npm run build` to validate.

## Implementation Habits

- Search with `rg` or `rg --files` first.
- Prefer small, focused edits that follow nearby code.
- Keep TypeScript types explicit at module boundaries and API responses.
- Add or update validation with `zod` where user input or API payloads are involved.
- Keep seed data deterministic and consistent with the schema.
- Verify changed flows with the narrowest useful command, then run broader checks when risk is higher.

## How To Use This Skill

In a future Codex prompt, reference this file directly:

```text
Use the project skill in SKILL.md and add a stock transfer page.
```

For reviews:

```text
Use SKILL.md, review my dashboard changes, and focus on bugs or missing validation.
```

For debugging:

```text
Use SKILL.md and investigate why the POS order API is failing.
```

If you want this skill to be auto-discovered outside this repository, copy this file into a Codex skill folder such as:

```text
C:\Users\manee\.codex\skills\rms-project\SKILL.md
```

When the project architecture changes, update this file so future work keeps following the current codebase.
