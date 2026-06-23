# Deploy (free demo): Neon + Render + Vercel

Five services: the NestJS API + 4 Next.js apps, on a PostgreSQL database.

## 1. Database — Neon
1. Create a project at https://neon.tech → copy the **pooled** connection string → this is `DATABASE_URL`.
2. From your machine, apply schema + demo data to Neon:
   ```
   DATABASE_URL="<neon-url>" pnpm --filter=@restaurant/api exec prisma migrate deploy
   DATABASE_URL="<neon-url>" pnpm db:seed
   ```

## 2. API — Render
1. Render → **New + → Blueprint** → pick this repo (reads `render.yaml`).
2. In the service env, set: `DATABASE_URL` (Neon), `STRIPE_SECRET_KEY` (`sk_test_…`).
   (`JWT_SECRET` / `JWT_REFRESH_SECRET` auto-generate.)
3. Deploy. Note the URL, e.g. `https://restaurant-api.onrender.com`.

## 3. Frontends — Vercel (×4)
Create one project per app. **Root Directory** → `apps/web`, then `apps/staff`, `apps/kitchen`, `apps/admin`.
Env for every app:
- `NEXT_PUBLIC_API_URL` = `https://<render-api>.onrender.com/api/v1`
- `NEXT_PUBLIC_SOCKET_URL` = `https://<render-api>.onrender.com`
- **web only:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_…`

If a build can't resolve `@restaurant/types`, set the build command to:
`cd ../.. && pnpm turbo run build --filter=@restaurant/<app>`

## 4. Close the loop (CORS)
Put the 4 Vercel URLs into the Render API env: `WEB_URL`, `STAFF_URL`, `KITCHEN_URL`, `ADMIN_URL` → redeploy the API.

## 5. Demo
- Warm the API first (Render free spins down after ~15 min idle; first hit ~50s). Optional: UptimeRobot ping every 10 min.
- Seeded logins: `admin@demo.com` / `password123` (also `waiter@`, `cashier@`, `kitchen@`).
- Stripe test card: `4242 4242 4242 4242`, any future expiry / CVC.
