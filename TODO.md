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

- [ ] WhatsApp contact — expose poster phone on listing detail
- [ ] Boost spend (credits UI exists; spend path stubbed)
- [ ] Report auto-restrict / broker flagging
- [ ] Admin web UI
- [ ] Renew / day-25 listing notifications
- [ ] Arabic / RTL
- [ ] In-app chat (out of scope for v1 — track if priority changes)

---

## Dev / cleanup

- [ ] Review uncommitted local changes (poster tabs, web nav) before next push
- [ ] Drop legacy DB columns when safe (`password_hash`, `phone`, `phone_verified_at`)
- [ ] Fix pre-existing frontend TypeScript issues (map / carousel)
