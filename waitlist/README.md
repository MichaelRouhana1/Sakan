# Studently waitlist

Next.js (App Router) waitlist site for **Studently** — student page at `/`, landlord page at `/landlords`, admin at `/admin`.

Stack: TypeScript, Tailwind CSS, Supabase, Resend, PostHog. Deploy on Vercel.

## Local development

```bash
cd waitlist
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Step-by-step setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. **Project Settings → API**: copy
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose in the browser)
4. Confirm the table `waitlist_signups` exists and RLS is enabled (API routes use the service role).

### 2. Resend

1. Create an account at [resend.com](https://resend.com).
2. Create an API key → `RESEND_API_KEY`.
3. For testing, set `EMAIL_FROM=Studently <onboarding@resend.dev>` (delivers to your Resend account email).
4. For production, verify your domain in Resend and set `EMAIL_FROM` to that domain (e.g. `Studently <hello@yourdomain.com>`).

### 3. PostHog

1. Create a project at [posthog.com](https://posthog.com) (or EU cloud if preferred).
2. Project settings → copy Project API key → `NEXT_PUBLIC_POSTHOG_KEY`.
3. Set `NEXT_PUBLIC_POSTHOG_HOST` to `https://us.i.posthog.com` or `https://eu.i.posthog.com`.
4. In PostHog, enable **Session replay** and confirm input masking (this app sets `maskAllInputs: true`).
5. Events emitted:
   - `$pageview` (manual, with UTM / `ref`)
   - `referral_attribution`
   - `waitlist_form_started` (`role`, referral, UTM)
   - `waitlist_signup` (`role`, university/area, referral)
   - `posthog.identify(email)` on successful signup

### 4. Admin

1. Set a strong `ADMIN_PASSWORD`.
2. Set a separate `ADMIN_SESSION_SECRET` (long random string).
3. Visit `/admin`, sign in, use filters and **Export CSV**.

### 5. Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `waitlist`.
3. Framework preset: Next.js.
4. Add all variables from `.env.example` in **Project → Settings → Environment Variables**.
5. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://waitlist.studently.app`).
6. Deploy. After deploy, test:
   - Student signup on `/`
   - Landlord signup on `/landlords`
   - Confirmation email in Resend
   - Row in Supabase
   - PostHog live events
   - `/admin` stats + CSV

## Swapping placeholders

| Asset | Path |
|-------|------|
| Student screenshots | `public/screenshots/students/` (png/jpg/webp/svg) |
| Landlord screenshots | `public/screenshots/landlords/` |
| Student demo video | `public/demo-students.mp4` (section auto-hides if missing) |
| Landlord demo video | `public/demo-landlords.mp4` |
| Founder photo | replace `public/founder-placeholder.svg` or set `ABOUT.photo` in `src/lib/content.ts` to `/founder.jpg` |
| Testimonials | add objects to `TESTIMONIALS` in `src/lib/content.ts` (section stays hidden while empty) |
| Optional YouTube | set `youtubeFallbackUrl` on page content if you prefer embed over a file |

## Project layout

```
waitlist/
  src/app/                 # /, /landlords, /admin, API routes
  src/components/          # shared sections + forms
  src/lib/                 # supabase, validation, email, analytics helpers
  public/screenshots/      # role-specific screenshot folders
  supabase/schema.sql      # table + RLS + count RPC
  .env.example
```

## Root monorepo scripts

From the repo root you can run:

```bash
npm run dev:waitlist
npm run build:waitlist
```
