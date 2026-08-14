import assert from "node:assert/strict";
import test from "node:test";
import { categoryLabelInThai, categoryMetaInThai } from "./category";

test("maps canonical and legacy internal values to Thai", () => {
  assert.equal(categoryLabelInThai("SOFTWARE_APPLICATION"), "ปัญหาซอฟต์แวร์");
  assert.equal(categoryLabelInThai("NETWORK_CONNECTIVITY"), "ปัญหาการเชื่อมต่อเครือข่าย");
  assert.equal(categoryLabelInThai("PASSWORD_RESET"), "ปัญหาการเข้าสู่ระบบ");
  assert.equal(categoryLabelInThai("BLUE_SCREEN"), "ปัญหาฮาร์ดแวร์");
});

test("never exposes unknown raw values as labels", () => {
  assert.deepEqual(categoryMetaInThai("UNMAPPED_FUTURE_CATEGORY"), {
    key: "AI_UNMAPPED_FUTURE_CATEGORY",
    label: "อื่นๆ",
  });
  assert.equal(categoryLabelInThai("AI_UNMAPPED_FUTURE_CATEGORY"), "อื่นๆ");
  assert.equal(categoryLabelInThai(undefined), "อื่นๆ");
});
