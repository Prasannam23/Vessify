# Overall Architecture & Flow

## Component Map
- Client: Next.js 15 App Router (login, register, dashboard).
- Auth: NextAuth Credentials (frontend) + Better Auth (backend) issuing JWT.
- API Gateway: Hono server exposing `/api/auth/*` and `/api/transactions/*`.
- Data: PostgreSQL via Prisma.

## Request Lifecycles
### Register
1. User submits form on `/register`.
2. Frontend POST `/api/auth/register` (backend) with name/email/password.
3. Backend creates user, returns token + user payload.
4. Frontend immediately `signIn(credentials)`; on success hard-redirects to `/`.

### Login
1. User submits form on `/login`.
2. `signIn(credentials, redirect:false)` posts to backend `/api/auth/login`.
3. NextAuth callback stores JWT as `accessToken`; hard-redirects to `/`.
4. Middleware prevents returning to `/login` or `/register` when session exists.

### Dashboard (protected)
1. Middleware checks session token; redirects to `/login` if absent.
2. On load, components fetch with axios (token injected via `getSession`).
3. `TransactionExtractor` POST `/api/transactions/extract` with pasted text.
4. `TransactionsList` GET `/api/transactions?limit&cursor`; supports delete via DELETE `/api/transactions/:id`.
5. `TransactionStats` GET `/api/transactions/stats`.
6. Refresh key in page triggers refetch after mutations.

### Cursor Pagination
- Query: `/api/transactions?limit=10&cursor=<lastId>`.
- Response: `{ items, nextCursor }` where `nextCursor` is null when done.
- UI: Appends `items`; hides "Load more" when `nextCursor` missing.

### Data Isolation
- Backend ties all queries to authenticated `userId` (and organization scope if present).
- Every CRUD operation filters by `userId`; unauthorized IDs return 404/401.
- Tokens include user identity; middleware enforces before route handlers.

## Deployment/Runtime Flow
- Frontend served from Vercel/Node; env `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
- Backend served from Railway/Node; env `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PORT`.
- DB migrations applied via `prisma migrate deploy` in CI/CD.

## Error Paths
- Auth failure → 401 from backend → NextAuth shows error and stays on login; axios 401 handler redirects to `/login`.
- Extraction parse error → 400 with message → UI shows toast/error state.
- Pagination fetch failure → UI shows error, keeps existing items.
- Delete unauthorized/not-found → 404/401 → UI shows toast but keeps list unchanged.

## Observability
- NextAuth debug logs (disable in prod).
- Backend console logs for requests/errors; can integrate with hosted logging.
