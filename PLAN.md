# JOB RADAR — implementation plan

1. Bootstrap a strict Next.js 16 app with Tailwind, shared layout, SQLite, and Drizzle schema.
2. Build seedable candidate, vacancy, score, application, and event data model.
3. Implement deterministic normalization, deduplication, and declarative scoring with tests.
4. Ship the ranked inbox first: profile-aware sorting, filters, reasons, risks, and actions.
5. Add manual paste analysis/save and official HH API ingestion with bounded concurrency.
6. Add Today queue, application pipeline, vacancy details, and event history.
7. Add profile management, practical analytics, capture bookmarklet, and data export/import.
8. Seed realistic data, verify live flows, then run lint, tests, and production build.
9. Document setup, architecture, limitations, roadmap, and exact verification results.
