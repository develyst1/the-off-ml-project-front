import type {
  AutoAnswerLog,
  AutoAnswerSolution,
  ConfidenceSuggestion,
  SupportCase,
} from "@/types/app/offMai";

export const OFF_MAI_TABS = [
  { value: "inbox", label: "Case Inbox" },
  { value: "detail", label: "Case Detail" },
  { value: "confidence", label: "Confidence Review" },
  { value: "analytics", label: "Analytics" },
  { value: "automation", label: "Automation" },
] as const;

export const supportCases: SupportCase[] = [
  {
    id: "CASE-2049",
    customerName: "คุณสมชาย ใจดี",
    lineUserId: "U8a21f...",
    originalText: "เข้าระบบไม่ได้ ขึ้น error 500 ตลอดครับ ลองมา 3 รอบแล้ว",
    category: "Login/Access",
    aiConfidence: 62,
    status: "awaiting_tech",
    createdAt: "03/07/2026 09:14",
    slaHours: 4,
    summary:
      "ผู้ใช้ไม่สามารถเข้าสู่ระบบได้ พบ HTTP 500 ซ้ำหลายครั้ง อาจเกี่ยวกับ session/token หรือ auth service",
    teamsThread: [
      "ระบบแจ้งลูกค้า + ข้อความต้นฉบับ + ผลวิเคราะห์โดย AI ไปยัง Teams แล้ว",
      "รอทีม Tech Support วิเคราะห์และตอบกลับ",
    ],
  },
  {
    id: "CASE-2050",
    customerName: "คุณวรรณา พลอยงาม",
    lineUserId: "U771b...",
    originalText: "ยอดเงินในรายงานไม่ตรงกับหน้าแดชบอร์ดค่ะ",
    category: "Data Mismatch",
    aiConfidence: 96,
    status: "awaiting_confirmation",
    createdAt: "03/07/2026 09:33",
    slaHours: 4,
    summary:
      "ข้อมูลรายงานและแดชบอร์ดไม่ตรงกัน มีแนวโน้มตรงกับปัญหา cache รายงานเดิม",
    teamsThread: [
      "AI แนะนำ solution SOL-221 ให้ทีมยืนยัน",
      "คำถามใน Teams: ใช่เคสที่ต้องแก้ด้วยการ Sync Data แล้วรอ 1-2 นาทีหรือไม่",
    ],
    supportSolution: "กด Sync Data แล้วรอ 1-2 นาที จากนั้นรีเฟรชแดชบอร์ด",
  },
  {
    id: "CASE-2051",
    customerName: "คุณธนกร ศรีสุข",
    lineUserId: "U928c...",
    originalText: "ขอวิธี export รายงานเป็น Excel หน่อยครับ",
    category: "How-to",
    aiConfidence: 100,
    status: "resolved",
    createdAt: "03/07/2026 10:02",
    slaHours: 4,
    summary: "คำถามวิธีใช้งานทั่วไป ตรงกับ solution export Excel เดิม",
    teamsThread: ["ระบบตอบอัตโนมัติและแจ้ง log เข้า Teams แล้ว"],
    supportSolution: "ไปที่เมนู Report > Export > Excel",
    customerReply:
      "สามารถ export ได้ที่เมนู Report > Export > Excel แล้วเลือกรายงานที่ต้องการครับ",
  },
  {
    id: "CASE-2052",
    customerName: "คุณอรุณ แสงทอง",
    lineUserId: "U53ad...",
    originalText: "ระบบพิมพ์ใบเสร็จช้ามาก 5 นาทีก็ยังไม่ออก",
    category: "Performance",
    aiConfidence: 28,
    status: "sla_breach",
    createdAt: "03/07/2026 08:10",
    slaHours: 4,
    summary: "ยังไม่มี solution ที่มั่นใจ ต้องให้ทีมตรวจสอบ performance queue",
    teamsThread: ["แจ้งทีมแล้วและเกิน SLA ต้องเร่งติดตาม"],
  },
];

export const confidenceSuggestions: ConfidenceSuggestion[] = [
  {
    id: "MATCH-881",
    caseId: "CASE-2050",
    customerName: "คุณวรรณา พลอยงาม",
    suggestedSolutionId: "SOL-221",
    category: "Data Mismatch",
    originalText: "ยอดเงินในรายงานไม่ตรงกับหน้าแดชบอร์ดค่ะ",
    solutionText: "กด Sync Data แล้วรอ 1-2 นาที จากนั้นรีเฟรชแดชบอร์ด",
    caseUnderstandingConfidence: 96,
    caseDiscriminationConfidence: 92,
  },
  {
    id: "MATCH-882",
    caseId: "CASE-2051",
    customerName: "คุณธนกร ศรีสุข",
    suggestedSolutionId: "SOL-104",
    category: "How-to",
    originalText: "ขอวิธี export รายงานเป็น Excel หน่อยครับ",
    solutionText: "ไปที่เมนู Report > Export > Excel",
    caseUnderstandingConfidence: 100,
    caseDiscriminationConfidence: 100,
  },
];

export const autoAnswerSolutions: AutoAnswerSolution[] = [
  {
    id: "SOL-104",
    category: "How-to · Export รายงาน Excel",
    solutionText: "ไปที่เมนู Report > Export > Excel",
    caseUnderstandingConfidence: 99,
    caseDiscriminationConfidence: 99,
    status: "ready",
  },
  {
    id: "SOL-221",
    category: "Data Mismatch · Cache รายงาน",
    solutionText: "กด Sync Data แล้วรอ 1-2 นาที",
    caseUnderstandingConfidence: 98,
    caseDiscriminationConfidence: 98,
    status: "ready",
  },
];

export const autoAnswerLogs: AutoAnswerLog[] = [
  {
    id: "LOG-1001",
    time: "10:42",
    customer: "LINE: U928...",
    answerText: "แนะนำเมนู Report > Export > Excel",
    solutionId: "SOL-104",
    teamsNotified: true,
  },
  {
    id: "LOG-1002",
    time: "10:51",
    customer: "LINE: U771...",
    answerText: "ให้กด Sync Data แล้วรอ 1-2 นาที",
    solutionId: "SOL-221",
    teamsNotified: true,
  },
];
