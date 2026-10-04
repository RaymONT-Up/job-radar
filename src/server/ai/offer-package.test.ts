import { describe, expect, it } from "vitest";
import { parseAiOfferPackageResponse } from "./offer-package";

const packageJson = {
  strategy: "Откликнуться напрямую и подкрепить релевантным результатом.",
  resumeHeadline: "Senior Frontend Engineer — TypeScript and product delivery",
  recruiterMessage: "Здравствуйте! Вижу сильное совпадение по TypeScript.",
  coverLetter: "Короткое персональное письмо.",
  followUpMessage: "Здравствуйте! Возвращаюсь к своему отклику.",
  interviewPitch: "Я frontend-инженер с подтверждённым продуктовым опытом.",
  interviewQuestions: ["Как устроена команда?"],
  risks: ["Уточнить рабочий язык."],
};

describe("AI offer package response", () => {
  it("parses Responses API structured output", () => {
    const result = parseAiOfferPackageResponse({
      output: [{ content: [{ type: "output_text", text: JSON.stringify(packageJson) }] }],
    });

    expect(result).toEqual(packageJson);
  });

  it("rejects an incomplete model response", () => {
    expect(() => parseAiOfferPackageResponse({ output_text: JSON.stringify({ strategy: "missing fields" }) })).toThrow();
  });
});
