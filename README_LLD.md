# Low-Level Design (LLD)

## Frontend (Next.js 15, App Router)
- Auth
  - `src/lib/auth.ts`: NextAuth `authOptions` using Credentials provider against backend `/api/auth/login`.
  - `src/types/next-auth.d.ts`: Session/User augmentation to carry `accessToken` and user metadata.
  - `middleware.ts`: Protects all routes except `/login`, `/register`; redirects authenticated users away from auth pages.
  - `src/lib/api.ts`: Axios instance with request interceptor fetching `getSession()` and injecting `Authorization: Bearer <token>`; 401 handler redirects to `/login`.
- Pages
  - `src/app/login/page.tsx`: Uses `useSession`; renders `LoginForm`; hard redirect to `/` on successful sign-in.
  - `src/app/register/page.tsx`: Uses `useSession`; renders `RegisterForm`; registers then auto signs-in and hard redirects to `/`.
  - `src/app/page.tsx`: Protected dashboard; renders extractor, list, stats; maintains `refreshKey` to refetch child data.
- Components
  - `components/login-form.tsx`: `signIn("credentials", redirect:false)`; on success `window.location.href = "/"`.
  - `components/register-form.tsx`: POST `/api/auth/register`, then `signIn`; hard redirect to `/` or `/login` fallback.
  - `components/transaction-extractor.tsx`: Textarea input; POST `/api/transactions/extract`; shows success/error; calls `onSuccess` to refresh list/stats.
  - `components/transactions-list.tsx`: Fetches with cursor pagination (`limit`, `cursor`); displays table; supports delete with DELETE `/api/transactions/:id`; supports "Load more" button.
  - `components/transaction-stats.tsx`: GET `/api/transactions/stats`; displays totals, by type, by category.
  - UI kit under `components/ui/*` from shadcn.
- Lib
  - `src/lib/auth-context.tsx` is no longer used (superseded by NextAuth) but retained historically; middleware prevents missing provider issues.

## Backend (Hono + Better Auth + Prisma)
- Entry
  - `src/server.ts`: Starts Hono app, mounts routes, applies middleware (auth, rate limit), uses Prisma client from `db/prisma.ts`.
  - `src/index.ts`: Exports app for deployment.
- Config
  - `config/env.ts`: Loads env vars (DB, JWT secrets, ports).
  - `config/auth.ts` & `config/betterAuth.ts`: Better Auth setup (JWT signing, token TTL, hashing, adapters).
- Middleware
  - `middleware/auth.ts`: Verifies JWT via Better Auth; attaches user to context.
  - `middleware/rateLimit.ts`: Basic request limiting.
- Routes
  - `routes/auth.ts`: `/api/auth/register`, `/api/auth/login`; returns tokens and user payload.
  - `routes/transactions.ts`: CRUD + extract + stats; all protected.
- Services
  - `services/userService.ts`: User creation, lookup.
  - `services/transactionDb.ts`: DB accessors for transactions (create, list with cursor, delete, stats).
  - `services/transactionParser.ts`: Text parsing for transactions (multiple sample patterns supported).
- DB Layer
  - `db/prisma.ts`: Prisma client singleton; `prismaExtensions.ts` for helpers; `context.ts` for request-scoped context; `seed.ts` for sample data.
  - `prisma/schema.prisma`: Models `User`, `Transaction`; migrations folder for DB evolutions.
- Types
  - `types/index.ts` and `types/custom.d.ts`: Shared types for auth and transactions.

## API Contracts (key routes)
- POST `/api/auth/register` → { success, token, user }
- POST `/api/auth/login` → { success, token, user }
- POST `/api/transactions/extract` body `{ text }` → { items: Transaction[] }
- GET `/api/transactions?limit&cursor` → { items, nextCursor }
- DELETE `/api/transactions/:id` → { success }
- GET `/api/transactions/stats` → { totals, byType, byCategory }

## Validation & Error Handling
- Backend uses zod validators on auth and transaction payloads.
- Auth middleware returns 401 on missing/invalid token; routes ensure `userId` scoping.
- Extraction returns 400 on unparseable input; list/delete return 404 for missing/unauthorized records.

## Pagination Strategy
- Cursor pagination on `id` (or createdAt) via `cursor` + `take` in Prisma; returns `nextCursor` when more data exists.
- Frontend appends results and hides "Load more" when `nextCursor` is null.

## Security Considerations
- Passwords hashed (bcryptjs) before persistence.
- JWT signed with server secret; expiry enforced by Better Auth config.
- Rate limiting middleware on backend; frontend 401 redirect to `/login`.

## Deployment Notes
- Backend: set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PORT`; run `npm run build && npm start`.
- Frontend: set `NEXT_PUBLIC_API_URL` pointing to backend; `NEXTAUTH_URL`, `NEXTAUTH_SECRET`; deploy to Vercel/Node.
