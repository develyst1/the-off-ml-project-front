import { Box, Group, Text, Title } from "@mantine/core";

interface CaseConversationHeaderProps {
  conversationCount: number;
  systemEventCount: number;
  totalCount: number;
  viewMode?: "CONVERSATION_ONLY" | "ALL_EVENTS";
}

export function CaseConversationHeader({ conversationCount, systemEventCount, totalCount, viewMode = "ALL_EVENTS" }: CaseConversationHeaderProps) {
  return (
    <Box className="caseConversationHeader">
      <Box>
        <Group align="baseline" gap="xs" wrap="wrap">
          <Title order={3}>ประวัติการสนทนาใน LINE</Title>
          <Text c="dimmed" size="sm">· {viewMode === "CONVERSATION_ONLY" ? `แสดงบทสนทนา ${conversationCount} รายการ` : `แสดงทั้งหมด ${totalCount} รายการ · บทสนทนา ${conversationCount} · ระบบ ${systemEventCount}`}</Text>
        </Group>
        <Text c="dimmed" mt={2} size="xs">แสดงบทสนทนาในเคส เรียงจากเก่าไปใหม่</Text>
      </Box>
    </Box>
  );
}
