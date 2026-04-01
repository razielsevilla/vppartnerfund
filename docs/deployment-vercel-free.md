# Free Deployment on Vercel (No Cost)

This project can be deployed for free on Vercel using two free Hobby projects:

- Frontend project: static Vite app
- Backend project: Node serverless API

## Important Constraint

Vercel serverless file storage is ephemeral. The current artifact local storage provider (`ARTIFACT_STORAGE_PROVIDER=local`) is not durable across deployments/cold starts.

What still works well for early access:

- Auth and RBAC
- Team, partners, tasks, settings, dashboard
- Database-backed data via Postgres

What is not durable on Vercel free with current adapter:

- Persistent artifact files in local storage

## 1. Create Free Postgres

Use any free Postgres tier (for example Supabase or Neon) and copy the connection string.

## 2. Deploy Backend to Vercel

1. In Vercel, click Add New > Project.
2. Import this repository.
3. Set Root Directory to `backend`.
4. Framework preset: Other.
5. Vercel will use [backend/vercel.json](../backend/vercel.json).
6. Add environment variables:
   - `NODE_ENV=production`
   - `DATABASE_CLIENT=pg`
   - `DATABASE_URL=<your-free-postgres-url>`
   - `SESSION_SECRET=<strong-random-secret>`
   - `CLIENT_ORIGIN=https://<your-frontend-domain>.vercel.app`
   - `AUTH_VP_EMAIL`, `AUTH_VP_PASSWORD`
   - `AUTH_LIAISON_EMAIL`, `AUTH_LIAISON_PASSWORD`
   - `AUTH_COMPLIANCE_EMAIL`, `AUTH_COMPLIANCE_PASSWORD`
   - `AUTH_DEVCON_EMAIL`, `AUTH_DEVCON_PASSWORD`
   - `AUTH_BCRYPT_ROUNDS=10`
   - `LOGIN_RATE_LIMIT_WINDOW_MS=600000`
   - `LOGIN_RATE_LIMIT_MAX=5`
   - `SESSION_COOKIE_NAME=vp_partner_fund_session`
   - `SESSION_TTL_MS=28800000`
7. Deploy.
8. Verify backend health at:
   - `https://<backend-project>.vercel.app/api/health`

## 3. Deploy Frontend to Vercel

1. Create another Vercel project from same repo.
2. Set Root Directory to `frontend`.
3. Framework preset: Vite.
4. Add environment variable:
   - `VITE_API_URL=https://<backend-project>.vercel.app/api`
5. Deploy.

## 4. Validate End-to-End

1. Open frontend URL.
2. Login with VP credentials.
3. Validate partners/tasks/team/settings flows.
4. Open browser devtools and ensure API requests hit backend Vercel URL.

## 5. CORS + Cookie Tips

- Keep `CLIENT_ORIGIN` exactly equal to frontend URL.
- Redeploy backend if frontend domain changes.

## 6. Zero-Cost Summary

- Vercel frontend (Hobby): free
- Vercel backend (Hobby): free
- Free Postgres (Supabase/Neon free tier): free

This gives you a fully free early-access rollout for core workflows.
