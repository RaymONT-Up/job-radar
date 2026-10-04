import { describe, expect, it } from "vitest";
import { enrichCompanyDetails } from "./company";

describe("company enrichment", () => {
  it("keeps a public generic email and source provenance", () => {
    expect(enrichCompanyDetails({ url: "https://acme.dev/careers/frontend", description: "Questions: careers@acme.dev" })).toEqual({
      companyWebsite: "https://acme.dev",
      companyEmail: "careers@acme.dev",
      companyDataSource: "User capture · https://acme.dev/careers/frontend",
    });
  });

  it("does not mistake an aggregator page for the company website", () => {
    const result = enrichCompanyDetails({ url: "https://www.linkedin.com/jobs/view/123", description: "Apply through LinkedIn." });
    expect(result.companyWebsite).toBeNull();
    expect(result.companyEmail).toBeNull();
  });
});
