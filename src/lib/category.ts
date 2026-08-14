const CATEGORY_META: Record<string, { key: string; label: string }> = {
  NETWORK_CONNECTION: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  NETWORK_ISSUE: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  NETWORK_CONNECTIVITY: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  CONNECTIVITY_ISSUE: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  "ปัญหาการเชื่อมต่อเครือข่าย": { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  "ปัญหาการเชื่อมต่อเครือข่ายอินเทอร์เน็ต": { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  LOGIN_ACCESS: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  LOGIN_ISSUE: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  LOGIN_FAILURE: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  PASSWORD_RESET: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  PASSWORD_RESET_FAILURE: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  "เข้าสู่ระบบไม่ได้": { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  "ปัญหาการเข้าสู่ระบบ": { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  STATUS_UPDATE: { key: "STATUS_UPDATE", label: "ปัญหาการอัปเดตสถานะ" },
  "ปัญหาการอัปเดตสถานะ": { key: "STATUS_UPDATE", label: "ปัญหาการอัปเดตสถานะ" },
  HARDWARE_DEVICE: { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  BLUE_SCREEN: { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  "ภาพแสดงสีฟ้า (BLUE SCREEN)": { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  "ปัญหาฮาร์ดแวร์": { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  SOFTWARE_APPLICATION: { key: "SOFTWARE_APPLICATION", label: "ปัญหาซอฟต์แวร์" },
  "ปัญหาซอฟต์แวร์": { key: "SOFTWARE_APPLICATION", label: "ปัญหาซอฟต์แวร์" },
  DATA_DISPLAY: { key: "DATA_DISPLAY", label: "ปัญหาการแสดงข้อมูล" },
  "ปัญหาการแสดงข้อมูล": { key: "DATA_DISPLAY", label: "ปัญหาการแสดงข้อมูล" },
  OTHER: { key: "OTHER", label: "อื่นๆ" },
  UNCATEGORIZED: { key: "OTHER", label: "อื่นๆ" },
  PAYMENT_ISSUE: { key: "OTHER", label: "อื่นๆ" },
  RESOLVED: { key: "OTHER", label: "อื่นๆ" },
};

export function categoryMetaInThai(category?: string | null) {
  const value = category?.trim();
  if (!value || value === "-" || ["undefined", "null", "uncategorized"].includes(value.toLowerCase())) {
    return CATEGORY_META.OTHER;
  }

  const known = CATEGORY_META[value.toUpperCase()] ?? CATEGORY_META[value];
  if (known) return known;

  return {
    key: value.startsWith("AI_") ? value : `AI_${encodeURIComponent(value)}`,
    label: "อื่นๆ",
  };
}

export function categoryLabelInThai(category?: string | null) {
  return categoryMetaInThai(category).label;
}
