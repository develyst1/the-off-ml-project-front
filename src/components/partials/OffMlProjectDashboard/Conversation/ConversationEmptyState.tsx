import { Button, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { AppIcon } from "@/components/common";

interface ConversationEmptyStateProps {
  kind: "empty" | "conversation" | "retention" | "search" | "error";
  onRetry?: () => void;
}

export function ConversationEmptyState({ kind, onRetry }: ConversationEmptyStateProps) {
  const content = {
    empty: { title: "ยังไม่มีประวัติการสนทนาในเคสนี้", detail: "ข้อความใหม่ของเคสนี้จะแสดงที่นี่" },
    conversation: { title: "ยังไม่มีข้อความสนทนาในเคสนี้", detail: "เลือก “เหตุการณ์ทั้งหมด” เพื่อดูบันทึกการทำงานของระบบ" },
    retention: { title: "ประวัติข้อความดิบถูกลบตามนโยบายการเก็บข้อมูล 14 วัน", detail: "ข้อมูลสรุป สถานะ และวิธีแก้ของเคสยังคงแสดงตามปกติ" },
    search: { title: "ไม่พบข้อความที่ค้นหา", detail: "ลองเปลี่ยนคำค้นหา ตัวกรอง หรือช่วงเวลา" },
    error: { title: "ไม่สามารถแสดงประวัติการสนทนาได้", detail: "กรุณาลองโหลดข้อมูลอีกครั้ง" },
  }[kind];

  return (
    <Paper bg="gray.0" p="xl" radius="md" withBorder>
      <Stack align="center" gap="xs">
        <ThemeIcon color={kind === "error" ? "red" : "gray"} radius="xl" size="lg" variant="light"><AppIcon name={kind === "error" ? "alert" : "message"} /></ThemeIcon>
        <Text fw={700}>{content.title}</Text>
        <Text c="dimmed" size="sm">{content.detail}</Text>
        {kind === "error" && onRetry ? <Button onClick={onRetry} size="xs" variant="light">ลองใหม่</Button> : null}
      </Stack>
    </Paper>
  );
}
