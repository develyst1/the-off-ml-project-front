import assert from "node:assert/strict";
import test from "node:test";
import {
  getAutoAnswerSolutions,
  getConfidenceSuggestions,
  OffMlProjectApiError,
  mapCaseResponse,
  reviewConfidenceSuggestion,
  saveCaseAiFeedback,
  technicalTopicFromAnalysis,
} from "./offMlProject.service";
import type { OffMlProjectCaseResponse } from "@/types/app/offMlProject";

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

test("sends both Quality Review dimensions for a mixed formal result", async () => {
  const originalFetch = globalThis.fetch;
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestInit = init;
    return new Response(JSON.stringify({ data: { caseId: "case-mixed", id: "match_case-mixed" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await reviewConfidenceSuggestion({
      caseId: "case-mixed",
      id: "match_case-mixed",
      analysisId: "analysis-mixed",
      analysisVersion: 3,
      reviewStage: "QUALITY",
      solutionId: "solution-mixed",
      understandingResult: "CORRECT",
      solutionResult: "INCORRECT",
      reason: "Solution does not match the reviewed issue",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    caseId: "case-mixed",
    analysisId: "analysis-mixed",
    analysisVersion: 3,
    reviewStage: "QUALITY",
    solutionId: "solution-mixed",
    understandingResult: "CORRECT",
    solutionResult: "INCORRECT",
    reason: "Solution does not match the reviewed issue",
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

test("normalizes category labels returned by Confidence Review and Automation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const data = String(input).includes("/confidence/suggestions")
      ? [{ id: "suggestion-category", category: "SOFTWARE_APPLICATION", technicalTopic: "ชนิดไฟล์ไม่รองรับ" }]
      : [{ id: "solution-category", category: "UNMAPPED_FUTURE_CATEGORY" }];
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const suggestions = await getConfidenceSuggestions();
    const solutions = await getAutoAnswerSolutions();
    assert.equal(suggestions[0]?.category, "ปัญหาซอฟต์แวร์");
    assert.equal(suggestions[0]?.technicalTopic, "ชนิดไฟล์ไม่รองรับ");
    assert.equal(suggestions[0]?.caseDiscriminationConfidence, undefined);
    assert.equal(solutions[0]?.category, "อื่นๆ");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads only a presentable Thai technical topic from analysis JSON", () => {
  const baseAnalysis = {
    id: "analysis-row-topic",
    analysisId: "analysis-topic",
    caseId: "case-topic",
    analysisVersion: 1,
    analysisType: "customer_message" as const,
    confidence: 90,
    createdAt: "2026-08-14T08:00:00.000Z",
  };

  assert.equal(technicalTopicFromAnalysis({ ...baseAnalysis, rawJson: { technicalTopic: "รหัสผ่านหมดอายุ" } }), "รหัสผ่านหมดอายุ");
  assert.equal(technicalTopicFromAnalysis({ ...baseAnalysis, rawJson: { technicalTopic: "PASSWORD_EXPIRED" } }), undefined);
  assert.equal(technicalTopicFromAnalysis({ ...baseAnalysis, rawJson: {} }), undefined);
});

test("does not display a Tech solution extracted from a closing message", () => {
  const createdAt = "2026-08-14T08:00:00.000Z";
  const response: OffMlProjectCaseResponse = {
    id: "case-close-solution",
    caseNumber: "OFF-2026-00082",
    customerId: "customer-close-solution",
    status: "closed",
    createdAt,
    updatedAt: createdAt,
    customer: {
      id: "customer-close-solution",
      lineUserId: "U-close-solution",
      displayName: "ผู้ใช้งานทดสอบ",
      createdAt,
      updatedAt: createdAt,
    },
    messages: [
      {
        id: "customer-message",
        caseId: "case-close-solution",
        direction: "INBOUND",
        channel: "line",
        originalText: "เครื่องพิมพ์ Offline ไม่สามารถพิมพ์เอกสารได้",
        senderType: "CUSTOMER",
        messageType: "CUSTOMER_MESSAGE",
        createdAt,
      },
      {
        id: "close-message",
        caseId: "case-close-solution",
        direction: "INTERNAL",
        channel: "system",
        originalText: "ปิดเคส OFF-2026-00082",
        senderType: "SYSTEM",
        messageType: "CASE_CLOSED",
        createdAt: "2026-08-14T08:05:00.000Z",
      },
    ],
    analyses: [
      {
        id: "customer-analysis-row",
        analysisId: "customer-analysis",
        caseId: "case-close-solution",
        messageId: "customer-message",
        analysisVersion: 1,
        analysisType: "customer_message",
        summary: "เครื่องพิมพ์ Offline",
        confidence: 85,
        rawJson: { extractedSolution: "ตรวจสอบไฟและการเชื่อมต่อของเครื่องพิมพ์" },
        createdAt,
      },
      {
        id: "closing-analysis-row",
        analysisId: "closing-analysis",
        caseId: "case-close-solution",
        messageId: "close-message",
        analysisVersion: 2,
        analysisType: "tech_solution",
        summary: "ผู้ตรวจปริ้นท์จากเคส OFF-2026-00082 และปิดเคส",
        confidence: 90,
        rawJson: {},
        createdAt: "2026-08-14T08:05:00.000Z",
      },
    ],
    solutions: [],
  };

  assert.equal(mapCaseResponse(response).supportSolution, "ตรวจสอบไฟและการเชื่อมต่อของเครื่องพิมพ์");
});
