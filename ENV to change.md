# ENV to change

Values you must swap before production. Dev/test keys and local URLs below are fine for local work only.

---

## Frontend — `frontend/.env`

| Variable | Dev (current) | Production |
|----------|---------------|------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `EXPO_PUBLIC_API_URL` | LAN IP, e.g. `http://192.168.x.x:3001` | Public HTTPS API origin, e.g. `https://api.yourdomain.com` |

---

## Backend — `backend/.env`

| Variable | Dev (current) | Production |
|----------|---------------|------------|
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` from Clerk Dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` (optional, docs only) | `pk_live_...` if you keep it for reference |
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | Local Postgres connection string | Managed Postgres URL (SSL, strong password) |
| `ADMIN_API_KEY` | `change-me-admin-key` | Long random secret; never commit |
| `PUBLIC_BASE_URL` | LAN IP, e.g. `http://192.168.x.x:3001` | Public HTTPS API URL (listing photo links) |
| `PORT` | `3001` | Host/port your process listens on (often set by platform) |
| `UPLOAD_DIR` | `uploads` | Persistent disk path or switch to object storage later |

---

## Clerk Dashboard (not in `.env`, but required)

Before go-live:

1. Create or switch to **Production** instance in Clerk.
2. Use **live** keys (`pk_live_`, `sk_live_`) in the env files above.
3. Enable sign-in methods: Email + Password (with verification), Google, Apple, Facebook as needed.
4. **Allowed redirect URLs**: production web app URL(s).
5. **Native redirect**: `skoun://` (matches `scheme` in `frontend/app.json`).
6. OAuth providers: configure production client IDs/secrets in Clerk for each provider.

---

## Security reminders

- Never commit real `.env` files (already gitignored).
- `CLERK_SECRET_KEY` and `ADMIN_API_KEY` are server-only — never put them in `EXPO_PUBLIC_*`.
- Rotate any key that was shared in chat or committed by mistake.

---

## Quick reference — which files hold secrets

| File | Clerk / API vars |
|------|------------------|
| `frontend/.env` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` |
| `backend/.env` | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`, `ADMIN_API_KEY`, `PUBLIC_BASE_URL` |

Replace all `pk_test_` / `sk_test_` values with **live** keys from Clerk before production.
