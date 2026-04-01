# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MyDNA Insurance Agent** — A privacy-first genetic insurance DApp for the NEAR Buidl 2026 Hackathon (deadline: April 20, 2026). The app analyzes sensitive genetic data inside a Trusted Execution Environment (TEE) and recommends personalized insurance products without exposing genetic information to insurers.

This project is currently in the **planning and documentation phase**. No implementation code exists yet.

## Tech Stack (Planned)

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS v4, Shadcn/ui, Framer Motion, Zod, Luxon, next-intl
- **Backend**: Next.js Server Actions (no separate API layer), Drizzle ORM, Turso (Edge SQLite)
- **Web3**: NEAR Protocol (IronClaw TEE, Confidential Intents, Chain Signatures), near-api-js, @near-wallet-selector, Noir (ZKP circuits), @nearai/client

## Setup Commands (Once Development Begins)

```bash
# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Add Shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog progress alert badge table

# Install dependencies
npm i drizzle-orm @libsql/client near-api-js @nearai/client
npm i @near-wallet-selector/core @near-wallet-selector/my-near-wallet @near-wallet-selector/modal-ui
npm i framer-motion zod luxon next-intl
npm i -D drizzle-kit dotenv @types/luxon

# Local Turso DB
turso auth login
turso db create mydna-local --type embedded-replicas
```

## Intended Source Structure

```
src/
├── app/                    # Next.js App Router pages & layouts
├── components/
│   ├── ui/                 # Shadcn/ui primitives
│   └── modules/            # Domain components (DNA upload, insurance recommendations)
├── lib/
│   ├── db/
│   │   ├── schema.ts       # Drizzle ORM schemas
│   │   └── index.ts        # Turso connection
│   └── near/               # Wallet, Chain Signatures, TEE utils
├── actions/                # Next.js Server Actions (DB + blockchain calls)
└── types/                  # Shared Zod schemas and TypeScript types
```

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
