# JOB RADAR — Roadmap

## 1. Telegram ingestion

Bot/webhook принимает forwarded vacancy text, возвращает score/reasons и deep link. Сначала single-user token, затем source/channel rules.

## 2. Browser extension

One-click structured capture с LinkedIn и career pages, preview перед сохранением, никаких auto-apply действий.

## 3. Career page ingestion

Adapter registry, RSS/sitemap/ATS connectors (Greenhouse, Lever), incremental cursors и retry queue.

## 4. LLM semantic scoring

Опциональный второй слой после deterministic score: semantic responsibilities/domain fit, versioned prompts, cached explanations, no silent score replacement.

## 5. Recruiter discovery

Ручной, ограниченный workflow поиска релевантного hiring contact без массовых сообщений.

## 6. Personalized outreach

Draft-only сообщения на основе конкретных match signals; пользователь всегда редактирует и отправляет сам.

## 7. Interview question database

Вопросы и notes связаны с role/company/stage, reusable preparation packs и outcome tagging.

## 8. Multi-user auth

Isolated workspaces, ownership checks, encrypted secrets, audit trail и export/delete guarantees.

## 9. PostgreSQL

Server deployment, background ingestion workers, full-text search, durable job queues и migration path из SQLite backup.

## 10. Subscription

Только после доказанного retention: free local mode, paid hosted ingestion/automation, transparent limits.
