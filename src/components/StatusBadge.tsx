import { Badge } from "@mantine/core";
import type { CaseStatus } from "@/lib/mock-data";

const STATUS_META: Record<CaseStatus, { label: string; color: string }> = {
  awaiting_tech: { label: "รอทีมตอบใน Teams", color: "yellow" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  resolved: { label: "ปิดเคสแล้ว", color: "green" },
  over_sla: { label: "เกิน SLA (4 ชม.)", color: "red" },
  needs_manual_review: { label: "ต้องตรวจสอบด้วยตนเอง", color: "gray" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge color={meta.color} variant="light" radius="sm">
      {meta.label}
    </Badge>
  );
}

export function ConfidenceBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <Badge color="gray" variant="light" radius="sm">
        —
      </Badge>
    );
  }
  const color = pct >= 90 ? "green" : pct >= 50 ? "yellow" : "red";
  return (
    <Badge color={color} variant="light" radius="sm">
      {pct}%
    </Badge>
  );
}
