# Listing lifecycle operations

The 30-day listing lifecycle is processed by:

```sh
cd backend
npm run job:listing-lifecycle
```

Schedule that command hourly in the deployment environment. `job:archive-expired` remains a compatibility alias and runs the same lifecycle processor.

Apply `0039_unit_auto_renew.sql` before deploying the renewal UX. The guarded
local helper is `cd backend && node ops/places/apply-auto-renew.mjs`.

Each unit defaults to auto-renew off. Enabled, available units renew on the
hourly run in their final hour (`0 < expires_at - now <= 1 hour`). The shared
renew transaction adds 30 days to the existing expiry, charges one post credit,
and deduplicates by unit and exact cycle. It never automatically catches up an
already expired unit. Rented, archived, removed, hidden, restricted, or
unconfirmed/zero-bed units cannot automatically renew.

The availability check-in is sent in the final 72 hours. Yes records availability
without charging; Rented turns auto-renew off. Credit and bed-count warnings
use the same per-cycle delivery deduplication and retry mechanism. Successful
system renewal events also provide durable retry candidates for confirmation
notifications. Notification preferences still apply.

Promotions retain the listing expiry captured at purchase, including promotion
successors. The promotion and listing lifecycle workers settle that boundary
and refund unused service; search hides expired promotion placements immediately
even if the listing has already renewed early. Listing renewal never purchases
or restarts a promotion.

Regression checks: `npm run test:renewal` in backend, and
`npx playwright test --config tests/playwright.renew.config.ts` in frontend.
The integration suite uses a disposable database. Playwright creates temporary
units and restores the dev wallet in teardown. Screenshots are written to
`artifacts/renew-ux/`.

Before enabling production delivery:

1. Apply migration `0023_listing_lifecycle.sql`.
2. Configure `FRONTEND_PUBLIC_URL` so email links open the public app.
3. Configure Expo Push credentials for the EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID` in the frontend build. Set `EXPO_ACCESS_TOKEN` only when enhanced push security is enabled.
4. To enable email, set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender. Add comma-separated `ADMIN_NOTIFICATION_EMAILS` for staff follow-up. Local/dev send checks: [resend.md](resend.md).
5. Run the app as an Expo development or production build on a physical device. Expo Go and simulators are not sufficient for real push verification.

The job is safe to retry. Delivery rows are unique per listing cycle, event, channel, and recipient; transient failures retry up to three times with bounded backoff. Expo receipts are checked on later runs, and invalid device tokens are deactivated.

The admin queue lives at `/admin/expired`. Its WhatsApp button only opens `wa.me` after a staff member clicks it; the server does not send WhatsApp messages.
