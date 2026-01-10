# Deployment Guide

This guide covers deploying Vessify to production across multiple platforms.

## Overview

Vessify consists of two parts:
- **Backend**: Hono server with Prisma ORM and PostgreSQL
- **Frontend**: Next.js 15 application

Both can be deployed independently or together.

## Quick Deploy Checklist

- [ ] Set up PostgreSQL database (managed service preferred)
- [ ] Generate secure secrets (BETTER_AUTH_SECRET, JWT_SECRET)
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test production endpoints
- [ ] Monitor and set up alerts

## Backend Deployment

### Prerequisites
- PostgreSQL database (production-grade)
- Node.js 18+ runtime
- Environment variables configured

### Option 1: Railway (Recommended)

Railway is perfect for this stack with built-in PostgreSQL.

#### Steps:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL**
   - Click "+ New Service"
   - Select "PostgreSQL"
   - Railway auto-configures the connection

4. **Configure Environment**
   ```
   BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
   JWT_SECRET=<generate with: openssl rand -base64 32>
   DATABASE_URL=<auto-populated by Railway>
   BETTER_AUTH_URL=https://your-app.up.railway.app
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Run Migrations**
   - In Railway dashboard, open terminal
   - Run: `npx prisma db push`
   - Run: `npm run db:seed`

6. **Deploy**
   - Push code and Railway auto-deploys
   - Check deployment logs

### Option 2: Render

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New +"
   - Select "Web Service"
   - Choose your GitHub repository

3. **Configure**
   ```
   Name: vessify-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Node Version: 18
   ```

4. **Add PostgreSQL**
   - Create separate PostgreSQL service
   - Copy connection string to SERVICE

5. **Set Environment Variables**
   - Add in Render dashboard
   - Follow same vars as Railway

### Option 3: Vercel with API Routes

Not recommended for this project (Vercel is better for frontend), but possible:

1. **Deploy to Vercel**
   ```bash
   vercel deploy --prod
   ```

2. **Configure serverless functions**
   - Move `src` to `api` folder
   - Adjust imports accordingly

## Frontend Deployment

### Recommended: Vercel

Vercel is the official Next.js platform.

#### Steps:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select `frontend` as root directory

3. **Configure Environment**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy**
   - Vercel auto-deploys on push
   - Check deployment logs

### Alternative: Render

```bash
# Create render.yaml in frontend root
name: vessify-frontend
buildCommand: npm install && npm run build
startCommand: npm start
envVars:
  - key: NEXT_PUBLIC_API_URL
    value: https://your-backend.com
  - key: NEXT_PUBLIC_APP_URL
    value: https://your-frontend.com
```

## Database Setup

### PostgreSQL on Cloud

#### Railway (Easiest)
- Added automatically with web service
- Backups included
- No additional setup needed

#### AWS RDS
1. Create RDS PostgreSQL instance
2. Configure security groups (allow port 5432 from app)
3. Set DATABASE_URL in backend environment

#### DigitalOcean
1. Create Managed PostgreSQL Database
2. Note connection string
3. Add to backend environment

### Initial Setup

Once deployed:

```bash
# SSH into backend or use Railway terminal

# Run migrations
npx prisma db push

# Seed test data
npm run db:seed

# Verify schema
npx prisma studio
```

## Environment Variables Reference

### Backend

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Secrets (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=<32+ chars>
JWT_SECRET=<32+ chars>

# Server Config
PORT=3001
NODE_ENV=production
BETTER_AUTH_URL=https://your-backend.com

# CORS & Redirects
CORS_ORIGIN=https://your-frontend.com
FRONTEND_URL=https://your-frontend.com

# Optional
LOG_LEVEL=info
```

### Frontend

```env
NEXT_PUBLIC_API_URL=https://your-backend.com
NEXT_PUBLIC_APP_URL=https://your-frontend.com
```

## Testing Production

After deployment:

```bash
# Health check
curl https://your-backend.com/health

# Register test user
curl -X POST https://your-backend.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Test transaction extraction
curl -X POST https://your-backend.com/api/transactions/extract \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Date: 11 Dec 2025\nAmount: -420.00"}'
```

## Monitoring & Maintenance

### Logs
- **Railway**: Built-in dashboard
- **Render**: Real-time logs in dashboard
- **Vercel**: Deployment and function logs

### Database Backups
- **Railway**: Automated daily backups
- **Render**: Automated backups
- **AWS RDS**: Automated 7-day retention

### Health Checks
Setup monitoring for:
- `GET /health` endpoint (should return 200)
- Database connectivity
- Auth endpoint availability
- Transaction API response time

### Alerts
Configure alerts for:
- Deployment failures
- High error rates (>1%)
- Database connection issues
- API response time >1s

## Database Migrations

For production updates:

```bash
# In local dev
npm run db:migrate

# This creates a migration file in prisma/migrations/

# Push to git
git add prisma/migrations
git commit -m "database migration"
git push

# Railway/Render auto-runs: npx prisma db push
# But verify in deployment logs
```

## Performance Optimization

### Backend
- Enable connection pooling (PgBouncer for Railway)
- Use read replicas for scaling (optional)
- Implement rate limiting (see code)
- Cache frequently accessed data

### Frontend
- Vercel edge functions for API calls
- Image optimization (next/image)
- Code splitting and lazy loading
- CDN caching headers

## Security Checklist

- [ ] Use HTTPS everywhere (auto with Vercel/Railway)
- [ ] Set secure environment variables (not in code)
- [ ] Enable database encryption at rest
- [ ] Configure firewall rules
- [ ] Set up CORS properly
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Use strong secret keys (32+ chars)
- [ ] Monitor for unusual activity

## Rollback Strategy

### If Deployment Breaks

**Frontend**:
- Vercel dashboard → Select previous deployment
- Click "Promote to Production"
- Instant rollback

**Backend**:
- Railway/Render: Redeploy previous commit
  ```bash
  git revert HEAD
  git push
  ```
- Or switch to previous service version

## Cost Estimation (Monthly)

- **PostgreSQL**: $5-15 (managed service)
- **Backend Server**: $5-10 (shared/small instance)
- **Frontend CDN**: $0-5 (included with free tier)
- **Total**: ~$10-30 for small load

Scale as needed based on usage.

## Support & Documentation

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Deploy**: https://www.prisma.io/docs/guides/deployment
- **Next.js Deploy**: https://nextjs.org/docs/deployment

## Example: Complete Deployment Flow

```bash
# 1. Prepare code
git checkout -b deploy/production
git push origin deploy/production

# 2. Create GitHub release
# Tag: v1.0.0
# Release notes with changes

# 3. Backend deploys automatically via Railway/Render
# 4. Frontend deploys automatically via Vercel

# 5. Run smoke tests
curl https://your-app.vercel.app/
curl https://your-api.railway.app/health

# 6. Database migrations run in Railway terminal
# 7. Monitor logs for errors

# 8. Verify in production
# - Register new account
# - Extract sample transaction
# - View in dashboard

# 9. Update DNS if using custom domain
# 10. Send deployment notification
```

---

For more information, see main [README.md](./README.md)
