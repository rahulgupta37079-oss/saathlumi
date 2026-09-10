# Saathlumi

A photo-free, adults-only platform for private, strictly platonic meeting interests in India. Members do not browse a public directory. They choose interests, opt in to private in-app invitations, and decide whether to respond.

## Status and URLs

**Development preview; not production-ready.** Accounts, private preferences, meeting-interest creation, in-app invitations/responses, and privacy controls are implemented. Live matching is gated by email confirmation, adult verification, and active membership. Adult verification is not configured; no fake matches or users are presented. Payments, meeting confirmation, and staffed moderation are not operational.

- Preview: https://3000-in1a4e08bsgdp4voh3kqb-18e660f9.sandbox.novita.ai
- Local preview: http://localhost:3000
- Health: `/api/health`
- Production: not deployed. The sandbox URL is temporary.
- Source: `/home/user/webapp`, branch `main`.
- Stack: Hono + TypeScript, Cloudflare Pages/Workers, D1, browser JavaScript/CSS.

## Name

Saathlumi is pronounced “saath-loo-mee”. An exact-name web search on 2026-09-10 returned no indexed matches: https://www.google.com/search?q=%22Saathlumi%22. This is not a uniqueness guarantee or trademark clearance. Domains, social handles, similar-name conflicts, trademarks, and company names have not been verified or reserved.

Legacy internal identifiers (`togetherly-db`, `__Host-togetherly`, calendar UID namespace) remain unchanged to preserve data, sessions, and calendar identity.

## Completed features

### Photo-free, private interface

- Responsive ivory/plum/coral homepage with a clearly labelled invitation illustration made from text, CSS, and inline vector icons. No photos or person illustrations.
- Removed all five previously used photo files from public assets and build output. Old sample-profile URLs and photo URLs return 404.
- Removed fictional names, biographies, and the sample-profile data array from the browser bundle.
- `GET /api/companions` always returns an empty directory, regardless of profile approval or authentication.
- No new direct bookings to arbitrary member IDs. `/api/bookings` POST is closed; use private interests instead.
- Private plan form: city, activity, date/time in IST, 60/90/120-minute duration, and explicit sharing consent. No exact venue, personal message, photo, or contact field is broadcast.
- Private account dashboard, notification badge/inbox, notification preferences, own-interest list/cancellation, account details, data export, and deletion requests.
- Calendar explorer, clear safety guidance, FAQs, draft policies, and explicitly disabled payment/admin/support states.
- Prior request preserved: no public “free for women” promotion or anonymous API female-rate disclosure. Underlying membership rules are unchanged.

### Private in-app notification flow

1. An authenticated member chooses a supported city and activities at `/notifications`. New invitations are off by default. A checked opt-in box and Save are required to enable them.
2. A sender with confirmed email, verified adulthood, and active membership submits a private plan at `/browse`. It must be at least one hour ahead and within 90 days.
3. A D1 trigger atomically selects up to 20 matching opted-in, eligible members in that city/activity. It excludes the sender, blocked pairs, suspended accounts, and pending deletion requests.
4. A second trigger creates persistent in-app invitations. Only city, activity, time, and duration are returned to recipients. Names, emails, dates of birth, photos, user IDs, matching-member counts, and exact locations are not included.
5. A recipient may show interest or decline. Only their own pending invitation can be answered; a conditional update and unique notification index prevent concurrent duplicate replies.
6. Showing interest creates one anonymous in-app reply for the plan owner. Declining does not notify the owner. Neither response reveals identity, opens chat, or confirms a meeting.
7. Members can mark alerts as read, block another member through an opaque invitation ID, pause new invitations, or cancel their own interest. Cancelled/expired plans, blocked pairs, revoked eligibility, and pending deletion are excluded from the active inbox.

The inbox refreshes every 30 seconds while the tab is visible, and can be refreshed manually. Alerts are stored in D1 and appear after reload/login; there are no fabricated notifications. Delivery is **in-app only**. Email, SMS, WhatsApp, browser push, and background notifications are not implemented. Configuring transactional email for authentication does not enable invitation emails.

Matching happens at plan creation, not retroactively when someone later opts in. Pausing notifications stops new invitations; existing valid invitations remain visible. An interest is not a time reservation: mutual meeting confirmation, identity-disclosure consent, and downstream booking flow remain future work.

“Private” means not publicly listed or disclosed to other members in invitations. The platform still stores account information and matching relationships; authorized operators may access data as required. No claim of end-to-end encryption or anonymity from the platform is made.

### Account and security foundation

- D1 persistence; parameterized SQL, validation, body-size limits, origin checks, rate limits, private API `no-store`, CSP/security headers, redacted operational error logs.
- Salted PBKDF2-SHA256 hashes and hashed random session tokens. `__Host-` Secure/HttpOnly/SameSite=Lax cookies expire after seven days.
- Passwords must be at least 12 characters. **The current PBKDF2 work factor is 100,000 to fit Workers Web Crypto constraints; adopt a reviewed managed-auth or suitable memory-hard solution before public launch.** This is not a security certification.
- Declared age checks, consent records, separate email/adult-verification status, private account information and role records. Declared age is not proof of adulthood.
- Resend adapter for email confirmation/password reset, expiring single-use hashed tokens, and session revocation after password reset. Delivery requires configured credentials/domain.
- Account deletion requests immediately hide profiles, disable invitation preferences, cancel owned private interests, and remove their matches from active inboxes. Actual deletion/retention processing requires operators and a final policy.
- Data export includes own account/profile/consents/payments, private preferences/plans, and notification texts, without passwords/session secrets or other members’ identities from private matching.

### Existing booking/payment foundations

Existing authenticated legacy-booking functionality is retained for compatibility: state transitions, rescheduling with mutual acceptance, UTC `.ics` exports, availability rules, D1 overlap/buffer triggers, restricted messages, reviews, blocking/report APIs. Tests seed legacy fixtures directly. **New direct bookings are disabled; these APIs are not an implemented continuation of the private-interest flow.**

Membership rules remain: women have free platform membership; men require the proposed ₹299 one-time payment; self-described/undisclosed genders are pending an owner policy. Public marketing does not advertise the women’s rate. Pricing requires legal/provider review. ₹299 is not a per-meeting fee, recurring subscription, payout to a companion, or consent guarantee.

Razorpay foundation: server-created orders; server-derived amount; HMAC verification of checkout and raw-body webhooks; exact user/order/amount/currency checks; provider lookup; event deduplication; terminal refund/dispute protection; paid access only on capture. Full refunds/disputes revoke paid membership; partial refunds and dispute appeals require final policy/review. No real payment/provider test was performed. Checkout UI is deliberately disabled even if secrets are added. SDK integration, receipts, refund execution, administrator MFA/review, and real provider end-to-end tests are still missing.

## Pages and APIs

| Route | Purpose |
| --- | --- |
| `/` | Photo-free homepage; `#faq` |
| `/browse?city=&activity=&date=` | Private-interest form; sending requires login/eligibility |
| `/notifications` | Authenticated preferences and personal inbox |
| `/dashboard` | Private dashboard, own interests, unread alerts |
| `/onboarding` | Private account details; no photo upload |
| `/calendar`, `/availability` | Date explorer, not published member availability |
| `/register`, `/login`, `/forgot-password` | Account flows |
| `/verify-email?token=`, `/reset-password?token=` | Single-use emailed token flows |
| `/how-it-works`, `/pricing`, `/safety` | Public explanation |
| `/messages` | Account-gated informational state; private interest does not create chat |
| `/checkout`, `/payment-result`, `/admin`, `/contact` | Explicitly unavailable operational features |
| `/terms`, `/privacy`, `/refunds`, `/guidelines` | Draft policies and community guidelines |
| `/companions/:id` | 404; no public member pages |

API base `/api`:

- Public: `GET /health`, `/config`; `GET /companions` returns no people.
- Account: `GET /auth/me`; `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/resend`, `/auth/verify`, `/auth/forgot`, `/auth/reset`.
- Authenticated account data: `GET/PUT /profile`, `GET /account/export`, `POST /account/deletion`.
- Private notification preferences: `GET/PUT /notification-preferences`.
- Private plans: `GET/POST /private-plans`, `POST /private-plans/:id/cancel`.
- Inbox: `GET /notifications`, `POST /notifications/:id/read`.
- Anonymous invitation actions: `POST /private-invitations/:id/respond` with `response=interested|declined`; `POST /private-invitations/:id/block`.
- Legacy authorized bookings/messages: `GET /bookings`, `POST /bookings/:id/status`, `/bookings/:id/reschedule`, `GET /bookings/:id/calendar.ics`, `GET/POST /conversations/:id/messages`. New `POST /bookings` is closed (410 after eligibility checks).
- Existing APIs: `POST /blocks`, `/reports`, `/reviews`; gated `POST /payments/order`, `/payments/verify`, `/payments/webhook`; authenticated `GET /payments/history`.
- `/admin/*` fails closed until administrator provisioning/MFA and management workflows exist.

All record authorization is server-side. Browser gates are informational, not security boundaries. These per-member rules are separate from any future hosting route-admission policy.

## Data and migrations

- `0001_initial.sql`: users/profiles/roles/consents, sessions/auth tokens, memberships/settings, availability/bookings/messages, payments/webhooks, blocks/reports/reviews/notifications, audits and deletion requests.
- `0002_private_connections.sql`: hides existing profiles; adds notification_preferences, private_plans, private_invitations; adds notification-invitation foreign key and deduplication/indexes; creates atomic matching and notification triggers.
- Existing sessions/data are preserved. No destructive database reset is required.
- D1 is the only runtime persistence. No runtime filesystem or in-memory database, KV, cron, WebSocket server, or long-running server task is used.
- No R2 bucket or photo uploads. No photographs ship in public assets. Branding uses CSS and inline SVG icons; fonts are from Google Fonts (DM Sans/Manrope).
- Build uses Hono’s `emptyOutDir: true` so removed public assets do not survive in `dist`.

## Setup

```sh
cd /home/user/webapp
npm ci
npm run db:migrate:local
npm run build
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/health
pm2 logs webapp --nostream
```

Wrangler’s D1 ID is a local placeholder (`00000000-0000-0000-0000-000000000001`). Provision the real production database through the selected hosting path before deployment. Do not migrate fixture data to production. Clean builds can invalidate Wrangler’s watched asset manifest. Stop the PM2 preview before rebuilding, then restart it with `pm2 start ecosystem.config.cjs`. Verify `/static/app.js` returns 200 and a removed photo URL returns 404 before testing.

Use test details and a unique test password. Register, open Notifications, choose city/activities, opt in, and save. Preferences persist immediately; sending/receiving matching interests additionally requires genuine email/adult verification and membership. No public verification bypass exists. Automated tests use isolated SQL fixtures and clean them up.

### External services

Copy `.dev.vars.example` to ignored `.dev.vars` for local secrets. Configure `APP_ORIGIN`, `EMAIL_API_KEY` (Resend), and `EMAIL_FROM` for authentication mail using a verified domain; validate SPF/DKIM/DMARC, delivery and token flows. Never expose or commit secrets. Production secrets must be set through the selected hosting platform. Optional phone OTP and invitation-email delivery are not implemented.

Razorpay launch sequence:
1. Obtain approval for the actual business category and finalize entity/tax/refund/consumer-support details.
2. Complete checkout SDK/CSP, invoices/receipts, reconciliation/refund UI and MFA-protected administration.
3. Configure test-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; webhook URL is `https://YOUR_DOMAIN/api/payments/webhook`.
4. Run provider sandbox captures/failures/refunds/disputes, tampering, duplicates, concurrency and out-of-order delivery.
5. Set pricing/tax approvals and `PAYMENTS_ENABLED` only after review. This alone does not enable the unfinished browser checkout.
6. Use live secrets only after launch approval; never store raw card data or trust only a frontend callback.

## Tests

- `npm test`: 33 API integration tests, including opt-in/out, private matching, no identity/member-count disclosure, unread state, cross-account access, atomic duplicate replies, revoked eligibility, declines, cancellation, blocks, account flows and legacy bookings.
- `npm run test:browser`: 43 desktop/mobile checks (1440px and 390px), including no photos, dead old photo/profile URLs, real D1 preferences/inbox, interested response, anonymous blocking, private plan creation and cancellation.
- `npm run test:db`: 10 isolated schema/constraint tests apply all migrations.
- `npm run test:payments`: 10 local payment signature/state tests.
- `node tests/accessibility.test.mjs`: automated axe WCAG 2 A/AA checks on 8 routes. This is not a full accessibility certification.
- `npm run build`: Worker approximately 22 KB gzipped.

Playwright setup: `npx playwright install chromium` plus OS dependencies on a fresh Linux host. Screenshots live in ignored `tests/artifacts/`. Fixture integration tests only run against localhost and clean their test records. Repeated runs may legitimately hit rate limits. Never weaken production eligibility or abuse controls for testing.

Provider delivery, identity verification, live payments, load/penetration tests, manual screen-reader checks, and production operations are not certified by these tests. The dev-only `sharp` dependency is overridden to a patched release; check compatibility/security when upgrading dependencies.

## Remaining launch requirements

- Select managed hosting or the owner’s Cloudflare account; provision actual D1 and production secrets. Nothing has been production-deployed.
- Implement genuine adult verification and configure/validate email delivery. Keep all real matching gated until ready.
- Design mutual confirmation and optional identity/contact disclosure with explicit consent; connect private interests to safe, conflict-free bookings without restoring public profiles.
- Decide whether invitation email/push is desired; implement minimal-content opt-in delivery and retries separately. In-app alerts do not reach a closed browser.
- Administrator provisioning, MFA, moderation, anonymous-invitation reporting workflow, appeals, suspensions, payment refunds, staff/support contacts and response procedures.
- Harden authentication/password storage, account-level abuse controls, row authorization, rate-limit cleanup, session/token retention, and notifications/privacy retention.
- Review the 20-recipient cap, matching fairness and request-time delivery model before scale. Do not expose recipient counts or retroactively notify without a defined consent policy.
- Legal approval of gender-based pricing and pricing for other identities; provider approval, taxes and membership/refund policies. Do not infer gender from images.
- Final legal entity, privacy policy, consent versions, retention/deletion timelines, grievance/support contacts and statutory financial retention exceptions.
- Monitoring/alerts, migration and recovery drills, backups, security/accessibility/performance audits. Do not advertise 24/7 support or emergency monitoring.
- Enable marketing SEO only when launched; preview is intentionally noindex/robots-disallowed and private pages must remain unindexed.

## Backup and rollback

Version migrations in git. Back up D1 using the selected platform’s export/time-travel facility before production migrations, and test restoration into a separate staging database. Store exports privately, outside public assets/git. Use forward-compatible migrations and roll back application code only to a compatible version. Database restoration requires a reviewed reconciliation/data-loss plan and defined recovery targets. No destructive restore or reset was executed. Historical source backups may contain the removed illustrative assets; the current built website and public source assets no longer contain them.
