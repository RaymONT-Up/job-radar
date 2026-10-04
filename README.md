# JOB RADAR

Локальный рабочий инструмент, который превращает поток вакансий в короткий объяснимый список действий: normalization → dedupe → hard filters → profile-aware scoring → ranked inbox → application follow-up.

Главный экран отвечает на вопрос: **«Куда мне сегодня стоит откликнуться?»**

## Быстрый старт

Требования: Node.js 20.9+ (проверено на Node 24), npm, macOS/Linux/Windows с поддержкой `better-sqlite3`.

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Откройте [http://localhost:3000/inbox](http://localhost:3000/inbox).

Повторный `db:seed` безопасен: он создаёт только стартовый профиль кандидата и не добавляет вакансии. `npm run db:reset` очищает вакансии и историю откликов, сохраняя профиль и ключи.

## Безопасность и приватность

Job Radar рассчитан на локальный запуск одним пользователем и не содержит аутентификации. Не выставляйте запущенный экземпляр в публичный интернет без отдельного слоя auth/access control.

Локальные `.env*`, SQLite-базы, логи и ключ шифрования исключены из Git. Не добавляйте их принудительно: они могут содержать API-ключи, профиль кандидата и историю откликов. Для настройки используйте только `.env.example` как шаблон.

## Что работает

- `/inbox` — score-first список с A/B/C, причинами, рисками, hard stops, фильтрами и действиями.
- `/inbox` — проверка доступности внешних ссылок и фильтр совместимости рабочего языка.
- `/today` — новые A-fit вакансии, просроченные follow-up и зависшие процессы.
- `/applications` — компактная таблица pipeline и быстрый перевод статуса.
- `/jobs/[id]` — полный разбор, локальный Offer Sprint и опциональный AI-пакет по кнопке, контакты, notes, follow-up и event timeline.
- `/import` — ручной LinkedIn/Telegram/Getmatch/Habr импорт: paste → analyze → save.
- `/sources` — единый multi-source sync (ведёт на `/sources/hh`). Известные площадки используют выделенные адаптеры: HH API с RSS fallback, Getmatch JSON API, LinkedIn guest feed, Remote OK, Remotive, Arbeitnow, We Work Remotely RSS, Jooble (после добавления ключа) и публичные Telegram-каналы; плюс Greenhouse/Lever/Ashby career boards. Parser оставлен для разовых и неизвестных URL.
- `/sources/hh` — журнал каждого запуска обновляется в реальном времени по источникам: статус, найдено, сохранено, дубли, языковые фильтры, ошибки и список конкретных вакансий с FIT и оригинальной ссылкой. Последний журнал хранится локально в браузере.
- `/profiles` — создание, редактирование, clone, delete, activation и пересчёт всех вакансий. Быстрая настройка предлагает Frontend/Web, Product Design, Web3/Crypto и Software Engineer; вставка текста резюме локально выбирает ближайший шаблон, навыки, языки и measurable proof points для проверки пользователем.
- `/analytics` — funnel, Conversion Coach, конверсии по источнику/fit/тактике и честный insufficient-data state.
- `/capture` — bookmarklet “Send to Job Radar”.
- `/settings` — полный JSON backup/restore, applications CSV, безопасная очистка вакансий и зашифрованное хранение пользовательских API-ключей.
- `/help` — встроенная пошаговая инструкция по API, Parser, Capture, языку и ключам.
- `/jobs/[id]` — approval-first email outreach: редактируемый получатель/тема/письмо, PDF/DOCX резюме, локальный draft и отдельная кнопка `Approve & Send`. Без SMTP или подтверждающей галочки отправка невозможна.

## Переменные окружения

```env
DATABASE_URL=./data/job-radar.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
HH_USER_AGENT=JobRadar/0.4 (your-email@example.com)
TELEGRAM_JOB_CHANNELS=@frontend_jobs,@another_public_channel
CAREER_BOARD_URLS=https://jobs.lever.co/company,https://jobs.ashbyhq.com/company
CAREER_PAGE_URLS=https://company.example/careers
JOOBLE_API_KEY=your-key
JOOBLE_DOMAIN=jooble.org
JOOBLE_LOCATION=Remote
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=app-password
SMTP_FROM=you@example.com
```

`NEXT_PUBLIC_APP_URL` используется bookmarklet-страницей. HH RSS, Getmatch, LinkedIn guest, Remote OK, Remotive, Arbeitnow и We Work Remotely не требуют ключа. Job Radar сначала пробует HH API, а при 403 переключается на публичный RSS. Adzuna и SuperJob подключаются через `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `SUPERJOB_APP_ID`; Jooble — через `JOOBLE_API_KEY` и региональный `JOOBLE_DOMAIN`. Telegram читает только публичные `t.me/s`-ленты. Никогда не используйте для секретов `NEXT_PUBLIC_*`.

SMTP можно задать через `.env.local` или Settings → SMTP outreach. Пароль хранится server-only и при вводе через UI шифруется в SQLite. Письмо никогда не отправляется фоновым сборщиком: только из карточки вакансии после проверки email, текста, файла резюме, подтверждающей галочки и нажатия `Approve & Send`.

Текущий источник-агрегатор — `/api/sources/fetch`. Он запускает официальные API/public feeds, нормализует записи в общий `VacancyInput`, удаляет дубли, пересчитывает scoring и отмечает источник/оригинальную ссылку. Для LinkedIn, Wellfound, Getmatch, Telegram и закрытых job boards используется `/capture`: это осознанный clipboard flow, потому что автоматический login/scraping нестабилен и часто нарушает правила сервисов.

Ключи можно задать двумя способами: server-only `.env.local` или Settings → API-ключи источников. Интерфейс хранит значения зашифрованными AES-256-GCM в локальной SQLite; ключ шифрования создаётся в `data/.credentials.key` (или задаётся через `SOURCE_CREDENTIALS_KEY`) и исключён из git. JSON backup намеренно не содержит секреты.

Прямые career pages компаний поддерживаются для Greenhouse, Lever и Ashby. Вставьте board URL на странице Sources — сервер обратится к публичному API ATS, а не будет парсить HTML. Рабочий email сохраняется только если он опубликован в тексте вакансии; адреса не угадываются. Сайт компании и контакт имеют `company_data_source`, чтобы было видно происхождение каждого поля.

LLM не обязателен: нормализация, язык, hard stops, scoring и базовый Offer Sprint детерминированы и не тратят токены. Для персонального пакета отклика пользователь сам нажимает «Сгенерировать с AI» внутри вакансии. Свой OpenAI API key можно сохранить в Settings или задать server-only через `.env.local` (`AI_API_KEY` либо `OPENAI_API_KEY`; модель — `AI_MODEL`, по умолчанию `gpt-5-mini`). До клика внешний запрос не выполняется. Клиент никогда не получает секрет и не вызывает модель напрямую; API-запрос делает локальный сервер с `store: false`.

## База данных

Схема — Drizzle ORM + SQLite (`src/server/db/schema.ts`). Миграции лежат в `drizzle/` и применяются командой:

```bash
npm run db:migrate
```

Основные таблицы: `candidate_profiles`, `vacancies`, `vacancy_normalized_data`, `vacancy_scores`, `applications`, `application_events`. Внешние ключи и уникальные ограничения включены; SQLite работает в WAL mode.

## Scoring

Scoring полностью детерминирован и не вызывает LLM. Он состоит из декларативных правил в `src/features/vacancy-scoring/`:

- title — 20;
- skills — 25;
- domain — 15;
- experience — 10;
- remote/location — 10;
- salary — 10;
- freshness — 5;
- bonus signals — до 5.

Вес каждой основной категории хранится в CandidateProfile. Hard stop ограничивает score значением 30 и остаётся видимым отдельно. Поэтому одна вакансия получает разные оценки для разных профилей.

Языковая политика CandidateProfile бывает strict/flexible. В strict режиме явное несовпадение рабочего языка — hard stop; короткий англоязычный snippet без требования языка не блокируется.

## Offer Sprint и качество источников

Offer Sprint превращает релевантную вакансию в следующий измеримый шаг. Базовый пакет сразу и локально выбирает proof points из профиля, формирует заголовок резюме, сообщение рекрутеру, чек-лист и вопросы для интервью. Опциональный AI-пакет по явному клику использует профиль + выбранную вакансию и возвращает персональную стратегию, письмо, follow-up, interview pitch, вопросы и риски в строгой JSON-схеме. Промпт запрещает выдумывать опыт, метрики и владение технологиями. Тактика отклика (`tailored`, `direct_outreach`, `referral`, `quick_apply`) сохраняется в application и сравнивается в Analytics.

Внешние вакансии проходят availability verification. HH проверяется через официальный detail API; остальные URL получают `active`, `unavailable` или `unknown`. Seed не создаёт демонстрационные вакансии: Inbox заполняется только реальным импортом, API, ATS, Parser или Capture.

## API и Local Parser

Local Parser — это server-side fetch на локальном Next.js сервере (`/api/sources/parse`). За один запуск он параллельно обрабатывает до 20 прямых URL (concurrency 4), либо сначала извлекает до 50 ссылок с каждой публичной страницы поиска/категории, а затем разбирает вакансии. Извлекаются JSON-LD `JobPosting`, OpenGraph/meta и текст, после чего запись проходит тот же normalize → dedupe → score → verify pipeline. Парсер не имеет cookies браузера, не обходит весь домен и не пытается обходить CAPTCHA, authwall, paywall или rate limits. Если LinkedIn, Hirify или другой сервис требует вход, используйте `/capture` или вставьте полное описание вакансии. Короткий необязательный текст при наличии URL игнорируется, поэтому он не блокирует разбор ссылки.

На странице источников «Максимальный автопоиск» включает все уже готовые адаптеры. Карточки прямо показывают состояние источника: «готов», «нужен ключ», «нужен URL» или «Capture / OAuth», и дают ссылку на следующий шаг. Поля Parser принимают как обычные переносы строк, так и видимую последовательность `\\n`. Каждый API-запрос, URL и discovery-страница получает отдельную строку в журнале с результатом, дублями и понятной ошибкой.

## Фоновый сбор раз в 6 часов

Разовый запуск использует тот же ingest/dedupe/scoring pipeline, что и UI:

```bash
npm run collect:jobs
```

На macOS локальную задачу launchd можно установить командами:

```bash
npm run scheduler:install
npm run scheduler:status
npm run scheduler:uninstall
```

Задача запускается сразу и затем каждые 21600 секунд. Логи лежат в `data/logs/`. На Linux `scheduler:status` печатает готовую строку для cron. Карьерные ATS boards и другие публичные career pages задаются через `CAREER_BOARD_URLS` / `CAREER_PAGE_URLS` или Settings → Company career watchlist. ATS читаются через стабильный API; неизвестные страницы проходят ограниченный discovery до 30 ссылок без логина, CAPTCHA и обхода защиты.

## HH integration

`HHAdapter` использует только официальный `api.hh.ru`. Он выполняет несколько поисковых запросов, убирает повторяющиеся HH id, загружает детали с concurrency 5, очищает HTML, нормализует и сохраняет результаты. Сетевые и rate-limit ошибки возвращаются в UI, существующие данные не стираются.

## Bookmarklet

1. Запустите JOB RADAR на адресе из `NEXT_PUBLIC_APP_URL`.
2. Откройте `/capture`.
3. Перетащите “Send to Job Radar” на bookmarks bar.
4. На странице вакансии выделите текст и нажмите bookmarklet.

Если ничего не выделено, используется meta description или первые 6000 символов видимого текста. LinkedIn не скрейпится автоматически.

## Архитектура

```text
src/app/                         App Router pages and route handlers
src/entities/                    domain types, profile schema, defaults
src/features/vacancy-scoring/   extraction + explainable rules
src/features/pipeline/          application status actions
src/features/follow-up/         business-day scheduling
src/features/analytics/         pure funnel calculations
src/server/db/                   SQLite schema, migrations, seed, repository
src/server/integrations/         JobSourceAdapter, HH, future Notion contract
src/shared/                      reusable UI and utilities
src/widgets/                     app shell and navigation
```

Server Components читают SQLite напрямую. Мутации проходят через Zod-validated route handlers. Client Components отвечают только за интерактивность. TanStack Query provider готов для дальнейшего server-state caching; Zustand хранит фильтры Inbox; React Hook Form управляет import flow.

## Проверки

```bash
npm run lint
npm test
npm run build
```

Tests покрывают scoring, dedupe, follow-up business days, analytics, company enrichment, Local Parser и разбор структурированного AI-ответа. Реальный платный вызов OpenAI намеренно не выполняется без пользовательского ключа.

## Известные ограничения

- Salary extraction обрабатывает простые USD-диапазоны и приводит явно годовые/почасовые вилки к месяцу; валютная конвертация намеренно не выполняется.
- Нормализация основана на словарях/regex, поэтому редкие формулировки потребуют ручной проверки.
- HH, LinkedIn guest, Telegram и внутренние API job boards остаются внешними нестабильными интерфейсами; каждый источник изолирован, имеет понятную ошибку и не останавливает остальные.
- SMTP-отправка требует корректного app password/SMTP-провайдера. Job Radar не угадывает email и не рассылает письма без ручного approval.
- Business-day follow-up исключает субботу/воскресенье, но пока не знает государственные праздники.
- Analytics использует текущую стадию; richer event-cohort analytics оставлен на следующий этап.
- Нет auth, cloud sync, Telegram bot, browser extension и автоматической подачи откликов.
