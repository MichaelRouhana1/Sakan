# ENV to change

Values you must swap before production. Dev/test keys and local URLs below are fine for local work only.

---

## Frontend — `frontend/.env`

| Variable | Dev (current) | Production |
|----------|---------------|------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `EXPO_PUBLIC_API_URL` | LAN IP, e.g. `http://192.168.x.x:3001` | Public HTTPS API origin, e.g. `https://api.yourdomain.com` |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public `pk.` from [account.mapbox.com](https://account.mapbox.com/access-tokens/) (local: `frontend/.env`). Alias: `EXPO_PUBLIC_MAPBOX_TOKEN`. **Tiles / Mapbox GL only** — walking Directions go through the backend | Same `pk.` token, URL/bundle-restricted in Mapbox dashboard |
| `EXPO_PUBLIC_MAPBOX_STYLE` | Optional. Default `mapbox://styles/mapbox/standard` | Optional; satellite only if set to `mapbox://styles/mapbox/standard-satellite` |
| `MAPBOX_DOWNLOADS_TOKEN` | Optional secret `sk.` for native SDK download (EAS secret / local env). **Never** `EXPO_PUBLIC_*`, never commit. Current `@rnmapbox/maps` plugin says download token often unused — keep if prebuild still requires `.netrc` | Same; EAS secret only |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | `62549b9d-483b-4554-8eb2-0482286f62cb` (`@rouhanamichael/skoun`) | Same UUID in `frontend/.env` and as an EAS env/secret for cloud builds. `app.config.js` copies it to `extra.eas.projectId` (dynamic config; `eas init` cannot auto-write it). See [Before real push notifications](#before-real-push-notifications). |

---

## Before real push notifications

EAS project `@rouhanamichael/skoun` already exists. Push tokens only register from a **real native binary**, not Expo Go.

**Before production:** migrate → backend env ([Resend](#backend--backendenv)) → EAS project id → credentials → native build → [hourly cron](#hetzner--vps-cron).

1. Set in `frontend/.env` (and EAS secrets for cloud builds):

   ```
   EXPO_PUBLIC_EAS_PROJECT_ID=62549b9d-483b-4554-8eb2-0482286f62cb
   ```

2. On [expo.dev](https://expo.dev) → project **skoun** → **Credentials**:
   - Android: set up FCM / Google service account for push
   - iOS: Apple Push key / certificates (requires Apple Developer Program)
3. Build a real binary from `frontend/` (Expo Go is not enough for reliable production push):
   - `eas build --profile development --platform android`
   - and/or `eas build --profile production --platform ios`
4. Install that build on a device → sign in as a host → allow notifications so an Expo push token can register.
5. Backend optional: [`EXPO_ACCESS_TOKEN`](#backend--backendenv) only if Expo “enhanced push security” is enabled (expo.dev → Access tokens). Otherwise leave blank; push still works for early testing without it.
6. The [listing-lifecycle job](#hetzner--vps-cron) and Resend email can run without push; missing Expo push just skips that channel.

---

## Backend — `backend/.env`

| Variable | Dev (current) | Production |
|----------|---------------|------------|
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` from Clerk Dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` (optional, docs only) | `pk_live_...` if you keep it for reference |
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | Local Postgres connection string | Managed Postgres URL (SSL, strong password) |
| `ADMIN_API_KEY` | `change-me-admin-key` | Long random secret; scripts/curl only — never `EXPO_PUBLIC_*` |
| `ADMIN_CLERK_IDS` | (empty) | Comma-separated Clerk `user_...` ids for the web admin UI. Or set Clerk `publicMetadata.skounAdmin = true` |
| `PUBLIC_BASE_URL` | LAN IP, e.g. `http://192.168.x.x:3001` | Public HTTPS API URL (listing photo links) |
| `PORT` | `3001` | Host/port your process listens on (often set by platform) |
| `UPLOAD_DIR` | `uploads` | Persistent disk path or switch to object storage later |
| `GEMINI_API_KEY` | Optional; blank/unset uses local factual templates | Server-only Gemini Flash key. Never `EXPO_PUBLIC_*`. Copy suggestions fall back to templates on errors/quota; 10 AI attempts per user/hour (in-memory, single API process). |
| `MAPBOX_ACCESS_TOKEN` | (optional locally) Mapbox secret `sk.` or URL-restricted `pk.` for Directions | Required in production so walking routes persist; never `EXPO_PUBLIC_*`. Client `EXPO_PUBLIC_MAPBOX_*` is tiles/GL only |
| `TRUST_PROXY` | unset | `1` when the API sits behind nginx/Caddy so walking-route rate limits key by client IP (do not set `true`) |
| `EXPO_ACCESS_TOKEN` | Optional unless Expo enhanced push security is enabled | EAS/Expo server access token when enhanced push security is enabled (expo.dev → Access tokens). Used by the [hourly listing-lifecycle job](#hetzner--vps-cron); leave blank for early testing. See [Before real push notifications](#before-real-push-notifications). |
| `RESEND_API_KEY` | Optional; email delivery is skipped when absent | Resend server key for the [listing-lifecycle job](#hetzner--vps-cron). Unset skips email; the rest of the job still runs. Set this in the [before-production checklist](#before-real-push-notifications) before hourly cron. |
| `EMAIL_FROM` | Optional locally | Verified Resend sender, such as `Skoun <listings@yourdomain.com>`. Required with `RESEND_API_KEY` for the [hourly job](#hetzner--vps-cron) to send mail |
| `ADMIN_NOTIFICATION_EMAILS` | Optional comma-separated list | Staff inboxes that receive expiry follow-ups from the [hourly job](#hetzner--vps-cron) |

---

## Hetzner / VPS cron

Hourly listing lifecycle. From the backend app directory: `npm run job:listing-lifecycle` (script already in `backend/package.json`).

**Before production:** migrate → backend env (Resend) → [EAS project id](#before-real-push-notifications) → credentials → native build → hourly cron.

1. Apply migration `0023_listing_lifecycle.sql` (`cd backend && npm run db:migrate`).
2. Put production values in `backend/.env` — the same file the API uses: `DATABASE_URL`, `FRONTEND_PUBLIC_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAILS`, optional `EXPO_ACCESS_TOKEN` (rows in [Backend](#backend--backendenv)). `EXPO_PUBLIC_EAS_PROJECT_ID` belongs in the EAS build, not this cron shell — [Before real push notifications](#before-real-push-notifications).
3. Complete Expo Credentials and a native `eas build` ([checklist](#before-real-push-notifications)). Expo Go / simulators do not register real device tokens.
4. Schedule the job hourly (crontab below).

The job imports `dotenv/config` and reads `backend/.env` from **cwd**. Cron must `cd` into the backend app directory so those vars are present (a systemd unit can instead set `WorkingDirectory=` and `EnvironmentFile=` on the same `.env`). `dotenv` does not override variables already in the process.

Example crontab (adjust path/user):

```
0 * * * * cd /var/www/sakan/backend && /usr/bin/npm run job:listing-lifecycle >> /var/log/skoun-listing-lifecycle.log 2>&1
```

One-shot test: `cd backend && npm run job:listing-lifecycle`

Lifecycle tables must already exist (migration 0023). Missing Resend or Expo vars skip those channels without failing the whole job.

Optional instead of cron: a systemd timer with `WorkingDirectory=/var/www/sakan/backend`, `EnvironmentFile=/var/www/sakan/backend/.env`, `ExecStart=/usr/bin/npm run job:listing-lifecycle`, and `OnCalendar=hourly`.

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
- `CLERK_SECRET_KEY`, `ADMIN_API_KEY`, `ADMIN_CLERK_IDS`, `MAPBOX_ACCESS_TOKEN`, and `GEMINI_API_KEY` are server-only — never put them in `EXPO_PUBLIC_*`.
- Web admin authenticates with the user's Clerk Bearer token. Do not send `x-admin-key` from the browser.
- `MAPBOX_DOWNLOADS_TOKEN` is a secret `sk.` — never `EXPO_PUBLIC_*`, never commit.
- Rotate any key that was shared in chat or committed by mistake.

---

## Quick reference — which files hold secrets

| File | Clerk / API vars |
|------|------------------|
| `frontend/.env` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (or `EXPO_PUBLIC_MAPBOX_TOKEN`), `EXPO_PUBLIC_MAPBOX_STYLE`, `EXPO_PUBLIC_EAS_PROJECT_ID` |
| `EAS / local native secrets` | `MAPBOX_DOWNLOADS_TOKEN` (secret `sk.`, not public), Expo push credentials, `EXPO_PUBLIC_EAS_PROJECT_ID` |
| `backend/.env` | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`, `ADMIN_API_KEY`, `ADMIN_CLERK_IDS`, `PUBLIC_BASE_URL`, `MAPBOX_ACCESS_TOKEN`, `GEMINI_API_KEY`, `EXPO_ACCESS_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAILS` |

Replace all `pk_test_` / `sk_test_` values with **live** keys from Clerk before production.
