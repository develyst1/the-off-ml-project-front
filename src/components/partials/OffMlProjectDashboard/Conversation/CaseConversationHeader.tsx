import { Box, Group, Text, Title } from "@mantine/core";

interface CaseConversationHeaderProps {
  totalCount: number;
}

export function CaseConversationHeader({ totalCount }: CaseConversationHeaderProps) {
  return (
    <Box className="caseConversationHeader">
      <Box>
        <Group align="baseline" gap="xs" wrap="wrap">
          <Title order={3}>3) ประวัติการสนทนาในเคส</Title>
          <Text c="dimmed" size="sm">· {totalCount} รายการ</Text>
        </Group>
        <Text c="dimmed" mt={2} size="xs">แสดงผลการสนทนาทั้งหมดภายในเคส เรียงจากเก่าไปใหม่</Text>
      </Box>
    </Box>
  );
}
