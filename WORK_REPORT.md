# WORK REPORT

## Implemented

- Next.js 16 / React 19 / strict TypeScript application with responsive light/dark productivity UI.
- SQLite + Drizzle schema, generated migration, WAL mode, foreign keys, constraints and useful indexes.
- Seed creates only the initial candidate profile; no demo vacancies, offers or application history are generated.
- Keyword/regex normalization for skills, domains, remote, seniority, experience, salary, language and location restrictions.
- Configurable deterministic scoring with explanations, risks, hard-stop cap and per-profile results.
- Source-id, canonical-URL and conservative company/title deduplication.
- Official HH API adapter with bounded detail concurrency and robust UI error state.
- Multi-source ingestion for Remote OK, Remotive, Arbeitnow, optional Adzuna/SuperJob, plus official public Greenhouse/Lever/Ashby board APIs.
- Source catalog with credential readiness, attribution rules and one sync route for normalize → dedupe → score → verify.
- Ranked Inbox, manual import, bookmarklet, Today queue, application pipeline, detail timeline, profiles and analytics.
- JSON backup/restore, applications CSV export and a safe job-data clear action that preserves the profile and credentials.
- Notion mapping interface and Telegram integration contract for later implementation.
- Offer Sprint: proof-based application pack, recruiter message, interview questions and next-best-action.
- Strict/flexible work-language policy with Russian-only seed profile and language hard stops.
- Availability verification with active/unavailable/unknown states; unavailable links are archived from Inbox.
- Conversion Coach and application-method analytics.
- Company website/email enrichment from published vacancy data only, with `company_data_source` provenance and no guessed email addresses.
- Server-only credential contract: source keys and optional AI keys can live in `.env.local` or encrypted local storage; browser receives status, never stored secret values.
- Dual source modes: official API adapters and a local server-side Parser for public JSON-LD/meta/text, with Capture fallback for authenticated pages.
- In-client Help onboarding and Settings credential UI with encrypted local storage, non-secret status responses and secret-free JSON backups.
- Opt-in OpenAI Responses API flow: no automatic model calls; a user click generates a profile-and-vacancy-specific outreach/interview package with strict structured output and `store: false`.
- Contextual tooltips on source modes, parser inputs, credentials, Inbox filters, language policy, profile signals and scoring weights.

## Not implemented

- Telegram bot runtime, Notion OAuth/sync, browser extension, broad company discovery (ATS board URLs are supported when supplied).
- LLM semantic scoring, multi-user auth, PostgreSQL, subscription. AI is currently used only for the explicit per-vacancy application package.
- LinkedIn/Wellfound scraping and auto-apply are intentionally excluded; use capture and original application links.

## Architecture decisions

- All ranking logic is pure and deterministic; persisted scores make the UI fast and auditable.
- CandidateProfile owns dictionaries and weights, so shared vacancies can be rescored differently.
- Every status mutation writes an immutable ApplicationEvent.
- Server Components query the local database; Zod-validated route handlers own mutations.
- One `JobSourceAdapter` contract keeps source-specific parsing out of the product pipeline.
- JSON columns keep MVP profile dictionaries and extracted signals flexible without premature table explosion.

## Commands executed

```text
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Verification results

- TypeScript: passed (`npx tsc --noEmit`, zero errors).
- Lint: passed (`npm run lint`, zero warnings/errors).
- Tests: passed (8 files, 20 tests), including structured AI response parsing without a paid network call.
- Production build: passed (`next build --webpack`, all app/API routes generated).
- Production HTTP smoke test: `/inbox` returned 200 with the ranked-inbox content.
- Browser smoke test: Inbox, Today, Import analysis/save, profile editor, analytics, vacancy detail and status event verified locally.

## Known issues / limitations

- See README “Known limitations”. No known blocking P0 defect at the time of the final verification pass.
- During this session npm registry access timed out while fetching the exact optional SWC binary, so local `node_modules` used a cached 16.3.4 binary with Next 16.3.6 and emitted a version warning. The committed manifest/lockfile does not reference the fallback archive; a normal fresh `npm install` resolves the exact 16.3.6 optional binary.
- Live AI generation requires the user to provide an OpenAI API key; automated tests validate the contract without spending user tokens.

## Next 5 highest-ROI actions

1. Add Telegram forwarded-message ingestion for the highest-frequency non-API source.
2. Add background HH incremental cursor and scheduled refresh.
3. Improve currency normalization and location-region compatibility dictionaries.
4. Build a small browser extension around the proven manual capture flow.
5. Use event history for cohort/time-to-stage analytics and rejection-reason learning.
