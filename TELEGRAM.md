# Future Telegram adapter

P1 contract: Telegram webhook forwards text to the same `normalizeVacancy` → `scoreVacancy` → `saveVacancy` pipeline used by manual and HH imports.

Expected environment variables:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The bot should reply with score, top reasons, hard stops and three deep-link actions: Open, Shortlist, Skip. It must not submit applications or message recruiters. Token handling and webhook deployment are intentionally not implemented in P0.
