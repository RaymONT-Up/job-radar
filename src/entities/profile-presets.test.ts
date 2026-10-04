import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "./constants";
import { inferRolePreset, profileFromResume } from "./profile-presets";

describe("profile setup presets", () => {
  it("detects frontend and web3 resumes locally", () => {
    expect(inferRolePreset("Senior Frontend Engineer React TypeScript")).toBe("frontend");
    expect(inferRolePreset("Web3 frontend engineer Solidity wallet DeFi")).toBe("web3");
  });

  it("builds a checked profile draft without sending resume text anywhere", () => {
    const result = profileFromResume("Product Designer\nFigma, UX research and design systems\n- Increased activation by 24%", DEFAULT_PROFILE);
    expect(result.presetKey).toBe("product-design");
    expect(result.profile.targetTitles[0]).toBe("Product Designer");
    expect(result.profile.proofPoints[0]).toContain("Increased activation");
    expect(result.profile.id).toBe(DEFAULT_PROFILE.id);
  });
});
