# Resend — listing-lifecycle email (local/dev)

Verify host and admin expiry mail without a native push build. Job, tables, and production cron: [listing-lifecycle.md](listing-lifecycle.md). Env names: [ENV to change.md](../ENV to change.md) (`RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAILS`).

## Env

In `backend/.env` (loaded by `dotenv` from the backend cwd):

| Variable | Role |
|----------|------|
| `RESEND_API_KEY` | Resend server key. Unset with `EMAIL_FROM` → deliveries `skipped` (“Resend is not configured”). |
| `EMAIL_FROM` | Sender. Tests: `Skoun <onboarding@resend.dev>`. Production: verified domain. |
| `ADMIN_NOTIFICATION_EMAILS` | Comma-separated staff inboxes for the 24h follow-up. |
| `FRONTEND_PUBLIC_URL` | Origin for links (`/hosting/listing/…/outcome`, `/admin/expired?id=…`). Defaults to `http://localhost:8081`. |

Resend’s onboarding sender usually delivers **only to the email on the Resend account**. Use that address for the host’s `users.email` and for `ADMIN_NOTIFICATION_EMAILS` during tests.

Push is a separate channel (EAS native build — [ENV to change.md](../ENV to change.md#before-real-push-notifications)). Ignore it for email-only tests.

```sh
cd backend && npm run job:listing-lifecycle
```

Job logs a summary (`nudged` / `prompted` / `escalated` / `sent` / `skipped` / `failed`). Check the Resend dashboard after each run.

## Who gets what

| Stage | When | Email to |
|-------|------|----------|
| Pre-expiry nudge | Active listing, `expires_at` within the next 5 days and still `> now` | Host (`users.email`) if `expiry_email_enabled` (default true) |
| Expiry prompt (“Was it rented?”) | Same run after the job archives when `expires_at` ≤ now (writes `expired`) | Host |
| Admin follow-up | 24+ hours after `expired` / `renew_intent` / `improve_intent` with no rented/renewed/archived | `ADMIN_NOTIFICATION_EMAILS` |

Admin mail does **not** send on the same run as expiry. Wait is `now >= GREATEST(cycle_expires_at, latest.created_at) + 24 hours`.

Use a throwaway listing. Test B archives it.

## Test A — host “expires soon”

```sql
UPDATE listings
SET expires_at = now() + interval '2 days', status = 'active'
WHERE id = 'YOUR-LISTING-UUID';

UPDATE users
SET email = 'YOUR-RESEND-ACCOUNT-EMAIL', expiry_email_enabled = true
WHERE id = (SELECT poster_id FROM listings WHERE id = 'YOUR-LISTING-UUID');
```

Run the job. Expect subject **Your listing expires soon**. Confirm in Resend.

## Test B — host “Was it rented?”

Same listing, still `active`:

```sql
UPDATE listings
SET expires_at = now() - interval '1 minute', status = 'active'
WHERE id = 'YOUR-LISTING-UUID';
```

Run the job. Expect: listing archived, `listing_lifecycle_events.event_type = 'expired'`, host subject **Was your listing rented?**

```sql
SELECT kind, channel, status, recipient_key, last_error, sent_at
FROM notification_deliveries
WHERE listing_id = 'YOUR-LISTING-UUID'
ORDER BY created_at;
```

Host email rows: `kind = 'expiry_prompt'`, `channel = 'email'`.

## Test C — admin email

Not on the Test B run. Wait 24h, **or** backdate the cycle (both timestamps — `GREATEST` uses them):

```sql
UPDATE listing_lifecycle_events
SET created_at = now() - interval '25 hours',
    cycle_expires_at = now() - interval '25 hours'
WHERE listing_id = 'YOUR-LISTING-UUID'
  AND event_type = 'expired';
```

Run the job again. Expect subject **Expiry follow-up: …** and a row in `/admin/expired` (`admin_inbox` delivery). Changing `cycle_expires_at` is a new cycle for the host prompt, so you may also get a second **Was your listing rented?** — that is expected.

## Caveats

- Dedupe is per listing + cycle + kind + channel + recipient. A re-run does not re-send unless `expires_at` (the cycle) changes or you delete that cycle’s `notification_deliveries` rows.
- `skipped` + `last_error` “Resend is not configured” → missing `RESEND_API_KEY` or `EMAIL_FROM`.
- WhatsApp is a manual `wa.me` open from the admin UI. The server never sends WhatsApp.
