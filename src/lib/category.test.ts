import { describe, expect, test } from "bun:test";
import { categoryLabelInThai, categoryMetaInThai } from "./category";

describe("Thai category presentation", () => {
  test("maps canonical and legacy internal values to Thai", () => {
    expect(categoryLabelInThai("SOFTWARE_APPLICATION")).toBe("ปัญหาซอฟต์แวร์");
    expect(categoryLabelInThai("NETWORK_CONNECTIVITY")).toBe("ปัญหาการเชื่อมต่อเครือข่าย");
    expect(categoryLabelInThai("PASSWORD_RESET")).toBe("ปัญหาการเข้าสู่ระบบ");
    expect(categoryLabelInThai("BLUE_SCREEN")).toBe("ปัญหาฮาร์ดแวร์");
  });

  test("never exposes unknown raw values as labels", () => {
    expect(categoryMetaInThai("UNMAPPED_FUTURE_CATEGORY")).toEqual({
      key: "AI_UNMAPPED_FUTURE_CATEGORY",
      label: "อื่นๆ",
    });
    expect(categoryLabelInThai("AI_UNMAPPED_FUTURE_CATEGORY")).toBe("อื่นๆ");
    expect(categoryLabelInThai(undefined)).toBe("อื่นๆ");
  });
});
