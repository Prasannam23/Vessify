# Vessify Backend & Frontend – Full Setup and Usage

This README covers environment configuration, exact run commands for backend and frontend, seeded test users, and a quick demo showing cross-user isolation. It also summarizes our Better Auth integration approach for isolation and scalability.

## .env.example (Backend)
Create `backend/.env` using the following template:

```dotenv
# Database
DATABASE_URL="postgresql://user:password@host:5432/vessify_db"

# Better Auth / JWT
BETTER_AUTH_SECRET="your-secret-key-here-min-32-chars"
BETTER_AUTH_JWT_SECRET="your-jwt-secret-here-min-32-chars"
BETTER_AUTH_JWT_EXPIRES_IN="7d"
JWT_SECRET="jwt-secret-for-token-signing-min-32-chars"

# Better Auth Configuration
BETTER_AUTH_ORG_FEATURES="teams"
BETTER_AUTH_URL="http://localhost:3001"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS & Frontend URLs
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```

Frontend `.env.local` (create in `frontend/.env.local`):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Exact Commands to Run (Windows PowerShell)

### Backend
```powershell
cd backend
npm install

# Create env from example (then edit values)
copy .env.example .env

# Apply schema and seed sample data
npm run db:migrate
npm run db:seed

# Start the backend server
npm run dev
```
Backend runs at `http://localhost:3001`.

### Frontend
```powershell
cd frontend
npm install

# Create frontend env
(
  echo NEXT_PUBLIC_API_URL=http://localhost:3001
  echo NEXT_PUBLIC_APP_URL=http://localhost:3000
) > .env.local

# Start the Next.js dev server
npm run dev
```
Frontend runs at `http://localhost:3000`.

## Test User Credentials (Seeded)
We seed at least two users with distinct organizations:
- Email: `testuser1@example.com`, Password: `password123` (Organization: Test Organization 1)
- Email: `testuser2@example.com`, Password: `password123` (Organization: Test Organization 2)

These users and orgs are created by our seed script and are compatible with the Better Auth model.

## Quick Demo: Isolation in Action
Use the backend already running at `http://localhost:3001`.

```powershell
$api = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

# Login both users
$u1 = Invoke-RestMethod -Uri "$api/api/auth/login" -Method POST -Headers $headers -Body '{"email":"testuser1@example.com","password":"password123"}'
$u2 = Invoke-RestMethod -Uri "$api/api/auth/login" -Method POST -Headers $headers -Body '{"email":"testuser2@example.com","password":"password123"}'
$T1 = $u1.data.token
$T2 = $u2.data.token

# Fetch one transaction for user1
$txns = Invoke-RestMethod -Uri "$api/api/transactions?limit=1" -Headers @{ Authorization = "Bearer $T1" }
$TXN = $txns.data.items[0].id

# Sanity check: user2 session and empty list
curl.exe -s -i "$api/api/auth/session" -H "Authorization: Bearer $T2"
curl.exe -s -i "$api/api/transactions?limit=1" -H "Authorization: Bearer $T2"

# Cross-user delete attempt (should fail with 404 NOT_FOUND)
curl.exe -s -i -X DELETE "$api/api/transactions/$TXN" -H "Authorization: Bearer $T2"
```

Expected result: the delete by user2 is denied (`NOT_FOUND` / "Transaction not found or access denied").

## Better Auth Integration: Isolation & Scalability (Approach)
- We issue JWTs on login and set `userId` + `organizationId` context via `authMiddleware`, then enforce `protectedRoute` for authenticated endpoints.
- All data access validates membership (`validateUserOrgAccess`) and filters queries by both `userId` and `organizationId` (e.g., `getUserTransactions`, `updateTransaction`, `deleteTransaction`). This guarantees multi-tenant isolation.
- For scalability, we index common filters (`userId`, `organizationId`, `date`, `createdAt`) and use cursor-based pagination capped to 100 per page to keep queries efficient at scale.

## Tests
- Isolation unit/integration tests are included and passing:
  - See `backend/src/__tests__/dataIsolation.test.ts` and `backend/src/__tests__/isolation-unit.test.ts`.
- Run them:
```powershell
cd backend
npm test -- --testPathPattern=isolation
```

## Notes
- Health: `GET /health`
- Auth endpoints: `/api/auth`
- Transaction endpoints: `/api/transactions`

## Keepalive Options (Render/Railway)
- Internal keepalive: the server includes a production-only pinger that hits `/health` every 14 minutes (see `src/utils/keepalive.ts`). Configure `HEALTH_CHECK_URL=https://<your-backend-host>` and set `NODE_ENV=production` so `startKeepalive()` runs (see `src/server.ts`). Note: if the platform fully suspends the service, internal timers won’t fire while suspended.
- External keepalive (recommended): use GitHub Actions, UptimeRobot, or a cron service to ping `https://<your-backend-host>/health` every ~10–14 minutes. This repo includes a workflow: `.github/workflows/keepalive.yml`. Set the repository secret `HEALTH_CHECK_URL` to your backend base URL (without trailing slash).

---

For full architecture and deep-dive docs, see project root `ARCHITECTURE.md`, `TECHNICAL_DEEP_DIVE.md`, and `README_HLD.md`.