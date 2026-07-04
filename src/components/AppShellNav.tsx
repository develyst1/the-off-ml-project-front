"use client";

import {
  AppShell,
  Avatar,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconCircleCheck,
  IconDeviceDesktop,
  IconInbox,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import type { Session } from "@/lib/session";

type NavItem = {
  href: string;
  label: string;
  icon: typeof IconInbox;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/cases", label: "กล่องข้อความเคส", icon: IconInbox },
  { href: "/confidence-review", label: "ยืนยันคำแนะนำ AI", icon: IconCircleCheck },
  { href: "/analytics", label: "ภาพรวม/สถิติ", icon: IconChartBar, adminOnly: true },
  {
    href: "/settings/automation",
    label: "ตั้งค่าอัตโนมัติ",
    icon: IconSettings,
    adminOnly: true,
  },
];

export function AppShellNav({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || session.role === "admin");
  const initials = session.role === "admin" ? "AD" : "TS";

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              {session.displayName}
            </Text>
            <Avatar radius="xl" color="blue" size="sm">
              {initials}
            </Avatar>
            <form action={signOutAction}>
              <NavLink
                component="button"
                type="submit"
                label="ออกจากระบบ"
                leftSection={<IconLogout size={16} stroke={1.75} />}
                variant="subtle"
                style={{ borderRadius: 8 }}
              />
            </form>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Group gap="sm" mb="lg">
          <Avatar radius="md" color="blue">
            <IconDeviceDesktop size={20} stroke={1.75} />
          </Avatar>
          <Stack gap={0}>
            <Text fw={700} size="sm">
              Off-ML Assistant
            </Text>
            <Text size="xs" c="dimmed">
              AI Tech Support Copilot
            </Text>
          </Stack>
        </Group>

        <Stack gap={4}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/cases" && pathname.startsWith(item.href));
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                active={active}
                leftSection={<Icon size={18} stroke={1.75} />}
                style={{ borderRadius: 12 }}
              />
            );
          })}
        </Stack>

        <Text size="xs" c="dimmed" mt="auto" pt="md">
          v1.0 · Off-ML Tech Support
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
