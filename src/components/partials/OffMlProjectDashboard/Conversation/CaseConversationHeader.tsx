import { Box, Text, Title } from "@mantine/core";

export function CaseConversationHeader() {
  return (
    <Box>
      <Title order={3}>3) ประวัติการสนทนาในเคส</Title>
      <Text c="dimmed" mt={4} size="sm">
        แสดงผลการสนทนาทั้งหมดภายในเคส เรียงจากเก่าไปใหม่
      </Text>
    </Box>
  );
}

