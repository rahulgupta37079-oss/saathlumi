# Saathlumi

An adults-only, private, strictly platonic meeting-interest platform for India. No public photos or member directory. Members choose interests, opt in to in-app invitations, and decide whether to respond.

## Current status

**Deployed development preview; not ready for unrestricted live payments or meetings.** Private account/notification flows are implemented. Cashfree **sandbox-only** checkout is implemented but remains disabled until fresh sandbox secrets and a whitelisted HTTPS origin are configured. No actual Cashfree transaction has been processed during development.

Private verification requirements are implemented: age verification and selfie/liveness for everyone; an ID check for men using masked Aadhaar or a viable alternative. **Document and selfie collection and provider verification are not implemented/enabled.** No image upload can mark an account verified. Live matching stays gated until all required verification results and membership conditions are met.

- Preview: https://3000-in1a4e08bsgdp4voh3kqb-18e660f9.sandbox.novita.ai
- Local: http://localhost:3000
- Health: `/api/health`
- Genspark-managed site: https://af99fa8c-67ee-4782-b601-a54cf886dadb.vip.gensparksite.com
- User-owned Cloudflare Pages site: https://webapp-2-1hj.pages.dev
- GitHub: https://github.com/rahulgupta37079-oss/saathlumi
- Both public deployments are online in preview mode. Payments and document/selfie collection remain disabled.
- Source: `/home/user/webapp`, branch `main`.
- Stack: Hono/TypeScript, Cloudflare Pages/Workers, D1, browser JavaScript/CSS.

## Deployment configuration

Two independent deployments were published and verified on 2026-09-11. All three migrations were applied to each remote D1 database. Homepage, JS/CSS assets and health checks return 200; private Cashfree configuration returns 401 without login, and removed photos return 404. Both browser checks reported no console errors.

| Hosting | Configuration | Database |
| --- | --- | --- |
| Genspark-managed | Root `wrangler.jsonc`; pipeline provisions its own binding | `af99fa8c-67ee-4782-b601-a54cf886dadb-db` |
| User-owned Pages, project `webapp-2` | `deploy/byok/wrangler.jsonc` | `webapp-2-production` (APAC) |

Accounts, sessions, notifications and payments are **not synchronized** between these sites. Existing unrelated Cloudflare projects were not overwritten. The connected GitHub starter history is preserved rather than force-pushed away.

For user-owned redeploys after configuring the user's Cloudflare token: `npm run db:migrate:byok` then `npm run deploy:byok` (also the default `npm run deploy`). Pages requires its config to be named `wrangler.jsonc`; the deploy command runs from `deploy/byok` because Pages rejects custom config paths. The root config remains available for local development and managed deployment.

For managed redeploys: run `gsk hosted deploy`, obtain user approval, then wait for the pending action to complete. Do not use rebuild flags for normal schema migrations. `APP_ORIGIN` is set to the managed site URL using a hosted secret binding; verify it remains configured after future redeploys. User-owned origin and disabled-payment flags are explicit in its configuration.

## Credential incident and next action

A user-provided screenshot showed Cashfree’s Live dashboard and an exposed secret. **Revoke/rotate that key in Cashfree.** Its values were not copied into the project, environment, logs, or test fixtures, and were not used for a provider request. Do not paste replacement keys in chat or publish another screenshot.

For testing, switch Cashfree to **Test**, generate fresh sandbox credentials, and configure the server-side variables below using a secure environment/secrets mechanism. A Live key is not a substitute for a sandbox key. Production Cashfree mode is rejected by the current implementation.

## Name and existing data

Saathlumi is pronounced “saath-loo-mee”. An exact-name web search on 2026-09-10 returned no indexed matches: https://www.google.com/search?q=%22Saathlumi%22. This is not a uniqueness guarantee or trademark clearance. Domain/social/trademark/company-name availability has not been verified or reserved.

Legacy identifiers (`togetherly-db`, `__Host-togetherly`, calendar UID namespace) remain unchanged to preserve accounts, sessions, and legacy records. Public promotion of free membership for women remains removed. Underlying private membership rules are unchanged.

## Implemented experience

### Private, photo-free site

- Responsive ivory/plum/coral homepage, activity choices, FAQs, safety pages, draft policies, and an explicitly illustrative text/vector invitation card.
- All former photos and fictional person-profile data removed. Old photo and `/companions/:id` URLs return 404; `/api/companions` always returns an empty directory.
- Private plan form shares only city/activity/proposed time and duration with eligible, opted-in matching members. No exact venue, name, image, contact information, or message is broadcast.
- Persistent preferences, own-plan list/cancellation, notification inbox and unread badge, interested/declined responses, anonymous invitation blocking, and mark-read.
- Private account details, registration/login/logout, email confirmation/reset forms, data export and deletion requests.
- Private `/verification` screens and Cashfree checkout/result/history screens. No public verification-photo gallery or ID upload service.

### Notification flow

1. Log in, open `/notifications`, select a city and activities, explicitly opt in and save. Default is off.
2. A sender must have confirmed email, verified adulthood, verified selfie/liveness, male ID verification where applicable, and active membership.
3. A private plan must be at least one hour ahead and within 90 days, for 60/90/120 minutes.
4. D1 triggers atomically select up to 20 matching opted-in eligible recipients. They exclude the sender, blocked pairs, suspended users, and deletion requests. No recipient list or count is returned to the sender.
5. Recipients get an in-app invitation containing only plan city/activity/time/duration. A single-use conditional response prevents duplicate replies. An interested response notifies the sender anonymously; a decline does not.
6. Cancellation/expiry, blocked pairs, deleted/suspended accounts and revoked verification/membership remove affected invitations from active inboxes.

Inbox polling runs every 30 seconds while the tab is visible, with manual refresh available. Notifications persist in D1; none are fabricated. Email/SMS/WhatsApp/push invitation delivery is not implemented. Configuring authentication email does not enable invitation emails. Opting out pauses new invitations; existing valid invitations remain visible. Matching happens on plan creation, not retroactively.

An interest or reply does not confirm a meeting, disclose identity, reserve a slot, or open chat. Mutual confirmation, consent to optional disclosure, and the downstream private booking flow remain future work.

Privacy means no public listing and no automatic identity disclosure to other members. The platform still holds account information and matching relationships. Authorized operators may need access; no end-to-end-encryption or anonymity-from-the-platform claim is made.

## Private Aadhaar/ID and selfie verification

- `/verification` is account-gated and displays the server-determined requirements.
- Every gender requires separate adult-age and selfie/liveness verification.
- Men additionally require ID verification. Masked Aadhaar is one choice; a viable alternative government-ID path must be provided. Aadhaar is not mandatory as the only ID.
- The upload input and selfie-start control are disabled. `/api/verification/start` and `/api/verification/upload` return 503 without saving files, reading image contents, or changing verification status.
- No Aadhaar numbers, document copies, selfies or biometric templates are stored. Only result flags exist (`adult_verified`, `selfie_verified`, `id_document_verified`). No public endpoint can set them to verified.
- New selfie/ID flags default false even for existing accounts. All matching/notification/response eligibility checks enforce them; legacy session/data is preserved.
- A normal selfie upload is not liveness verification or proof of age. A document image alone is not authentic verification. Provider results must independently establish the required checks.
- Before enabling collection: select/contract a legitimate verification provider, define explicit consent and purpose, secure hosted collection, signed callbacks, age/document/liveness evidence, masked handling, access controls, retention/deletion, alternative IDs, grievance contacts, and failure/appeal workflows.
- Prefer hosted provider collection rather than storing ID/selfie files in this application. Keep any verification data private and never pass it to the payment gateway.

UIDAI guidance consulted: https://www.pib.gov.in/PressReleasePage.aspx?PRID=1889996 — explicit consent, verification rather than simply accepting a copy, viable alternatives to Aadhaar, and no retention of readable Aadhaar numbers; if retaining a copy is necessary, mask/redact irretrievably. This is implementation guidance, not a legal-compliance certification.

## Cashfree sandbox integration

Selected provider: **Cashfree Payments**. Older Razorpay foundation endpoints remain unconfigured legacy code, not the selected checkout.

### Configuration

Copy `.dev.vars.example` to ignored `.dev.vars` for local setup, or use the selected hosting platform’s secure secrets mechanism. Never commit real credentials.

```text
APP_ORIGIN=https://YOUR_APPROVED_HOST
CASHFREE_APP_ID=<fresh sandbox App ID>
CASHFREE_SECRET_KEY=<fresh sandbox secret>
CASHFREE_ENV=sandbox
CASHFREE_SANDBOX_ENABLED=true
```

`APP_ORIGIN` must be a trusted HTTPS origin without a trailing slash/path. Whitelist that exact domain in Cashfree. Restart the preview after changing local secrets. Default checkout stays disabled; setting `CASHFREE_ENV=production` is explicitly rejected. `PAYMENTS_ENABLED` does not enable production Cashfree.

### Flow and safeguards

- `/checkout` requires login. Account-specific pricing is shown privately. The paid sandbox path applies to men; other accounts are not silently charged.
- The server reads the amount from D1 and requires the approved test value 29900 paise. Cashfree receives `order_amount: 299` INR; clients cannot set the amount or currency.
- A 10-digit customer phone and opaque internal customer ID are sent to Cashfree for checkout. The application does not persist the submitted phone; no account name, email, Aadhaar or selfie is sent by this integration.
- Reserve a canonical D1 order before provider calls. Parallel retries share a stable order ID and UUID `x-idempotency-key`; provider failures can retry the same order instead of creating duplicates.
- Orders use `https://sandbox.cashfree.com/pg`, server-only `x-client-id`/`x-client-secret`, and API version `2025-01-01`.
- Only an authenticated owner receives a payment session. History/export never returns session IDs or credentials.
- The Cashfree v3 SDK is loaded from `https://sdk.cashfree.com/js/v3/cashfree.js` only after the member starts a configured checkout. It opens redirect checkout with `mode: sandbox`. CSP allows Cashfree SDK/connect/frame domains, not arbitrary external scripts.
- Return page `/payment-result?order_id=…` asks the backend to fetch the order and payments. A browser redirect, query flag or client success message is never trusted.
- Exact merchant order, customer ID, amount, currency, order `PAID`, payment `SUCCESS`, and `is_captured: true` are required for a confirmed test payment.
- Cashfree webhooks are verified using `Base64(HMAC-SHA256(secret, x-webhook-timestamp + rawBody))`. Signature verification precedes JSON parsing. Event bodies are hashed for deduplication, not stored raw.
- Reconciliation fetches provider state; webhook content alone does not establish payment success. SQL protects paid/review states against stale callbacks. Signed refund/dispute events conservatively enter terminal review; actual refunds are not executed.
- **Sandbox success never activates real membership or changes any verification flags.** Live checkout, activation, refunds/dispute administration, tax invoices and real provider E2E approval are still outstanding.

Webhook setup: configure `https://YOUR_APPROVED_HOST/api/cashfree/webhook` in Cashfree’s Test dashboard and exercise success/failure/dropped/refund/dispute events. The signing secret is the Cashfree PG sandbox secret. This project was tested with mocked Cashfree responses and real local SQLite/D1, not real merchant transactions or external SDK checkout.

Official references:
- Hosted checkout: https://www.cashfree.com/docs/payments/online/web
- Create order: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order
- Get order: https://www.cashfree.com/docs/api-reference/payments/latest/orders/get-order
- Payments for order: https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-an-order
- Signature verification: https://www.cashfree.com/docs/payments/online/webhooks/signature-verification

## Account/security and legacy foundations

D1 persistence, parameterized SQL, input/body validation, origin checks, D1 rate limits, no-store private responses, CSP/security headers, and redacted operational logs. Cookies are `__Host-`, Secure, HttpOnly, SameSite=Lax, with hashed random session tokens and a seven-day expiry. Expiring hashed email/reset tokens are single-use; password reset revokes sessions.

Passwords require at least 12 characters. **Current PBKDF2-SHA256 work factor is 100,000 to fit Workers Web Crypto constraints. Adopt a reviewed managed-auth or suitable memory-hard solution before public launch.** Existing code is not a security certification.

Resend email confirmation/reset adapters need a verified sending domain and server secrets. Declared DOB is not verification. Deletion requests disable preferences, cancel private interests and hide affected active inbox items; final processing/financial retention requires operators. Exports include own records and verification flags, but no passwords/session secrets or another member’s private identity from matching.

Legacy authorized booking state transitions, rescheduling, `.ics`, availability/overlap/buffer triggers, restricted messages, and review/report APIs remain for compatibility. New direct bookings are closed; these are not yet connected to private-interest confirmation. Tests seed legacy records directly.

Private membership rules remain: women included, men proposed ₹299 one time, other identities pending policy. No public women-free promotion. Legal/provider review is required. Payment does not guarantee consent, affection, acceptance, or a meeting; no companion payouts or separate meeting fees are configured.

## Pages and API entry points

| Route | Purpose |
| --- | --- |
| `/` | Public photo-free homepage and FAQs |
| `/browse?city=&activity=&date=` | Private plan form |
| `/notifications`, `/dashboard`, `/onboarding` | Personal inbox/preferences, own interests and account details |
| `/verification` | Private requirements and disabled secure-collection controls |
| `/checkout` | Account-specific Cashfree sandbox checkout/configuration state |
| `/payment-result?order_id=` | Server-verified, account-owned test payment result |
| `/register`, `/login`, `/forgot-password` | Account flows; new registrations continue to verification |
| `/verify-email?token=`, `/reset-password?token=` | Single-use token flows |
| `/calendar`, `/availability` | Date explorer, not public member availability |
| `/how-it-works`, `/pricing`, `/safety` | Public information |
| `/messages`, `/admin`, `/contact` | Explicitly unavailable operational workflows |
| `/terms`, `/privacy`, `/refunds`, `/guidelines` | Draft policies |
| `/companions/:id` | 404; no public person profiles |

API base `/api`:
- Public `GET /health`, `/config`, `/companions` (empty directory).
- Account `GET /auth/me`; `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/resend`, `/auth/verify`, `/auth/forgot`, `/auth/reset`.
- Authenticated `GET/PUT /profile`; `GET /account/export`; `POST /account/deletion`.
- Authenticated `GET /verification/status`; `POST /verification/start` and `/verification/upload` fail closed with 503.
- Authenticated `GET /cashfree/config`; `GET/POST /cashfree/orders`; `POST /cashfree/orders/:id/verify`.
- Public but signature-protected `POST /cashfree/webhook` (only bypasses browser-origin check, not authentication of provider data).
- `GET/PUT /notification-preferences`; `GET/POST /private-plans`; `POST /private-plans/:id/cancel`.
- `GET /notifications`; `POST /notifications/:id/read`; `POST /private-invitations/:id/respond` (`interested|declined`) and `/block`.
- Legacy `GET /bookings`; `POST /bookings/:id/status`, `/reschedule`; `GET /bookings/:id/calendar.ics`; `GET/POST /conversations/:id/messages`; `/blocks`, `/reports`, `/reviews`.
- Legacy unconfigured Razorpay routes `/payments/order`, `/payments/verify`, `/payments/webhook`, `/payments/history`.
- `/admin/*` remains disabled until administrator provisioning/MFA/management workflows exist.

Record authorization is server-side. Browser gates are not security boundaries. Application verification/account authorization is separate from any hosting route-admission or Genspark sign-in policy.

## Data and migrations

- `0001_initial.sql`: original accounts/auth/consents/memberships, settings, legacy bookings/messages, payments, blocks/reports/reviews/notifications and audits/deletion requests.
- `0002_private_connections.sql`: hides public profiles, private preferences/plans/invitations, notification indexes and atomic triggers.
- `0003_cashfree_verification.sql`: selfie/ID result flags, Cashfree orders/events with canonical-open-order constraint, and stricter recipient eligibility trigger.
- D1 is the only runtime persistence. No runtime filesystem, in-memory database, KV, cron or long-running server. No document/selfie storage or R2 bucket is provisioned.
- Existing records are preserved. No destructive reset. No photographs ship publicly; styling is CSS/SVG and Google Fonts.
- Hono build uses `emptyOutDir: true` to remove stale assets.

## Local setup

```sh
cd /home/user/webapp
npm ci
npm run db:migrate:local
# Stop an existing PM2 preview before a clean build.
pm2 stop webapp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/health
pm2 logs webapp --nostream
```

The root Wrangler config intentionally retains a local placeholder D1 ID (`00000000-0000-0000-0000-000000000001`) for development and managed auto-provisioning. User-owned production uses the isolated `deploy/byok/wrangler.jsonc` with its actual D1 binding; do not use the root config for direct Pages deployment. Do not deploy test fixtures. Restart after clean builds to refresh Wrangler’s asset manifest; verify `/static/app.js` returns 200 and removed photos return 404.

Use test details and a unique test password. For authentication email, configure `APP_ORIGIN`, `EMAIL_API_KEY` (Resend), `EMAIL_FROM`, sending-domain SPF/DKIM/DMARC, and verify delivery/expiry/failure flows. Invitation emails and optional phone OTP are separate unimplemented features.

## Tests and limits

- `npm test`: **36** API integration tests, including private verification requirements, no upload-based verification, missing-secret payment gates, private notifications, account isolation and legacy regressions.
- `npm run test:browser`: **51** desktop/mobile checks, including female/male verification screens, disabled collection, private plans/inbox and unavailable Cashfree checkout without secrets.
- `npm run test:cashfree`: **13** tests/subtests using a mocked provider and real SQLite. Covers signatures/tampering, canonical parallel order creation, owner/amount/currency checks, false browser-success flags, captured payment, deduplication, review states, and no real membership activation.
- `npm run test:db`: **10** schema/constraint tests apply all migrations.
- `npm run test:payments`: **10** legacy payment-rule tests.
- `node tests/accessibility.test.mjs`: **11** routes passed automated axe WCAG 2 A/AA checks; not a full accessibility certification.
- Build passes; Worker approximately **25 KB gzipped**. `npm audit`: no known vulnerabilities at final check.

Playwright needs Chromium and Linux libraries (`npx playwright install chromium`). Screenshots are under ignored `tests/artifacts/`. Integration fixtures are local-only and cleaned up. Provider signature/transport/SDK behavior was mocked where secrets are required. No actual document verification, liveness check, external checkout, refund or payment has been claimed. Manual accessibility, provider sandbox E2E, load/penetration tests and production operations remain required.

## Launch blockers

- Revoke exposed live key. Configure fresh sandbox secrets and a whitelisted domain; exercise Cashfree’s actual sandbox before considering production.
- Select and contract an approved identity/liveness/age-verification provider. Implement hosted collection, consent, signed result processing, secure evidence/retention and alternate-ID/appeal workflows. Do not accept unmasked Aadhaar or selfies through support/chat.
- Complete production payment integration/activation, Cashfree merchant approval for the actual business model, taxes, receipts, refunds/disputes and administrator MFA/audit workflows. Sandbox success must remain separate from real access.
- Legal review of gender-based prices/ID requirements and pricing for other identities, final policies/entity/grievance contacts/retention and statutory financial exceptions.
- Mutual meeting confirmation, consent-based optional disclosure, conflict-free private booking continuation, staffed moderation/reporting/support and appeals.
- Harden authentication, distributed abuse controls, token/session/notification retention, monitoring, recovery drills and security review.
- Hosting and D1 provisioning are complete on both selected paths. Payment/email/verification provider setup is still separate and must be configured per site. Do not treat successful website deployment as approval to collect money or identity documents.
- No 24/7 support/emergency-monitoring claims. Keep private pages and the preview unindexed.

## Backup and rollback

Version migrations in git. Before production migrations, back up D1 using the chosen platform’s export/time-travel facility and test restore into separate staging. Store exports privately, never in public assets/git. Use compatible application rollbacks and reviewed reconciliation/data-loss plans for database recovery. Historical source backups can contain the old illustrative photos; current public assets do not. No destructive restore/reset was executed.
