"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Box, Button, Card, Divider, Group, ScrollArea, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { getInboxUser, getInboxUsers, openInboxCase, sendInboxReply } from "@/services/offMlProject.service";
import type { InboxUser } from "@/types/app/offMlProject";

function formatTime(value?: string) {
  if (!value) return "ยังไม่มีข้อความ";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function InboxWorkspace({ initialUserId }: { initialUserId?: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<InboxUser[]>([]);
  const [selected, setSelected] = useState<InboxUser | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async (customerId?: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const nextUsers = await getInboxUsers();
      setUsers(nextUsers);
      const selectedId = customerId ?? selected?.customer.id;
      const nextSelected = selectedId ? nextUsers.find((item) => item.customer.id === selectedId) : undefined;
      setSelected(nextSelected ?? nextUsers[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลด Inbox ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(initialUserId), 0);
    return () => window.clearTimeout(timer);
  }, [initialUserId, load]);

  const selectUser = async (user: InboxUser) => {
    setSelected(user);
    router.push(`/?tab=inbox&user=${encodeURIComponent(user.customer.id)}`);
    try {
      setSelected(await getInboxUser(user.customer.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดบทสนทนาไม่สำเร็จ");
    }
  };

  const handleSend = async () => {
    if (!selected || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      const updated = await sendInboxReply(selected.customer.id, draft.trim());
      setSelected(updated);
      setUsers((current) => current.map((item) => item.customer.id === updated.customer.id ? updated : item));
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenCase = async () => {
    if (!selected || isOpening) return;
    setIsOpening(true);
    try {
      const created = await openInboxCase(selected.customer.id);
      router.push(`/cases/${encodeURIComponent(created.id)}`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "เปิดเคสไม่สำเร็จ");
    } finally {
      setIsOpening(false);
    }
  };

  const filteredUsers = users.filter((user) => `${user.customer.displayName ?? "ไม่ทราบชื่อ"} ${user.latestMessage?.text ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Box><Title order={2}>ผู้ใช้งาน</Title><Text c="dimmed" size="sm">ผู้ใช้งานที่ติดต่อเข้ามาทาง LINE และยังไม่จำเป็นต้องเปิดเคส</Text></Box>
        <Button variant="light" onClick={() => void load(selected?.customer.id)}>รีเฟรช</Button>
      </Group>
      {error ? <Alert color="red" title="เกิดข้อผิดพลาด" withCloseButton onClose={() => setError(undefined)}>{error}</Alert> : null}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between" mb="md"><Title order={4}>รายการผู้ใช้งาน</Title><Badge color="blue" variant="light">{filteredUsers.length} รายการ</Badge></Group>
          <TextInput label="ค้นหา" placeholder="ชื่อผู้ใช้งานหรือข้อความล่าสุด" value={search} onChange={(event) => setSearch(event.currentTarget.value)} mb="sm" />
          <ScrollArea h={560} type="auto">
            <Stack gap="xs">
              {isLoading ? <Text c="dimmed">กำลังโหลดข้อมูล...</Text> : null}
              {!isLoading && filteredUsers.length === 0 ? <Text c="dimmed" py="xl" ta="center">ยังไม่มีผู้ใช้งานที่ติดต่อเข้ามา</Text> : null}
              {filteredUsers.map((user) => (
                <Button key={user.customer.id} variant={selected?.customer.id === user.customer.id ? "light" : "subtle"} color="blue" justify="space-between" h="auto" p="sm" onClick={() => void selectUser(user)} styles={{ inner: { justifyContent: "space-between" } }}>
                  <Box ta="left"><Text fw={600}>{user.customer.displayName ?? "ไม่ทราบชื่อ"}</Text><Text c="dimmed" lineClamp={1} size="xs">{user.latestMessage?.text ?? "ยังไม่มีข้อความ"}</Text></Box>
                  <Text c="dimmed" size="xs">{formatTime(user.latestMessage?.createdAt)}</Text>
                </Button>
              ))}
            </Stack>
          </ScrollArea>
        </Card>
        <Card withBorder radius="md" padding="md">
          {!selected ? <Text c="dimmed" ta="center" py="xl">เลือกผู้ใช้งานเพื่อดูบทสนทนา</Text> : (
            <Stack h="100%">
              <Group justify="space-between"><Box><Title order={4}>{selected.customer.displayName ?? "ไม่ทราบชื่อ"}</Title><Text c="dimmed" size="xs">สถานะ: ข้อความเข้า / รอพิจารณา</Text></Box><Button onClick={() => void handleOpenCase()} loading={isOpening}>เปิดเคส</Button></Group>
              <Divider />
              <ScrollArea h={390} type="auto"><Stack gap="sm">
                {selected.messages.map((message) => <Box key={message.id} style={{ alignSelf: message.senderType === "CUSTOMER" ? "flex-start" : "flex-end", maxWidth: "85%" }}><PaperMessage sender={message.senderType} text={message.text} at={message.createdAt} /></Box>)}
              </Stack></ScrollArea>
              <Group align="end"><TextInput flex={1} label="ข้อความตอบกลับทาง LINE" placeholder="พิมพ์ข้อความ" value={draft} onChange={(event) => setDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleSend(); } }} /><Button onClick={() => void handleSend()} loading={isSending} disabled={!draft.trim()}>ส่ง</Button></Group>
              <Divider />
              <Title order={5}>รายการเคส</Title>
              {selected.cases.length === 0 ? <Text c="dimmed" size="sm">ยังไม่มีรายการเคส</Text> : selected.cases.map((item) => <Button key={item.id} variant="light" justify="space-between" onClick={() => router.push(`/cases/${encodeURIComponent(item.id)}`)}>{item.caseNumber}<Badge color="gray">{item.status}</Badge></Button>)}
            </Stack>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function PaperMessage({ sender, text, at }: { sender: "CUSTOMER" | "TECH"; text: string; at: string }) {
  return <Box bg={sender === "CUSTOMER" ? "blue.0" : "gray.0"} p="sm" style={{ borderRadius: 10 }}><Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{text}</Text><Text c="dimmed" size="xs" mt={4}>{sender === "CUSTOMER" ? "ผู้ใช้งาน" : "ทีม Tech"} · {formatTime(at)}</Text></Box>;
}
