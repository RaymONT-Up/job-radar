// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookmarkletLink } from "./bookmarklet-link";

describe("BookmarkletLink", () => {
  it("installs a real bookmarklet href after hydration", async () => {
    const { container } = render(<BookmarkletLink base="http://localhost:3000" />);
    await waitFor(() => expect(container.querySelector("a")?.getAttribute("href")).toMatch(/^javascript:/));
    expect(container.querySelector("a")?.getAttribute("href")).toContain("http://localhost:3000/import");
  });
});
