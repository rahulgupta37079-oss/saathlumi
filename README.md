# Saathlumi

An adults-only, strictly platonic companion-booking application for India. Warm ivory, deep plum, coral accents, and an editorial, responsive interface.

## Name and availability

The public-facing working name is **Saathlumi** (saath-loo-mee). An exact-name web search on 2026-09-10 returned no indexed matches: https://www.google.com/search?q=%22Saathlumi%22. This is a preliminary search, not a guarantee of uniqueness or legal clearance. Domain registration, social handles, Indian and international trademarks, phonetic/similar-name conflicts, and company-name availability have not been verified or reserved.

Legacy internal identifiers (`togetherly-db`, `__Host-togetherly`, and calendar event UID namespaces) are intentionally unchanged to preserve existing data, sessions, and calendar identity. They are not public branding. Membership rules and the removal of public free-for-women messaging are unchanged.

## Current status

**Working development preview with a tested backend foundation. Not production-ready or approved for live meetings/payments.** This implementation intentionally does not pretend missing providers or operational workflows exist.

- Preview: https://3000-in1a4e08bsgdp4voh3kqb-18e660f9.sandbox.novita.ai
- Local: http://localhost:3000
- Health: `/api/health`
- Production: not deployed. Preview URL is temporary.
- Source: `/home/user/webapp`, branch `main`.
- Stack: Hono, TypeScript, Cloudflare Pages/Workers, D1, vanilla browser JavaScript and CSS.
- No Node filesystem, in-memory persistence, WebSocket server, KV binding, or scheduled trigger is used at application runtime.

## Completed interface

- Responsive homepage, navigation, lifestyle imagery, four-step explainer, activities, planned cities, membership pricing, safety section, FAQs, and footer.
- Discovery with name/interest search and city/activity/gender/language filters; date selection displays sample availability. Filter reset and empty states work.
- Three clearly labelled fictional sample profiles. Images are illustrative, not real members. Samples are not inserted into D1 and cannot receive bookings or messages.
- Month/week/day calendar explorer, IST-labelled sample times, duration, public venue, introduction, consent checkbox, and a non-persisted request preview dialog.
- Registration, login, logout, password-reset and email-verification forms.
- D1-connected private profile editing, account dashboard/membership status, account export, and deletion-request submission.
- Informative, explicitly disabled checkout, administrative access, verification/photo upload, and support states.
- Safety, community guidelines, draft terms/privacy/refund policies, and real HTTP 404 responses.
- Semantic landmarks, keyboard focus, labelled controls, native dialog/FAQ behavior, reduced-motion support, and contrast adjustments.

## Backend foundation

### Accounts and privacy

- D1 users, salted PBKDF2-SHA256 password hashes, hashed random session tokens, 7-day `__Host-` Secure/HttpOnly/SameSite=Lax cookies.
- Minimum 12-character passwords. **Current PBKDF2 work factor is 100,000 to fit the Workers Web Crypto limit; replace with a reviewed managed-auth or suitable memory-hard solution before a public launch.** This is not a security certification.
- Validated adult date of birth, versioned policy consents, private-by-default profiles, account and companion roles.
- Email confirmation is separate from adult/identity verification. No identity badge is fabricated.
- Resend email adapter, hashed expiring single-use verification/reset tokens, session invalidation on password reset.
- Verification token tests use privileged local fixtures, not a public bypass. Email sending is unavailable until configured.
- Parameterized queries, origin checks for browser mutations, request body limits, D1-backed rate limits, CSP, security headers, redacted error logs, private API responses marked no-store.
- Rate limits currently share a hashed IP bucket; a production design should add distributed account-level abuse controls, CAPTCHA/Turnstile as appropriate, and retention cleanup.

### Membership

- Public presentation no longer advertises free membership for women: the homepage/pricing card, FAQs, and draft terms use account-specific membership wording. The anonymous configuration API omits the female rate. Existing membership rules and private signed-in checkout details remain unchanged.
- D1 `settings` supplies male amount 29900 paise and female amount 0.
- Women receive active free membership; men have an inactive membership until a verified capture; self-described/undisclosed genders receive `pending-policy`.
- Registration is free for everyone. ₹299 is a one-time platform fee, not a meeting charge, recurring subscription, or guarantee of consent.
- No companion payouts, separate companion charges, or cancellation fees are configured.

### Booking and messaging APIs

The APIs exist and are integration-tested with isolated local fixtures. The browser deliberately uses sample profiles rather than exposing an unfinished live marketplace.

- Booking creation requires email/adult verification and active membership, a visible approved companion, published availability, no block, a future slot, and 60/90/120-minute duration.
- Recurring availability/blocked-day schema, UTC timestamps, Asia/Kolkata conversion, minimum notice, 30-minute buffers.
- D1 triggers atomically prevent overlapping accepted bookings for either participant, including when a person switches requester/companion roles.
- Pending/accepted/declined/cancelled/expired/completed/no-show transitions; only companions may accept/decline; completion/no-show requires the meeting to have ended.
- Pending expiry catches up on incoming member booking requests; no unsupported scheduler.
- Reschedule proposals require the other participant’s acceptance. Accepted bookings export `.ics` with UTC times.
- Persisted messages restricted to eligible participants of accepted/completed bookings. Third-party access and blocked interactions are denied.
- Reporting, blocking (also cancels active plans), and completed-booking review eligibility APIs.
- No staffed report handling, delivery notifications, complete messaging UI, availability publishing UI/API, or live booking management UI yet.

### Razorpay integration foundation

- Server-side order creation, server-derived amount, checkout HMAC validation, raw-body webhook HMAC validation, exact order/member/amount/currency matching, and provider-side payment lookup.
- `created`/authorized states do not activate access; only captured payments can.
- Event IDs deduplicate webhook delivery. SQL preserves terminal refund/dispute states during out-of-order processing; revoked membership cannot be automatically reactivated.
- Full refunds/disputes revoke paid membership. Partial refunds retain current captured state and require a reviewed final policy. Closed disputes remain revoked pending manual review.
- Unique pending-order constraint prevents storing multiple payable current orders; provider-side order-creation races/orphan reconciliation still need a production review.
- Payment history endpoint exists. Refund execution, receipts/invoices, dispute appeals, administrator review and Razorpay Checkout browser integration are not implemented.
- **Checkout stays disabled in the browser even if secrets are added. Do not enable payments by merely setting environment variables.** Complete the missing UI, tax decisions, provider tests and operations first.
- No real provider transaction, refund or delivery has been executed during testing.

## Entry points

| Page | Purpose / parameters |
| --- | --- |
| `/` | Marketing homepage; `#faq` and section anchors |
| `/browse` | Preview filters: `city`, `activity`, `gender`, `language`, `q`, `date` |
| `/companions/ananya`, `/companions/arjun`, `/companions/meera` | Fictional examples and calendar/request previews |
| `/how-it-works`, `/pricing`, `/safety` | Public explanation pages |
| `/register` | Optional `gender=woman/man`, `role=companion` |
| `/login`, `/forgot-password` | Account flows |
| `/verify-email?token=…`, `/reset-password?token=…` | Single-use emailed token flows |
| `/dashboard`, `/onboarding` | Account overview and private profile editing |
| `/calendar`, `/availability` | Sample calendar, not availability publishing |
| `/messages` | Account-gated messaging empty state |
| `/checkout`, `/payment-result` | Explicitly unavailable payment UI |
| `/admin` | Fail-closed administrator access state |
| `/contact` | Support setup status and emergency guidance |
| `/terms`, `/privacy`, `/refunds`, `/guidelines` | Draft policies/community rules |

API base `/api`:

- `GET /health`, `/config`, `/auth/me`, `/companions?city=&limit=&offset=`.
- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/resend`, `/auth/verify`, `/auth/forgot`, `/auth/reset`.
- Authenticated `GET/PUT /profile`; `GET /account/export`; `POST /account/deletion`.
- `GET/POST /bookings`; `POST /bookings/:id/status`, `/bookings/:id/reschedule`; `GET /bookings/:id/calendar.ics`.
- `GET/POST /conversations/:id/messages`; `POST /blocks`, `/reports`, `/reviews`.
- Gated `POST /payments/order`, `/payments/verify`, `/payments/webhook`; authenticated `GET /payments/history`.
- `/admin/*` denies access until provisioning/MFA/administration is implemented. Application roles and data authorization are distinct from any future hosting route-admission rules.

API data is always authorized server-side. Page redirects and empty states are not security boundaries.

## Data architecture

`migrations/0001_initial.sql` creates users, profiles, roles, consent_records, verification_records, sessions, auth_tokens, rate_limits, settings, memberships, availability_rules, availability_exceptions, bookings, conversations, messages, payment_orders, payments, webhook_events, reviews, reports, blocks, notifications, admin_audit_logs, and deletion_requests.

D1 persists account/business data. No R2 bucket is provisioned; image uploads and ID-document uploads are disabled. Public illustrative images are packaged static assets. Form selections and booking-preview state are ephemeral browser state, not real bookings.

## Setup and preview

```sh
cd /home/user/webapp
npm ci
npm run db:migrate:local
npm run build
# Clear an existing preview before starting (or stop its PM2 process first).
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/health
pm2 logs webapp --nostream
```

Wrangler has a deliberately local placeholder D1 ID (`00000000-0000-0000-0000-000000000001`). It must be replaced/provisioned through the chosen hosting workflow for production. Do not apply local test fixtures to a remote database.

Use test details and a unique test password in this development preview. Create an account to edit your private profile. Email/adult verification gates prevent live meetings. Browse samples without an account; selecting a date/time and filling the form opens a clearly marked request preview, not a booking.

### Email configuration

Copy `.dev.vars.example` to `.dev.vars` locally and configure `APP_ORIGIN`, `EMAIL_API_KEY` (Resend), and `EMAIL_FROM` with a verified sending domain. Never commit credentials. Set production secrets through the selected deployment platform. Validate sending-domain SPF/DKIM/DMARC, consent copy, callback origins, delivery, expiry, reuse, and failure handling before launch. Optional phone OTP is not implemented.

### Payment setup checklist

1. Obtain Razorpay merchant approval for the actual platonic-companionship business category.
2. Finalize legal entity, gender-pricing policy, tax inclusion/registration, refunds, chargebacks, and customer support details.
3. Complete checkout SDK UI and narrow CSP integration, receipts, reconciliation, admin MFA/refunds, and operational monitoring.
4. Use Razorpay test-mode `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a distinct `RAZORPAY_WEBHOOK_SECRET`; keep them server-side.
5. Configure webhook target `https://YOUR_APPROVED_DOMAIN/api/payments/webhook`. Test captured/failed/refund/dispute events with Razorpay’s real sandbox, including invalid signatures, duplicates and concurrent/out-of-order events.
6. Only after review, configure D1 `tax_configured` and `pricing_approved`, then `PAYMENTS_ENABLED`. This does not itself enable the unfinished checkout UI.
7. Use live secrets only after launch approval. Never store card details or trust a frontend callback alone.

## Tests and results

Validated in the local preview:

| Suite | Result |
| --- | --- |
| `npm test` | 23 API integration tests passed |
| `npm run test:db` | 10 isolated migration/constraint tests passed |
| `npm run test:payments` | 10 signature/payment-state unit tests passed |
| `npm run test:browser` | 29 desktop/mobile browser checks passed (1440px and 390px) |
| `node tests/accessibility.test.mjs` | 8 pages passed automated axe WCAG 2 A/AA checks |
| `npm run build` | Passed; approximately 20 KB gzipped Worker |
| `npm audit` | 0 known vulnerabilities at final check |

Browser dependencies: `npx playwright install chromium`; on fresh Linux hosts also install Playwright OS dependencies. Screenshots are saved under ignored `tests/artifacts/`.

API fixture tests are explicitly restricted to localhost, create temporary verified test accounts with SQL, and clean them up. Repeated runs can correctly hit rate limits; use a fresh local test database or allow the configured window to expire. Never disable production rate limits for tests.

Payment unit tests verify local signature/state rules and database tests cover webhook uniqueness; **they are not a claim that Razorpay transport, refunds, email delivery, identity verification, or full production concurrency has been certified**. Real provider end-to-end tests, load tests, manual screen-reader checks, penetration testing, and operational exercises remain required. Automated axe results are not an accessibility certification.

The development-only `sharp` transitive dependency is overridden to a patched release to resolve an audit finding. Revalidate Wrangler compatibility when updating dependencies.

## Production-readiness checklist / next steps

- [x] Responsive public design and clearly separated fictional samples.
- [x] D1 schema, account persistence, private profiles, secure-cookie sessions, token lifecycle, input/origin checks.
- [x] Server-side booking/messaging foundation and atomic overlap protection.
- [x] Payment signature/state foundation with checkout fail-closed.
- [x] Automated tests, environment template, source control, preview.
- [ ] Choose Genspark-managed hosting or the owner’s Cloudflare account; provision actual production D1 and, if uploads are added, R2. No production deployment has occurred.
- [ ] Implement and validate a genuine adult-verification provider; keep profiles unpublished until passed.
- [ ] Administrator provisioning, MFA, fine-grained moderator permissions, review/moderation console, refund confirmation, audit workflows and appeals.
- [ ] Replace fictional discovery with approved real profiles; connect full booking management, real availability publishing, inbox/polling, notifications, block/report controls, review display and pagination to APIs. Remove samples from production entirely.
- [ ] Harden authentication against current password-storage recommendations and production resource constraints. Review concurrent eligibility/block/payment transitions, session cleanup and token retention.
- [ ] Profile photo upload validation, R2 storage, moderation and privacy; no raw identity-document upload unless essential and reviewed.
- [ ] Razorpay SDK/merchant approval, tax handling, live payment tests, receipts, refunds and chargeback operations.
- [ ] Email domain/provider, deliverability tests and account recovery operations; optional phone provider if wanted.
- [ ] Decide pricing for self-described/undisclosed gender, review gender-based pricing legally and with payment provider. Do not infer gender from photos/IDs or silently choose a charge.
- [ ] Final legal terms, consent versions, privacy purposes, retention periods, owner/grievance contacts, cancellation/refund policy, deletion turnaround, financial retention exceptions.
- [ ] Staff safety escalation, report review, member support and appeals. Do not claim 24/7 support or emergency monitoring.
- [ ] Error monitoring/alerts, backup/restore drills, rollback procedure, rate-limit cleanup, production load/security/accessibility review.
- [ ] Real marketing SEO only after launch. Preview intentionally uses noindex and robots disallow; private account pages must remain excluded.

## Backup, migration, and rollback plan

Version migrations in git. Before each production migration, use the chosen platform’s D1 export/backup or time-travel facility and retain the schema version and deployment commit. Validate a restore into a separate staging database and run smoke tests before relying on the backup. Keep exports outside public assets and out of git; they may contain personal data. Apply forward-compatible migrations before changing application code. Roll back application code to a compatible commit; restore a database only with a reviewed reconciliation/data-loss plan. No destructive automated reset or restore has been provided or executed. Define final recovery-point/recovery-time objectives with the owner before launch.

## Image provenance

Images were retrieved through the provided Creative-Commons/public-domain-filtered image search and stored locally. No commercial-stock crawler extraction was used. Source references:

- `coffee-friends.jpg`: https://www.pickpik.com/beard-beverage-break-business-cafe-coffee-45390 — lifestyle illustration, not members.
- `sample-ananya.jpg`: https://easy-peasy.ai/ai-image-generator/images/hyper-realistic-portrait-smiling-south-asian-individual — AI illustrative sample.
- `sample-arjun.jpg`: https://pxhere.com/en/photo/1365479 — illustrative sample.
- `sample-meera.jpg`: https://www.pickpik.com/girl-madagascar-africa-woman-young-smole-115863 — illustrative sample.
- `community.jpg`: https://easy-peasy.ai/ai-image-generator/images/diverse-group-lively-conversation-cafe-scene — AI lifestyle illustration.

All sample identities and bios are fictional; do not imply depicted people endorse the business or offer companionship. Reconfirm source license terms and any model/personality permissions needed for the final commercial campaign. Typography is served from Google Fonts (DM Sans and Manrope); self-host fonts if your final privacy policy requires it.
