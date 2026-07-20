import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
import { formatConversationDateTime } from "./conversation.config";
import type { CaseStatus } from "@/types/app/offMlProject";

interface CaseConversationHeaderProps {
  latestCustomerAt?: string;
  status: CaseStatus;
}

const statusLabels: Partial<Record<CaseStatus, string>> = {
  awaiting_customer_info: "รอลูกค้าให้ข้อมูล",
  awaiting_tech: "รอทีม Tech ตอบ",
  assigned: "รอทีม Tech ตอบ",
  tech_replied: "กำลังตรวจสอบ",
  analyzing: "กำลังตรวจสอบ",
  analyzing_solution: "กำลังตรวจสอบ",
  resolved: "มีคำตอบรอส่ง",
  sent_to_customer: "ส่งคำตอบให้ลูกค้าแล้ว",
  closed: "ปิดเคสแล้ว",
  reopened: "รอทีม Tech ตอบ",
};

export function CaseConversationHeader({ latestCustomerAt, status }: CaseConversationHeaderProps) {
  const latest = formatConversationDateTime(latestCustomerAt);
  return (
    <Box className="caseConversationHeader">
      <Group align="center" justify="space-between" gap="md" wrap="nowrap">
        <Box>
          <Title order={3}>3) ประวัติการสนทนาในเคส</Title>
          <Text c="dimmed" mt={2} size="xs">แสดงผลการสนทนาทั้งหมดภายในเคส เรียงจากเก่าไปใหม่</Text>
        </Box>
        <Stack align="flex-end" gap={2} className="caseConversationCurrentStatus">
          <Text c="dimmed" size="xs">สถานะปัจจุบัน</Text>
          <Badge color="blue" variant="light">{statusLabels[status] ?? "กำลังตรวจสอบ"}</Badge>
          <Text c="dimmed" size="xs">ข้อความล่าสุดจากลูกค้า: {latestCustomerAt ? `${latest.time} น.` : "-"}</Text>
        </Stack>
      </Group>
    </Box>
  );
}
