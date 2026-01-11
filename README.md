# Vessify – Transaction Extractor

A production-ready personal finance transaction parser with secure authentication, multi-tenancy, and data isolation. Extract unstructured bank statements into structured, searchable transaction records with end-to-end encryption and user-scoped isolation.

## 🎯 Overview

Vessify demonstrates a secure, scalable architecture for handling sensitive financial data. Users register with email/password, extract transactions from free-form text (SMS, email, PDF excerpts), and view their personal transaction history with full data isolation guarantees.

**Key Features:**
- Secure email/password authentication with JWT tokens (7-day expiry)
- Multi-tenant organization support via Better Auth
- Transaction extraction from 3 unstructured formats (Starbucks, Uber, Amazon-style)
- Cursor-based pagination for scalable transaction listing
- Real-time transaction statistics (totals by type/category)
- Strict data isolation: no cross-user data leakage
- Production-ready error handling and validation

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Auth.js (NextAuth) |
| **UI Library** | shadcn/ui + Tailwind CSS (professional white/black/grey theme) |
| **Backend** | Hono + TypeScript + Better Auth |
| **Database** | PostgreSQL + Prisma ORM |
| **Testing** | Jest (6 test suites covering auth, extraction, isolation) |
| **Deployment** | Vercel (frontend) + Render (backend + managed PostgreSQL) |

---

## 🚀 Live Deployment

- **Frontend:** https://vessify-zeta.vercel.app
- **Backend API:** https://vessify-mwpj.onrender.com
- **Database:** Render PostgreSQL (production)

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL 14+ (or use Render managed DB)
- Git

### Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# 3. Create database tables
npm run db:push

# 4. Seed test users and organizations
npm run db:seed

# 5. Run development server
npm run dev
```

**Backend runs on:** `http://localhost:3001`

**Available endpoints:**
```
POST   /api/auth/register           - Register new user
POST   /api/auth/login              - Login and get JWT
GET    /api/auth/session            - Get current session
POST   /api/auth/sign-out           - Sign out user
POST   /api/transactions/extract    - Extract transactions from text
GET    /api/transactions            - List user transactions (paginated)
GET    /api/transactions/stats      - Get transaction statistics
DELETE /api/transactions/:id        - Delete a transaction
GET    /health                      - Health check
```

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set NEXT_PUBLIC_API_URL to your backend URL

# 3. Run development server
npm run dev
```

**Frontend runs on:** `http://localhost:3000`

**Available pages:**
```
/                - Dashboard (protected) with transaction extractor & list
/login           - Login page
/register        - Registration page
```

---

## 👥 Test Users

Two pre-seeded test organizations with users:

| Email | Password | Organization |
|-------|----------|--------------|
| `testuser1@example.com` | `password123` | Test Organization 1 |
| `testuser2@example.com` | `password123` | Test Organization 2 |

**To test data isolation:**
1. Log in as testuser1 → extract transactions
2. Log out, log in as testuser2 → verify testuser1's transactions are invisible
3. Attempt API call with testuser2's token for testuser1's transaction ID → 403 Unauthorized

---

## 🔐 Data Isolation Strategy

Vessify implements **multi-layer data isolation** to prevent cross-user data leakage:

1. **Better Auth Organizations:** Every user belongs to an organization. Better Auth's team/org feature ensures session claims include the user's organization context.

2. **Database-Level Filtering:** Every Prisma query in the backend includes `WHERE userId = session.user.id` or `WHERE organizationId = session.org.id`. Transactions are scoped to the authenticated user/org at query time, not just via UI hiding.

3. **Middleware Enforcement:** The auth middleware extracts and validates the JWT, injecting the user/org context into the Hono context. Protected routes verify this context before processing requests.

4. **Bonus – PostgreSQL RLS (if enabled):** Row-Level Security policies can further lock down the database, ensuring even a compromised backend cannot access rows outside the session's org.

**Result:** An attacker cannot modify their JWT to see another user's data; the backend enforces isolation regardless of input manipulation.

---

## 🧪 Testing

### Run Jest Tests

```bash
cd backend

npm run test
```

**Test Coverage:**
- ✅ `dataIsolation.test.ts` — Verify userId filtering in queries
- ✅ `isolation-unit.test.ts` — Unit tests for isolation logic
- ✅ `extraction.test.ts` — Transaction extraction API
- ✅ `parserSamples.test.ts` — All 3 sample texts parse correctly
- ✅ `transactionParser.test.ts` — Parser edge cases (negative amounts, INR, dates)
- ✅ `validation.test.ts` — Zod schema validation

**Expected:** All 6 suites pass.

### Manual E2E Flow

1. **Register:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Extract Sample 1 (Starbucks):**
   ```bash
   curl -X POST http://localhost:3001/api/transactions/extract \
     -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"text":"Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50"}'
   ```

3. **List Transactions:**
   ```bash
   curl -X GET http://localhost:3001/api/transactions \
     -H "Authorization: Bearer <your-jwt-token>"
   ```

---

## 📋 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/vessify_db

# Better Auth Secrets (min 32 characters each)
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars-long-please-change-in-production
BETTER_AUTH_JWT_SECRET=your-jwt-secret-here-min-32-chars-long-please-change-in-production
JWT_SECRET=jwt-secret-for-token-signing-minimum-32-characters-long

# Server
PORT=3001
NODE_ENV=production

# CORS & Frontend
CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:3000
FRONTEND_URL=https://your-frontend-domain.com
BETTER_AUTH_URL=https://your-backend-domain.com

# Better Auth Features
BETTER_AUTH_ORG_FEATURES=teams
BETTER_AUTH_JWT_EXPIRES_IN=7d
```

### Frontend (.env)

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars-long
NEXTAUTH_URL=https://your-frontend-domain.com

# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
```

---

## 🏗 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/              # Better Auth, environment, JWT
│   │   ├── db/                  # Prisma client, seed, extensions
│   │   ├── middleware/          # Auth guard, rate limiting
│   │   ├── routes/              # /auth, /transactions
│   │   ├── services/            # Transaction parser, DB access
│   │   ├── types/               # TypeScript definitions
│   │   ├── utils/               # Token utils, validators, keepalive
│   │   ├── __tests__/           # Jest test suites
│   │   ├── index.ts             # Hono app setup (CORS, routes)
│   │   └── server.ts            # Node server entry point
│   ├── prisma/
│   │   ├── schema.prisma        # User, Org, Transaction, AuditLog models
│   │   └── migrations/          # Generated SQL migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout (Auth.js provider)
│   │   │   ├── page.tsx         # Dashboard (protected)
│   │   │   ├── login/           # /login page
│   │   │   ├── register/        # /register page
│   │   │   ├── api/auth/        # NextAuth route
│   │   │   └── globals.css      # Tailwind theme (white/black/grey)
│   │   ├── components/
│   │   │   ├── login-form.tsx   # shadcn form
│   │   │   ├── register-form.tsx
│   │   │   ├── transaction-extractor.tsx
│   │   │   ├── transactions-list.tsx
│   │   │   ├── transaction-stats.tsx
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios client with auth
│   │   │   ├── auth.ts          # NextAuth Credentials provider
│   │   │   └── auth-context.tsx
│   │   └── types/               # TypeScript definitions
│   ├── middleware.ts            # NextAuth middleware
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── README.md (this file)
├── ARCHITECTURE.md              # System architecture deep-dive
├── DEPLOYMENT.md                # Production deployment guide
├── README_HLD.md                # High-level design document
├── README_LLD.md                # Low-level design & implementation
└── OVERALL_ARCH_FLOW.md         # Full flow diagrams
```

---

## 🔄 Authentication Flow

### Registration
```
User → Frontend (register form)
     → Backend POST /api/auth/register
     → Better Auth hashes password, creates user
     → Backend returns JWT token
     → Frontend stores token via NextAuth
     → Redirect to dashboard
```

### Login
```
User → Frontend (login form)
     → NextAuth Credentials provider
     → Backend POST /api/auth/login
     → Better Auth validates credentials
     → Backend issues JWT (7-day expiry)
     → NextAuth session stores token
     → All subsequent API calls include Bearer token
```

### Protected Routes
```
Unauthenticated user visits /
     → NextAuth middleware checks session
     → No valid session → redirect to /login
     
Authenticated user visits /api/transactions
     → Auth middleware extracts Bearer token from headers
     → Verifies JWT signature & expiry
     → Injects user/org context into Hono context
     → Queries filtered by userId
     → Returns user's transactions only
```

---

## 💡 Key Implementation Details

### Better Auth Integration
- **Backend:** `betterAuth.ts` initializes Better Auth with `emailPassword` strategy; `auth.ts` middleware verifies tokens.
- **Frontend:** `auth.ts` NextAuth Credentials provider calls `/api/auth/login`, receives JWT, stores in session.
- **Token Refresh:** JWTs expire in 7 days; manual re-login required (can extend with refresh tokens).

### Transaction Parsing
- **Regex-based extraction** of dates, amounts (INR & decimal), descriptions, merchants, balances.
- **Type inference:** Negative amounts → debit; positive → credit.
- **Category inference:** Keywords (Amazon → shopping, Starbucks → food, Uber → travel).
- **Confidence score:** 0.0–1.0 based on field extraction success.

### Pagination
- **Cursor-based:** Uses transaction ID as cursor; avoids offset issues on large tables.
- **Forward pagination:** `GET /api/transactions?cursor=<id>&limit=20` returns next 20 items.
- **Index optimization:** `(userId, createdAt)` composite index for fast filtering.

### Multi-Tenancy
- **Organizations table:** Each user belongs to an org (or personal org auto-created at signup).
- **OrganizationMember junction:** Tracks role (owner/member) and join date.
- **Query pattern:** `WHERE userId = auth.user.id AND organizationId = auth.org.id` ensures isolation.

---

## 🛡️ Security Highlights

- **Password hashing:** Via Better Auth (bcryptjs) — never stored plaintext.
- **JWT signing:** Signed with `JWT_SECRET` (min 32 chars); verified on every request.
- **CORS:** Whitelist frontend domains only; reject cross-origin requests.
- **Rate limiting:** Middleware checks per-user request count (optional add-on).
- **Input validation:** Zod schemas on all routes; sanitize text input before parsing.
- **SQL injection:** Prisma parameterized queries prevent SQL injection.
- **XSS prevention:** Next.js automatic escaping; React components auto-sanitize.

---

## 📊 Sample Data

### Extract Sample 1 (Starbucks)
```
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
```
**Parsed as:** Debit, ₹420, Starbucks, date: 2025-12-11, balance: 18420.50

### Extract Sample 2 (Uber)
```
Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50
```
**Parsed as:** Debit, ₹1250, Uber, date: 2025-12-11, category: travel

### Extract Sample 3 (Amazon)
```
txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
```
**Parsed as:** Debit, ₹2999, Amazon, date: 2025-12-10, category: shopping

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or run on different port
PORT=3002 npm run dev
```

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432

→ Ensure PostgreSQL is running locally or Render DB URL is correct
→ Test: psql $DATABASE_URL
```

### JWT Expired
```
Error: Unauthorized

→ User's 7-day JWT expired; log out and log in again via frontend
→ Or clear browser cookies/session storage
```

### CORS Error in Frontend
```
Access to XMLHttpRequest blocked by CORS policy

→ Ensure NEXT_PUBLIC_API_URL matches backend CORS_ORIGIN
→ Restart backend after changing CORS_ORIGIN env var
```

---

## 📈 Performance & Scalability

- **Cursor pagination:** O(1) lookup time; handles millions of transactions.
- **Composite indexes:** `(userId, createdAt)` and `(organizationId, date)` optimize queries.
- **Connection pooling:** Prisma auto-manages PostgreSQL connections (10–20 pool size).
- **Caching:** NextAuth session cached client-side; reduces backend load.
- **Compression:** Hono gzip middleware on responses; reduces bandwidth.

---

## 🔄 Development Workflow

### Adding a New Transaction Field

1. **Update Prisma schema** (`backend/prisma/schema.prisma`):
   ```prisma
   model Transaction {
     ...
     newField String?
   }
   ```

2. **Create migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_new_field
   ```

3. **Update API route** (`backend/src/routes/transactions.ts`):
   ```typescript
   const extractedData = parseTransactionText(text);
   // add: extractedData.newField
   ```

4. **Update frontend component** to display new field.

5. **Run tests:**
   ```bash
   npm run test
   ```

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Full system architecture, data flow, and design decisions.
- **[README_HLD.md](./README_HLD.md)** — High-level design; capabilities and non-functional requirements.
- **[README_LLD.md](./README_LLD.md)** — Low-level implementation details and code structure.
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Step-by-step production deployment on Vercel + Render.
- **[OVERALL_ARCH_FLOW.md](./OVERALL_ARCH_FLOW.md)** — Flow diagrams (ASCII/Mermaid).

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m "Add my feature"`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a pull request

---

## ✅ Submission Checklist

- ✅ Backend: Hono + Better Auth + Prisma deployed to Render
- ✅ Frontend: Next.js 15 + Auth.js + shadcn/ui deployed to Vercel
- ✅ Database: PostgreSQL with multi-tenancy schema
- ✅ Tests: 6 Jest suites covering all sample texts + isolation
- ✅ Auth: Secure email/password + JWT + session handling
- ✅ Pagination: Cursor-based transaction listing
- ✅ Data isolation: User-scoped queries + middleware enforcement
- ✅ Documentation: README + HLD + LLD + Architecture + Deployment

---

## 📞 Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Check existing docs (ARCHITECTURE.md, README_LLD.md)
- Review test suites for usage examples

---

## 📄 License

This project is part of the Vessify internship assignment. All rights reserved.

---

**Last Updated:** January 11, 2026  
**Status:** Production Ready  
**Version:** 1.0.0
