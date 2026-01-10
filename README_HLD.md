# High-Level Design (HLD)

## Objectives
- Provide secure email/password auth via Better Auth backend and NextAuth frontend.
- Enable paste-based transaction extraction from unstructured text into structured records.
- Support cursor-based pagination, stats, and deletion with user-level data isolation.
- Ship deployable stacks (frontend: Next.js 15; backend: Hono + Prisma + PostgreSQL).

## System Overview
- Clients: Web UI (Next.js App Router) served from Vercel (or Node host).
- Backend: Hono API on Node (Better Auth + Prisma) deployed to Railway/Node host.
- Database: PostgreSQL (Prisma-managed schema and migrations).
- Auth: JWT access tokens issued by Better Auth; consumed by NextAuth Credentials provider; sessions stored client-side.
- Observability: Console logs + NextAuth debug logs (can disable in production).

## Core Capabilities
- User registration & login with credentials; protected routes with NextAuth session.
- Transaction extraction from free text into structured rows (amount, date, merchant, category, type).
- Transaction listing with cursor pagination (forward pagination) and deletion.
- Transaction statistics (totals, by type, by category).
- Data isolation by `userId` (and implicit org/user scoping via DB queries).

## High-Level Architecture
- Frontend (Next.js)
  - Pages: `/login`, `/register` (public); `/` dashboard (protected).
  - Components: extractor, transactions list (cursor pagination), stats.
  - Auth: NextAuth Credentials provider; axios interceptor injects access token.
- Backend (Hono)
  - Routes: `/api/auth/register`, `/api/auth/login`, `/api/transactions` (CRUD, extract, stats).
  - Middleware: auth guard (Better Auth), rate limit.
  - Services: transaction parsing, DB access via Prisma.
- Database (PostgreSQL via Prisma)
  - Models: `User`, `Transaction` (fields: id, userId, organizationId nullable, amount, type, category, merchant, description, date, createdAt, updatedAt).

## Data Flow (Happy Path)
1) Register: Frontend POST `/api/auth/register` → backend creates user, returns token → frontend auto-signs in via NextAuth Credentials → session stores `accessToken`.
2) Login: Frontend `signIn(credentials)` → backend `/api/auth/login` issues JWT → NextAuth stores token; axios interceptor uses it for API calls.
3) Extract: User pastes text → frontend POST `/api/transactions/extract` with bearer token → backend parses text → creates transactions tied to `userId` → returns rows → UI refreshes list/stats.
4) List & Paginate: Frontend GET `/api/transactions?cursor=<id>&limit=<n>` → backend returns `items` + `nextCursor` → UI appends results.
5) Stats: Frontend GET `/api/transactions/stats` → backend aggregates totals/by type/by category per user.
6) Delete: Frontend DELETE `/api/transactions/:id` → backend verifies ownership → removes row → UI refreshes list/stats.

## Non-Functional Notes
- Security: JWT signed server-side; bearer token on API calls; middleware enforces auth; rate limiting enabled.
- Performance: Cursor pagination for scalable lists; batching extraction; lightweight Hono stack.
- Reliability: Prisma migrations; typed schemas; validation via zod.
- Deployability: Environment-driven configuration; separate frontend/backend deploys.
