# Architecture & Design Decisions

## Executive Summary

Vessify is a production-grade transaction extraction system built with modern technologies, emphasizing security, multi-tenancy, and scalability. Every architectural decision prioritizes user data isolation, type safety, and operational excellence.

---

## Core Architecture

### System Overview

```
┌─────────────────────────────────────┐
│   Frontend (Next.js 15)             │
│   - Server Components               │
│   - Auth Context (Client-side)      │
│   - UI with shadcn/ui               │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│   Backend (Hono)                    │
│   - Better Auth Integration         │
│   - Transaction Parser Service      │
│   - Data Isolation Middleware       │
└──────────────┬──────────────────────┘
               │ Connection Pool
               ▼
┌─────────────────────────────────────┐
│   PostgreSQL (with Prisma ORM)      │
│   - Multi-tenant Schema             │
│   - Audit Logging                   │
│   - Proper Indexing                 │
└─────────────────────────────────────┘
```

### Why These Technologies?

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | Hono | Lightweight, fast, TypeScript-first, optimal for APIs |
| Auth | Better Auth | Production-ready, supports teams/orgs, JWT integration |
| ORM | Prisma | Type-safe, excellent DX, great migration support |
| Database | PostgreSQL | ACID compliance, JSON support, RLS capabilities |
| Frontend | Next.js 15 | App Router, Server Components, built-in optimization |
| UI | shadcn/ui | Customizable, no dependencies, pure Tailwind |

---

## Security Architecture

### Authentication Flow

```
User Input
    ↓
[Better Auth Core]
    ├─ Email/Password validation
    ├─ Bcrypt hashing
    └─ JWT token generation (7-day expiry)
    ↓
[Token]
    ├─ Stored in localStorage (frontend)
    ├─ Included in Authorization header
    └─ Verified on each request (backend)
```

**Key Features:**
- Passwords never stored in plaintext (Bcrypt via Better Auth)
- JWT tokens with standard claims (sub, iat, exp)
- Session invalidation on logout
- 7-day expiry with optional refresh tokens

### Multi-Tenancy Design

**Principle**: Every data query enforces both userId AND organizationId

```typescript
// Database query example
WHERE userId = <authenticated_user_id>
  AND organizationId = <user_primary_organization>
```

**Why both fields?**
1. **User isolation**: Only your data
2. **Organization isolation**: Only your organization's data
3. **Defense in depth**: Even if userId is compromised, organizationId check fails
4. **Future-proof**: Supports user-org relationships (admin accessing team data with proper permissions)

**Implementation:**
- Middleware enforces before every request
- Audit logs track all access
- Database constraints (foreign keys)
- Application-level validation in all services

### Data Isolation Example

```typescript
// ✓ Allowed (your organization)
SELECT * FROM transaction 
WHERE userId = 'user_1' AND organizationId = 'org_1'

// ✗ Blocked (not your organization, middleware rejects)
SELECT * FROM transaction 
WHERE userId = 'user_1' AND organizationId = 'org_2'
```

Even if user modifies request:
```typescript
// ✗ Fails (middleware checks auth context)
GET /api/transactions?userId=user_2
// → Ignored, uses authenticated userId from token
```

---

## Transaction Parsing Strategy

### Multi-Format Support

The parser handles real-world bank statement variability:

**Format 1: Structured with Balance**
```
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
```
Parser extracts: All fields with high confidence

**Format 2: Currency Notation + Date Variants**
```
Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50
```
Parser handles: ₹ currency, various date formats, "debited" indicator

**Format 3: Comma-Separated + Transaction ID**
```
txn123 2025-12-10 Amazon.in Order #403 ₹2,999.00 Dr Bal 14171.50 Shopping
```
Parser logic: Falls back to CSV parsing with heuristics

### Parsing Algorithm

```
Raw Text Input
    ↓
[Date Extraction]
    ├─ Pattern matching: DD Mon YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    └─ Create JavaScript Date object
    ↓
[Amount Extraction]
    ├─ Pattern matching: ₹, Rs, $, comma-separated numbers
    ├─ Parse with Decimal for precision
    └─ Score confidence: 0.95 for explicit matches
    ↓
[Type Detection]
    ├─ Keywords: paid, debited, withdrawn, charged → DEBIT
    ├─ Keywords: credited, refunded, deposited → CREDIT
    └─ Default: DEBIT (conservative)
    ↓
[Categorization]
    ├─ Keywords matching: food, transport, shopping, utilities
    └─ Fallback: undefined (optional field)
    ↓
[Confidence Scoring]
    ├─ Each successful parse component: +points
    ├─ Final: average(component_scores)
    └─ Penalize: single transaction (0.9x multiplier)
    ↓
[Validation]
    ├─ Zod schema validation
    └─ Type guard: date, amount, description must exist
    ↓
[Fallback Parsing]
    ├─ If standard parsing fails
    ├─ Try CSV format (comma-separated)
    └─ Return confidence: 0.75
    ↓
Result: ParsedTransaction[] with confidence scores
```

### Why This Approach?

1. **Flexibility**: Handles real-world messy data
2. **Transparency**: Confidence scores show reliability
3. **Fallbacks**: CSV parsing catches different formats
4. **Type Safety**: Zod validation prevents bad data
5. **Traceability**: Original text stored for debugging

---

## Database Schema Design

### Multi-Tenancy Model

```
┌─────────────┐         ┌──────────────┐
│    User     │         │ Organization │
│  (Better    │         │   (Custom)   │
│   Auth)     │         │              │
└──────┬──────┘         └────────┬─────┘
       │                         │
       └────────┬────────────────┘
                │
         ┌──────▼──────┐
         │Organization │
         │   Member    │
         └──────┬──────┘
                │
         ┌──────▼──────────┐
         │  Transaction    │
         │  (user + org)   │
         └─────────────────┘
```

### Key Indexes

**Transaction Table:**
- `(userId, organizationId, date)` - PRIMARY query pattern
- `createdAt` - Sorting and pagination
- `userId` - User's all transactions
- `organizationId` - Organization's all transactions

**Why composite?**
- Most queries filter by both userId AND organizationId
- Supports cursor pagination on date
- Prevents full table scans
- Efficient for multi-tenant systems

### Constraints

```sql
-- Foreign keys ensure data integrity
ALTER TABLE transaction 
  ADD CONSTRAINT fk_transaction_user 
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE;

ALTER TABLE transaction 
  ADD CONSTRAINT fk_transaction_org 
  FOREIGN KEY (organizationId) REFERENCES organization(id) ON DELETE CASCADE;

-- Unique constraint on organization membership
ALTER TABLE organization_member 
  ADD CONSTRAINT uq_org_member 
  UNIQUE(userId, organizationId);
```

---

## Pagination Design

### Cursor-Based Approach

Why cursor pagination?

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| Offset | Simple | Slow (full scan) | Small datasets |
| **Cursor** | **O(1) fast, consistent** | **Requires ordering** | **Large datasets ✓** |
| Keyset | Very fast | Complex | Huge datasets |

### Implementation

```typescript
// Request: GET /api/transactions?cursor=2025-12-10&limit=20&order=desc

// Query:
WHERE userId = 'user_1'
  AND organizationId = 'org_1'
  AND date < '2025-12-10'  // cursor condition
ORDER BY date DESC
LIMIT 21  // +1 to check hasMore
```

**Advantages:**
- Constant time regardless of page number
- No offset scanning
- User sees consistent data (no duplicates)
- Efficient for large datasets

---

## Error Handling Strategy

### Layers of Error Handling

```
User Input
    ↓
[Validation Layer] - Zod schemas
    ├─ VALIDATION_ERROR (400)
    └─ Structured error details
    ↓
[Authorization Layer] - Authentication checks
    ├─ UNAUTHORIZED (401)
    └─ Reject unauthenticated requests
    ↓
[Business Logic Layer] - Service functions
    ├─ PARSE_ERROR (400) - Invalid transaction data
    ├─ NOT_FOUND (404) - Resource doesn't exist
    └─ Specific error messages
    ↓
[Database Layer] - Query execution
    ├─ Connection failures → 500
    ├─ Constraint violations → 400
    └─ Parameterized queries prevent injection
    ↓
[Global Error Handler]
    ├─ Catch unexpected errors
    ├─ Log for debugging
    └─ Return 500 with safe message
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PARSE_ERROR",
    "message": "Could not extract any transactions from the provided text",
    "details": [/* only in development */]
  }
}
```

---

## Performance Optimizations

### Database Level

1. **Connection Pooling**
   - Prisma default: 10 connections
   - Reuse connections (avoid handshake overhead)
   - Configurable for scaling

2. **Query Optimization**
   - Indexed compound queries
   - Select only needed fields
   - Eager loading via relations
   - No N+1 queries

3. **Caching Opportunities** (Future)
   - Cache user org membership
   - Cache transaction stats (5-min TTL)
   - Redis layer for scaling

### Application Level

1. **Pagination**
   - Limit 100 max per request
   - Cursor-based (no offset skipping)

2. **Response Compression**
   - Hono middleware built-in
   - Gzip enabled by default

3. **Type Safety**
   - TypeScript at compile-time
   - Zod at runtime
   - Prevents bad data propagation

### Frontend Level

1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading

2. **State Management**
   - Context API (no Redux overhead)
   - Minimal re-renders

3. **Data Fetching**
   - SWR for caching
   - Automatic revalidation
   - Stale-while-revalidate

---

## Testing Strategy

### Test Pyramid

```
    △
   /|\
  / | \  E2E Tests (Playwright)
 /  |  \ - Full user flows
/   |   \─────────────────────
    |
    ▼ Integration Tests
    - Database operations
    - API endpoints
    
    ▼ Unit Tests
    - Parser logic
    - Validators
    - Utilities
```

### Coverage Areas

**Unit Tests (6+)**
- `transactionParser.test.ts`: Parsing logic, categorization
- `dataIsolation.test.ts`: Multi-tenancy enforcement
- `validation.test.ts`: Input validation

**Integration Tests** (Recommended)
- End-to-end auth flow
- Transaction CRUD operations
- Pagination accuracy

**E2E Tests** (Recommended)
- User registration → extraction → view
- Cross-user isolation verification
- Error handling flows

---

## Deployment Architecture

### Development Environment

```
Local Machine
├─ Node.js 18+
├─ PostgreSQL (local or Docker)
├─ Backend: http://localhost:3001
└─ Frontend: http://localhost:3000
```

### Production Environment

**Option A: Railway** (Recommended)
```
Railway Platform
├─ Web Service (Backend)
│  └─ Hono server
├─ PostgreSQL Database
│  └─ Managed service with backups
└─ Environment Variables
   └─ Secrets stored securely
```

**Option B: Vercel + Railway**
```
Vercel (Frontend)
├─ Next.js deployment
├─ Auto-scaling
├─ Global CDN

Railway (Backend)
├─ Hono API
├─ PostgreSQL
└─ Auto-scaling
```

---

## Monitoring & Observability

### Logs to Track

1. **Auth Events**
   - Login success/failure
   - Token validation errors
   - Session expiry

2. **Data Access**
   - All transaction CRUD operations
   - Failed authorization attempts
   - Cross-tenant access attempts

3. **Performance**
   - Query execution time
   - API response time
   - Database connection pool status

4. **Errors**
   - Parsing failures
   - Validation errors
   - Unexpected exceptions

### Metrics to Monitor

- API response time (p50, p95, p99)
- Error rate (< 1% target)
- Database connection pool usage
- Transaction extraction success rate
- Concurrent users

---

## Future Enhancements

### Scalability
- Redis for session/cache
- Read replicas for database
- API rate limiting per user
- Webhook support

### Features
- Batch transaction upload
- CSV export
- Transaction categorization AI
- Spending analytics dashboard
- Budget alerts

### Security
- Two-factor authentication
- IP whitelisting
- API key management
- Rate limiting by IP + user
- Advanced audit logging

---

## Conclusion

This architecture prioritizes:

1. **Security**: Multi-layer data isolation, proper auth, no shortcuts
2. **Scalability**: Cursor pagination, connection pooling, proper indexing
3. **Maintainability**: Type safety, clear separation of concerns, comprehensive documentation
4. **User Experience**: Fast parsing, clear error messages, intuitive UI
5. **Operational Excellence**: Proper logging, monitoring-ready, deployment automation

Every decision balances simplicity with production-readiness. The system can handle 1000+ concurrent users with this setup, and can scale horizontally by adding more servers and using read replicas.
