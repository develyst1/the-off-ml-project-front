import { Alert, Badge, Button, Group, Paper, SimpleGrid, Stack, Switch, Table, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AUTOMATION_CANDIDATES } from "@/lib/mock-data";

export default function AutomationSettingsPage() {
  return (
    <Stack gap="lg" maw={1000}>
      <Title order={2}>ตั้งค่าอัตโนมัติ (Automation Settings)</Title>

      <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
        หน้านี้ยังเป็น <b>Planned</b> — ระบบต้องได้รับ <b>Approve จาก Tech Support เป็นรายหมวดหมู่</b>{" "}
        ก่อนเปิดใช้งานจริง (ไม่ใช่การขอมติ/โหวตจากทั้งทีม) โดยอ้างอิงจาก requirement ต้นฉบับ (DOC-001):
        &quot;เป็นสิ่งที่ต้องคุยกับทีมต่อว่าจะให้ต่อ API / automate / auto answer line ในอนาคต&quot;
      </Alert>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="md">
          เกณฑ์ความมั่นใจสำหรับแต่ละระดับ
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              เกณฑ์ถามยืนยันทีม (UC-011)
            </Text>
            <Paper bg="gray.0" p="sm" radius="sm">
              90% – 100%
            </Paper>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              เกณฑ์ขอ Approve เปิด auto-answer (UC-014)
            </Text>
            <Paper bg="gray.0" p="sm" radius="sm">
              = 100% ต่อเนื่อง (ไม่มี &quot;ไม่ใช่&quot; ค้างอยู่)
            </Paper>
          </div>
        </SimpleGrid>
        <Group mt="md">
          <Switch disabled defaultChecked={false} />
          <div>
            <Text fw={700} size="sm">
              เปิดใช้ auto-answer อัตโนมัติ
            </Text>
            <Text size="xs" c="dimmed">
              ปิดอยู่ — รอ Tech Support กด Approve เป็นรายหมวดหมู่ก่อน
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="sm">
          เคสที่ความมั่นใจถึง 100% แล้ว รอ Tech Support Approve
        </Text>
        <Table verticalSpacing="sm">
          <thead>
            <tr>
              <th>หมวดหมู่เคส</th>
              <th>ยืนยัน &quot;ใช่&quot; ต่อเนื่อง</th>
              <th>&quot;ไม่ใช่&quot; ที่พบระหว่างทาง</th>
              <th>วิธีแก้</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {AUTOMATION_CANDIDATES.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.confirmedCount}</td>
                <td>{row.mismatchCount} ครั้ง</td>
                <td>&ldquo;{row.solution}&rdquo;</td>
                <td>
                  <Badge variant="light" color="green">
                    พร้อมขอ Approve
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Group justify="flex-end" mt="md">
          <Button disabled variant="default">
            รอ Tech Support Approve — ยังไม่เปิดใช้งาน
          </Button>
        </Group>
      </Paper>

      <Alert variant="light" color="red" title="กติกาหน้าจอนี้ (UC-014)">
        ห้ามเปิด auto-answer ให้ระบบตอบลูกค้าเองโดยอัตโนมัติจนกว่า <b>Tech Support จะกด Approve เป็นรายหมวดหมู่</b> —
        หน้านี้ใช้เก็บรายการที่ &quot;พร้อม&quot; (มั่นใจ 100% ต่อเนื่องและไม่มี &quot;ไม่ใช่&quot; ค้างอยู่) เพื่อขอ approve จาก
        Tech Support เท่านั้น ไม่ใช่สวิตช์เปิดใช้งานจริงในเฟสนี้
      </Alert>
    </Stack>
  );
}
