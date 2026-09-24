# Skoun — TODO

Living checklist for setup, integrations, and product work.

---

## Identity verification (Veriff)

- [ ] Create Veriff account and obtain API keys (sandbox + production)
- [ ] Add Veriff env vars to `backend/.env` / `backend/.env.example` (document in [`ENV to change.md`](ENV%20to%20change.md))
- [ ] Choose when verification runs (e.g. after Clerk sign-up, before first listing, before contact unlock)
- [ ] Backend: webhook endpoint for Veriff decision events (approved / declined / resubmission)
- [ ] Backend: store verification status on user (e.g. `veriffSessionId`, `identityVerifiedAt`, `verificationStatus`)
- [ ] Frontend: start Veriff flow (SDK or hosted session URL) from profile or onboarding
- [ ] Frontend: block or gate features until identity verified (define product rules)
- [ ] Test full flow in Veriff sandbox; add production keys before go-live

---

## Auth & production

- [ ] Swap Clerk **test** keys for **live** keys (see [`ENV to change.md`](ENV%20to%20change.md))
- [ ] Clerk Dashboard: production redirect URLs + OAuth providers
- [ ] Run `backend` migration `0008_drop_email_registration.sql` on all environments
- [ ] Add “Forgot password?” via Clerk sign-in flow
- [ ] Confirm sign-in works for users who verified email but hit old sync bug (Clerk user exists → use Sign in)

---

## Product backlog

- [x] WhatsApp contact — listing detail uses `whatsappNumber` / `contactPhone` (`ListingDetailBottomBar`, `ListingDetailWeb`, `lib/whatsapp.ts`)
- [ ] Boost spend (credits can be bought; no `POST …/boost` that sets `boostedUntil`)
- [ ] Report auto-restrict / broker flagging (reports store only; admin Reports UI is mock)
- [x] Admin web UI (neu desks exist). Mostly `mockStore` despite `live: true`. Wired: Institution Registry; `/admin/expired`. Payments API exists, UI unwired. Not “Phase 2 complete.”
- [x] Renew / day-25 listing notifications (`POST /api/listings/:id/renew`; hourly `job:listing-lifecycle` Expo Push + optional Resend)
- [ ] Host PATCH / edit a live listing (`PATCH /api/listings/:id` absent; host/admin edit dialogs mock or view-only)
- [ ] Hide or replace fake `demoListingRating()` in `normalizeListing.ts`
- [ ] Arabic / RTL
- [ ] In-app chat (out of scope for v1 — track if priority changes)

---

## Dev / cleanup

- [ ] Review uncommitted local changes (poster tabs, web nav) before next push
- [ ] Drop legacy DB columns when safe (`password_hash`, `phone`, `phone_verified_at`)
- [ ] Fix pre-existing frontend TypeScript issues (map / carousel)
