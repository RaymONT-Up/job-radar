import { describe, expect, it } from "vitest";
import { parseHhRss, parseJobRss, parseLinkedinCards, parseTelegramFeed } from "./specialized-adapters";

describe("specialized job source adapters", () => {
  it("parses HH RSS items", () => {
    const rows = parseHhRss(`<rss><channel><item><title>Frontend Engineer</title><link>https://hh.ru/vacancy/123</link><description><![CDATA[<p>Вакансия компании: Acme</p><p>Регион: Москва</p>]]></description><pubDate>Wed, 01 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`);
    expect(rows[0]).toMatchObject({ sourceId: "123", title: "Frontend Engineer", company: "Acme", location: "Москва" });
  });

  it("parses LinkedIn guest cards", () => {
    const rows = parseLinkedinCards(`<li><a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/12345?trk=test"></a><h3 class="base-search-card__title">Senior Frontend Engineer</h3><h4 class="base-search-card__subtitle">Acme</h4><span class="job-search-card__location">Remote</span><time datetime="2026-10-01"></time></li>`);
    expect(rows[0]).toMatchObject({ sourceId: "12345", company: "Acme", remoteType: "remote" });
  });

  it("parses relevant posts from a public Telegram feed", () => {
    const html = `data-post="frontend_jobs/77"><div class="tgme_widget_message_text">Senior Frontend Engineer. React TypeScript. Пишите jobs@acme.dev</div>`;
    const rows = parseTelegramFeed("frontend_jobs", html, ["Frontend Engineer", "React"]);
    expect(rows[0]).toMatchObject({ sourceId: "frontend_jobs:77", companyEmail: "jobs@acme.dev" });
  });

  it("parses public RSS job items", () => {
    const rows = parseJobRss(`<rss><channel><item><title>Frontend Engineer at Acme</title><link>https://example.com/jobs/1</link><description><![CDATA[React and TypeScript for a remote team.]]></description><pubDate>Wed, 01 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`, "We Work Remotely");
    expect(rows[0]).toMatchObject({ title: "Frontend Engineer", company: "Acme", remoteType: "remote", source: "We Work Remotely" });
  });
});
