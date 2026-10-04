import { describe, expect, it } from "vitest";
import { extractJobLinks, parsePublicHtml, parsePastedText } from "./local-parser";

describe("local parser", () => {
  it("normalizes pasted vacancy text and preserves source", () => {
    const vacancy = parsePastedText({ url: "https://www.linkedin.com/jobs/view/123", title: "Senior Frontend Engineer", company: "Acme", location: "Remote", description: "React TypeScript GraphQL role. Work remotely with a product team. Contact careers@acme.dev." });
    expect(vacancy.source).toBe("LinkedIn");
    expect(vacancy.companyEmail).toBe("careers@acme.dev");
    expect(vacancy.companyDataSource).toContain("Local Parser");
  });

  it("extracts a public JobPosting JSON-LD document", () => {
    const vacancy = parsePublicHtml("https://acme.dev/jobs/frontend", `<html><head><script type="application/ld+json">{"@type":"JobPosting","title":"Frontend Engineer","description":"Build React interfaces with TypeScript for a remote product team.","hiringOrganization":{"name":"Acme","sameAs":"https://acme.dev"},"jobLocation":{"address":{"addressLocality":"Remote"}},"datePosted":"2026-09-28"}</script></head><body></body></html>`);
    expect(vacancy.title).toBe("Frontend Engineer");
    expect(vacancy.company).toBe("Acme");
    expect(vacancy.companyWebsite).toBe("https://acme.dev");
  });

  it("finds vacancy links on a public search page", () => {
    const links = extractJobLinks("https://hirify.me/jobs?query=frontend", `<a href="/jobs">All jobs</a><a href="/jobs/1-frontend">Frontend</a><a href="/jobs/2-react">React</a><a href="/about">About</a>`);
    expect(links).toEqual(["https://hirify.me/jobs/1-frontend", "https://hirify.me/jobs/2-react"]);
  });

  it("does not mistake category pages for individual vacancies", () => {
    const links = extractJobLinks("https://remoteok.com", `<a href="/remote-jobs/">All jobs</a><a href="/remote-jobs/frontend-engineer-acme-123">Frontend</a><a href="/remote-marketing-jobs">Marketing category</a>`);
    expect(links).toEqual(["https://remoteok.com/remote-jobs/frontend-engineer-acme-123"]);
  });
});
