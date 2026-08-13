import assert from "node:assert/strict";
import test from "node:test";
import { OffMlProjectApiError, reviewConfidenceSuggestion, saveCaseAiFeedback } from "./offMlProject.service";

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

test("sends the complete Auto-answer review contract", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ data: { caseId: "case-20", id: "match_case-20" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await reviewConfidenceSuggestion({
      caseId: "case-20",
      id: "match_case-20",
      analysisId: "analysis-20",
      analysisVersion: 20,
      reviewStage: "AUTO_ANSWER",
      solutionId: "solution-20",
      decision: "APPROVED",
      understandingResult: "CORRECT",
      solutionResult: "CORRECT",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestUrl, "http://localhost:4000/confidence/suggestions/match_case-20/review");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    caseId: "case-20",
    analysisId: "analysis-20",
    analysisVersion: 20,
    reviewStage: "AUTO_ANSWER",
    solutionId: "solution-20",
    decision: "APPROVED",
    understandingResult: "CORRECT",
    solutionResult: "CORRECT",
  });
});

test("preserves HTTP 409 for stale Confidence Review handling", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: "review_context_changed",
    message: "Analysis changed",
  }), { status: 409, headers: { "content-type": "application/json" } })) as typeof fetch;

  try {
    await assert.rejects(
      reviewConfidenceSuggestion({
        caseId: "case-stale",
        id: "match_case-stale",
        analysisId: "analysis-old",
        analysisVersion: 1,
        reviewStage: "QUALITY",
        understandingResult: "CORRECT",
      }),
      (error: unknown) => error instanceof OffMlProjectApiError && error.status === 409,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
