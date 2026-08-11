import assert from "node:assert/strict";
import test from "node:test";
import { saveCaseAiFeedback } from "./offMlProject.service";

test("sends the complete Case Detail feedback identity, value, and note", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      data: {
        feedback: { result: "INCORRECT" },
        aiFeedback: {
          analysisId: "analysis-12",
          analysisVersion: 12,
          issueUnderstanding: "INCORRECT",
          issueUnderstandingReason: "สรุปอาการไม่ครบ",
        },
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  try {
    await saveCaseAiFeedback("case-12", {
      analysisId: "analysis-12",
      analysisVersion: 12,
      feedbackType: "ISSUE_UNDERSTANDING",
      value: "INCORRECT",
      reason: "สรุปอาการไม่ครบ",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestUrl, "http://localhost:4000/cases/case-12/ai-feedback");
  assert.equal(requestInit?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    caseId: "case-12",
    analysisId: "analysis-12",
    analysisVersion: 12,
    feedbackType: "ISSUE_UNDERSTANDING",
    value: "INCORRECT",
    reason: "สรุปอาการไม่ครบ",
  });
});
