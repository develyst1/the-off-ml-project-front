import { Anchor, Box, Button, Center, Paper, Stack, Text, Title } from "@mantine/core";
import { IconDeviceDesktop } from "@tabler/icons-react";
import { signIn } from "@/lib/actions";

export default function LoginPage() {
  return (
    <Center mih="100vh" bg="gray.0">
      <Paper withBorder shadow="sm" radius="lg" p="xl" w={380}>
        <Stack align="center" gap="xs">
          <Box
            w={52}
            h={52}
            bg="blue.6"
            c="white"
            style={{
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconDeviceDesktop size={26} stroke={1.75} />
          </Box>
          <Title order={3} mt="xs">
            Off-ML Assistant
          </Title>
          <Text size="xs" c="dimmed" mb="md">
            AI Tech Support Copilot
          </Text>

          <form action={signIn.bind(null, "tech_support")} style={{ width: "100%" }}>
            <Button type="submit" fullWidth leftSection={<MicrosoftMark />}>
              Sign in with Microsoft
            </Button>
          </form>

          <Text size="xs" c="dimmed" ta="center" mt="sm">
            ใช้บัญชี MS Teams / Entra ID เดียวกับที่ทีม Tech Support ใช้อยู่แล้ว — ระบบผูก session
            กับ <code>ms_teams_user_id</code> ที่มีอยู่ในฐานข้อมูล
          </Text>

          <Box ta="center" mt="md">
            <Text size="xs" c="dimmed" span>
              Dev only — no Azure AD app registration wired up yet (API-016):{" "}
            </Text>
            <form action={signIn.bind(null, "admin")} style={{ display: "inline" }}>
              <Anchor component="button" type="submit" size="xs">
                sign in as admin
              </Anchor>
            </form>
          </Box>
        </Stack>
      </Paper>
    </Center>
  );
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
