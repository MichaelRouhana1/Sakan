# Listing lifecycle operations

The 30-day listing lifecycle is processed by:

```sh
cd backend
npm run job:listing-lifecycle
```

Schedule that command hourly in the deployment environment. `job:archive-expired` remains a compatibility alias and runs the same lifecycle processor.

Before enabling production delivery:

1. Apply migration `0023_listing_lifecycle.sql`.
2. Configure `FRONTEND_PUBLIC_URL` so email links open the public app.
3. Configure Expo Push credentials for the EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID` in the frontend build. Set `EXPO_ACCESS_TOKEN` only when enhanced push security is enabled.
4. To enable email, set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender. Add comma-separated `ADMIN_NOTIFICATION_EMAILS` for staff follow-up.
5. Run the app as an Expo development or production build on a physical device. Expo Go and simulators are not sufficient for real push verification.

The job is safe to retry. Delivery rows are unique per listing cycle, event, channel, and recipient; transient failures retry up to three times with bounded backoff. Expo receipts are checked on later runs, and invalid device tokens are deactivated.

The admin queue lives at `/admin/expired`. Its WhatsApp button only opens `wa.me` after a staff member clicks it; the server does not send WhatsApp messages.
