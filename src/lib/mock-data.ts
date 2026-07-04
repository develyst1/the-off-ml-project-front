// Mock data mirroring the approved requirement-hub mockups
// (the-off-ml-project-requirement/make-front/SCR-00*.html) so this app's
// first pass stays consistent with the spec until API-0xx endpoints exist.

export type CaseStatus =
  | "awaiting_tech"
  | "awaiting_confirmation"
  | "resolved"
  | "over_sla"
  | "needs_manual_review";

export type CaseSummary = {
  id: string;
  customerName: string;
  originalText: string;
  category: string | null;
  confidencePct: number | null;
  status: CaseStatus;
};

export const CASES: CaseSummary[] = [
  {
    id: "CASE-2049",
    customerName: "คุณสมชาย ใจดี",
    originalText: "เข้าระบบไม่ได้ ขึ้น error 500 ตลอดครับ",
    category: "Login/Access",
    confidencePct: 62,
    status: "awaiting_tech",
  },
  {
    id: "CASE-2051",
    customerName: "คุณวรรณา พลอยงาม",
    originalText: "ยอดเงินในรายงานไม่ตรงกับหน้าแดชบอร์ดค่ะ",
    category: "Data Mismatch",
    confidencePct: 96,
    status: "awaiting_confirmation",
  },
  {
    id: "CASE-1998",
    customerName: "คุณธนกร ศรีสุข",
    originalText: "ขอวิธี export รายงานเป็น Excel หน่อยครับ",
    category: "How-to",
    confidencePct: 100,
    status: "resolved",
  },
  {
    id: "CASE-2033",
    customerName: "คุณอรุณ แสงทอง",
    originalText: "ระบบพิมพ์ใบเสร็จช้ามาก 5 นาทีก็ยังไม่ออก",
    category: "Performance",
    confidencePct: 28,
    status: "over_sla",
  },
  {
    id: "CASE-2062",
    customerName: "คุณปิยะดา รุ่งเรือง",
    originalText: "เข้าเว็บไม่ได้เลยค่ะ ช่วยด่วน",
    category: null,
    confidencePct: null,
    status: "needs_manual_review",
  },
];

export const INBOX_KPIS = {
  awaitingTech: 7,
  awaitingConfirmation: 3,
  resolvedThisMonth: 128,
  overSla: 1,
  needsManualReview: 1,
};

export type CaseHistoryEntry = {
  id: string;
  date: string;
  category: string;
  solution: string;
  status: "resolved";
};

export type CaseDetail = {
  id: string;
  customerName: string;
  lineUserId: string;
  receivedAt: string;
  status: CaseStatus;
  originalText: string;
  analysis: {
    category: string;
    confidencePct: number;
    summary: string;
  };
  techReply: {
    raw: string;
    aiRewritten: string;
  } | null;
  history: CaseHistoryEntry[];
};

export const CASE_DETAILS: Record<string, CaseDetail> = {
  "CASE-2049": {
    id: "CASE-2049",
    customerName: "คุณสมชาย ใจดี",
    lineUserId: "U8a21f…",
    receivedAt: "03/07/2026 09:14",
    status: "awaiting_tech",
    originalText: "เข้าระบบไม่ได้ ขึ้น error 500 ตลอดครับ ลองมา 3 รอบแล้ว",
    analysis: {
      category: "Login/Access · HTTP 500",
      confidencePct: 62,
      summary:
        "สรุป: ผู้ใช้ไม่สามารถเข้าสู่ระบบได้ พบ HTTP 500 ซ้ำหลายครั้ง อาจเกี่ยวกับ session/token หมดอายุ หรือ backend error ฝั่ง auth service — ยังไม่พบเคสเดิมที่ตรงกันแบบมั่นใจสูง",
    },
    techReply: {
      raw: "บอกลูกค้าไปว่าเดี๋ยวเราไป restart auth service ให้ ลองใหม่อีกทีนะ",
      aiRewritten:
        "สวัสดีค่ะคุณสมชาย ทีมงานตรวจสอบพบว่าปัญหาเกิดจากระบบยืนยันตัวตนขัดข้องชั่วคราว ทางทีมได้ทำการแก้ไขเรียบร้อยแล้ว รบกวนลองเข้าสู่ระบบอีกครั้งได้เลยค่ะ หากยังพบปัญหา แจ้งกลับมาได้ทันทีนะคะ",
    },
    history: [
      {
        id: "CASE-1904",
        date: "18/05/2026",
        category: "Login/Access",
        solution: "รีเซ็ตรหัสผ่านผ่านลิงก์ในอีเมล",
        status: "resolved",
      },
      {
        id: "CASE-1622",
        date: "02/03/2026",
        category: "How-to",
        solution: "สอนวิธี export รายงานเป็น PDF",
        status: "resolved",
      },
    ],
  },
  "CASE-2051": {
    id: "CASE-2051",
    customerName: "คุณวรรณา พลอยงาม",
    lineUserId: "U3f9c2…",
    receivedAt: "04/07/2026 10:02",
    status: "awaiting_confirmation",
    originalText: "ยอดเงินในรายงานไม่ตรงกับหน้าแดชบอร์ดค่ะ",
    analysis: {
      category: "Data Mismatch",
      confidencePct: 96,
      summary:
        "สรุป: ยอดเงินในรายงานกับแดชบอร์ดไม่ตรงกัน ระบบพบว่าเคสนี้คล้ายกับ CASE-1832 สูงถึง 96% (สาเหตุจาก cache รายงานที่ยังไม่ refresh) — รอ Tech Support ยืนยันที่หน้ายืนยันคำแนะนำ AI",
    },
    techReply: null,
    history: [],
  },
  "CASE-1998": {
    id: "CASE-1998",
    customerName: "คุณธนกร ศรีสุข",
    lineUserId: "U71ad8…",
    receivedAt: "01/07/2026 14:30",
    status: "resolved",
    originalText: "ขอวิธี export รายงานเป็น Excel หน่อยครับ",
    analysis: {
      category: "How-to",
      confidencePct: 100,
      summary: "สรุป: ลูกค้าต้องการทราบขั้นตอนการ export รายงานเป็นไฟล์ Excel",
    },
    techReply: {
      raw: "ไปที่เมนู Report > Export > Excel",
      aiRewritten:
        "สวัสดีค่ะคุณธนกร วิธี export รายงานเป็น Excel ทำได้โดยไปที่เมนู Report แล้วเลือก Export > Excel ได้เลยค่ะ",
    },
    history: [],
  },
  "CASE-2033": {
    id: "CASE-2033",
    customerName: "คุณอรุณ แสงทอง",
    lineUserId: "U905be…",
    receivedAt: "04/07/2026 08:15",
    status: "over_sla",
    originalText: "ระบบพิมพ์ใบเสร็จช้ามาก 5 นาทีก็ยังไม่ออก",
    analysis: {
      category: "Performance",
      confidencePct: 28,
      summary:
        "สรุป: ลูกค้าแจ้งปัญหาการพิมพ์ใบเสร็จช้า ความมั่นใจต่ำ (28%) เนื่องจากยังไม่มีเคสเดิมที่ใกล้เคียง — เกินกำหนด SLA 4 ชั่วโมงแล้ว ต้องเร่งตรวจสอบ",
    },
    techReply: null,
    history: [],
  },
  "CASE-2062": {
    id: "CASE-2062",
    customerName: "คุณปิยะดา รุ่งเรือง",
    lineUserId: "Uc281a…",
    receivedAt: "04/07/2026 11:47",
    status: "needs_manual_review",
    originalText: "เข้าเว็บไม่ได้เลยค่ะ ช่วยด่วน",
    analysis: {
      category: "— (AI วิเคราะห์ไม่สำเร็จ)",
      confidencePct: 0,
      summary:
        "AI CENTER ล้มเหลวทุก provider (deepseek→xai→gemini→openai) สำหรับเคสนี้ (UC-017) — ระบบยังคงบันทึกเคสและแจ้งทีมใน MS Teams ทันที แทนที่จะปล่อยให้ค้างเงียบไม่มีใครเห็น ทีมต้องอ่านข้อความต้นฉบับและจัดหมวดหมู่ด้วยตนเอง",
    },
    techReply: null,
    history: [],
  },
};

export type ConfidenceQueueItem = {
  caseId: string;
  customerName: string;
  category: string;
  confidencePct: number;
  customerMessage: string;
  matchedSolutionCaseId: string;
  matchedSolutionText: string;
};

export const CONFIDENCE_QUEUE: ConfidenceQueueItem[] = [
  {
    caseId: "CASE-2051",
    customerName: "คุณวรรณา พลอยงาม",
    category: "Data Mismatch",
    confidencePct: 96,
    customerMessage: "ยอดเงินในรายงานไม่ตรงกับหน้าแดชบอร์ดค่ะ",
    matchedSolutionCaseId: "CASE-1832",
    matchedSolutionText: "เกิดจาก cache รายงานยังไม่ refresh ให้กด Sync Data มุมขวาบนแล้วรอ 1-2 นาที",
  },
  {
    caseId: "CASE-2058",
    customerName: "คุณประวิทย์ ทองแท้",
    category: "Login/Access",
    confidencePct: 93,
    customerMessage: "ล็อกอินไม่เข้าเลยครับ ขึ้น session expired ตลอด",
    matchedSolutionCaseId: "CASE-1745",
    matchedSolutionText: "ให้ล้าง cache/cookie ของเบราว์เซอร์แล้วลอง login ใหม่อีกครั้ง",
  },
  {
    caseId: "CASE-2060",
    customerName: "คุณธิดารัตน์ แก้วมณี",
    category: "Performance",
    confidencePct: 91,
    customerMessage: "หน้าเว็บโหลดช้ามากตอนเช้า",
    matchedSolutionCaseId: "CASE-1690",
    matchedSolutionText: "ช่วงเช้าโหลดสูง ให้ลอง refresh อีกครั้งหลัง 9:30 หรือใช้ช่วงเวลาอื่น",
  },
];

export const ANALYTICS_SUMMARY = {
  totalCasesThisMonth: 452,
  resolvedFromExistingSolutionPct: 61,
  avgResponseMinutes: 18,
  solutionsReadyForApprove: 2,
  categories: [
    { name: "Login/Access", count: 142, pct: 78, color: "blue" },
    { name: "Data Mismatch", count: 98, pct: 54, color: "blue" },
    { name: "Performance", count: 71, pct: 40, color: "red" },
    { name: "How-to", count: 61, pct: 33, color: "green" },
  ],
  confidenceDistribution: [
    { range: "90–100%", count: 34, handling: "ถามยืนยันทีมก่อน (UC-011)", color: "green" },
    { range: "50–89%", count: 210, handling: "ส่งทีมวิเคราะห์ตามปกติ", color: "yellow" },
    { range: "<50%", count: 208, handling: "ยังไม่มีข้อมูลใกล้เคียง", color: "gray" },
  ],
};

export type AutomationCandidate = {
  category: string;
  confirmedCount: string;
  mismatchCount: number;
  solution: string;
};

export const AUTOMATION_CANDIDATES: AutomationCandidate[] = [
  {
    category: "How-to · Export รายงาน Excel",
    confirmedCount: "12/12 ครั้ง",
    mismatchCount: 0,
    solution: "ไปที่เมนู Report > Export > Excel",
  },
  {
    category: "Data Mismatch · Cache รายงาน",
    confirmedCount: "9/9 ครั้ง",
    mismatchCount: 0,
    solution: "กด Sync Data แล้วรอ 1-2 นาที",
  },
];
