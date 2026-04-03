# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MyDNA Insurance Agent** — A privacy-first genetic insurance DApp for the NEAR Buidl 2026 Hackathon (deadline: April 20, 2026). The app analyzes sensitive genetic data inside a Trusted Execution Environment (TEE) and recommends personalized insurance products without exposing genetic information to insurers.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, Framer Motion, Zod v4, Luxon, next-intl
- **Backend**: Next.js Server Actions (no separate API layer), Drizzle ORM, Turso (Edge SQLite via `@libsql/client`)
- **Web3**: NEAR Protocol (IronClaw TEE, Confidential Intents, Chain Signatures), near-api-js, @near-wallet-selector, Noir ZKP circuits (`circuits/insurance_eligibility/`)
- **UI extras**: Sonner (toasts), react-hook-form + @hookform/resolvers, next-themes, Pretendard font

## Common Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint

# Drizzle ORM
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations to Turso DB
npx drizzle-kit studio     # Open Drizzle Studio (DB browser)

# Seed the DB
npx tsx src/lib/db/seed.ts
```

Required env vars in `.env.local`:
```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## Source Structure

```
src/
├── app/                    # Next.js App Router pages & layouts
├── components/
│   ├── ui/                 # Shadcn/ui primitives (button, card, dialog, etc.)
│   └── modules/            # Domain components (DNA upload, insurance recommendations)
├── lib/
│   ├── db/
│   │   ├── schema.ts       # All Drizzle table definitions + Zod insert schemas + inferred types
│   │   ├── index.ts        # Turso client + drizzle instance (export: db)
│   │   └── seed.ts         # Insurance product seed data
│   └── near/               # Wallet, Chain Signatures, TEE utils (to be built)
├── actions/                # Next.js Server Actions (DB + blockchain calls)
└── types/                  # Shared Zod schemas and TypeScript types
circuits/
└── insurance_eligibility/  # Noir ZKP circuit for proving risk eligibility
drizzle/                    # Migration SQL files (committed, do not hand-edit)
```

## Database Schema (Turso / SQLite)

Six tables in `src/lib/db/schema.ts`. Each table has a co-located Zod insert schema.

| Table | Key columns |
|---|---|
| `user_profiles` | `wallet_address` (PK), `subscription_tier` (free/pro) |
| `insurance_products` | `id` (UUID), `coverage_category`, `chain_network`, `monthly_premium_usdc` |
| `analysis_sessions` | `id`, `wallet_address` (FK), `status` (pending→purged pipeline), `file_hash` |
| `analysis_results` | `id`, `session_id` (unique FK), `risk_profile` (JSON), `recommended_product_ids` (JSON), `zkp_proof_hash` |
| `recommendation_carts` | `id`, `wallet_address` (FK), `selected_product_ids` (JSON), `status` |
| `transactions` | `id`, `cart_id` (unique FK), `tx_hash`, `network`, `confidential_intents_used` |

`riskProfile` JSON shape: `{ oncology, cardiovascular, metabolic, neurological }` each with `{ level: "high"|"moderate"|"normal", flags: string[] }` — validated by `riskProfileSchema`.

Array-type columns (`riskTargets`, `selectedProductIds`, `recommendedProductIds`) are stored as JSON strings in SQLite; serialize/deserialize explicitly in Server Actions.

## Architecture: Three-Layer Privacy Model

**Layer 1 — Privacy Compute (TEE)**
Genetic data is encrypted (ECIES + AES-256-GCM) before transmission. Analysis runs inside IronClaw Runtime (NEAR TEE). Data is purged immediately after computation. In Phase 0 (hackathon demo), use a Mock TEE (plain Node.js functions with the same interface).

**Layer 2 — Edge Database (Metadata only)**
Turso stores insurance product catalog, user profiles, and session data. Raw genetic data is **never** stored here — this is an absolute architectural constraint. Drizzle ORM with Zod integration for type-safe queries.

**Layer 3 — Web3 Trust (Smart Contracts)**
NEAR Confidential Intents for private settlement, Chain Signatures for multi-chain insurance aggregation, Noir ZKP circuits to prove eligibility without revealing risk scores.

## Documentation Structure (365 Principle)

All docs follow a strict 5-layer hierarchy under `docs/`:

| Directory | Purpose |
|---|---|
| `01_Concept_Design/` | Business vision, value proposition, revenue model |
| `02_UI_Screens/` | User flows, design system tokens, animation specs |
| `03_Technical_Specs/` | Architecture, NEAR stack guide, project setup |
| `04_Logic_Progress/` | Business logic, roadmap, phased milestones |
| `05_QA_Validation/` | Security checklist, compliance validation |

New documentation must go into the matching directory. Do not create docs outside this structure.

## Development Conventions (from AGENTS.md)

- **Plan before code**: Always present a plan and get explicit approval before making code changes.
- **Commits**: Use Conventional Commits — `type(scope): description` with Korean detail lines. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- **Validation**: Use Zod for all schema validation. Use Luxon for all date/time operations.
- **TypeScript**: Strict mode required throughout.
- **Environment**: `.env.local` / `.env.development` for local. Only `NEXT_PUBLIC_*` vars are client-safe. Never commit `.env*` files.
- **No console.log** before merging.
- **No emojis** in code, commits, or communication.
- **No tech stack downgrade**: Always use the official stack (Zod, Luxon, NEAR SDK). No substitutions.

## Key Security Rules

- Genetic data must **never** be stored in Turso or any persistent storage.
- All genetic data processing occurs in TEE volatile memory and is purged immediately.
- API routes must include guard clauses and CSRF protection.
- Backup DB before any destructive migration.
