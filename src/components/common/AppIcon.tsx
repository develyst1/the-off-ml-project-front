import type { ReactNode } from "react";

export type IconName =
  | "inbox"
  | "check"
  | "chart"
  | "settings"
  | "alert"
  | "stop"
  | "message"
  | "copy"
  | "brain"
  | "sparkles"
  | "info"
  | "thumb-up"
  | "thumb-down"
  | "menu";

interface AppIconProps {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactNode> = {
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5 4h14l3 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-8z" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" />
      <rect x="12" y="8" width="3" height="9" />
      <rect x="17" y="5" width="3" height="12" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  stop: (
    <>
      <circle cx="12" cy="12" r="10" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
  message: (
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  ),
  copy: (
    <>
      <rect height="11" rx="2" width="11" x="9" y="9" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </>
  ),
  brain: (
    <>
      <path d="M9 3a4 4 0 0 0-4 4 4 4 0 0 0 0 8 4 4 0 0 0 4 4" />
      <path d="M15 3a4 4 0 0 1 4 4 4 4 0 0 1 0 8 4 4 0 0 1-4 4" />
      <path d="M9 3v16M15 3v16M9 8h6M9 13h6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2L12 3Z" />
      <path d="m19 15-.6 2.4L16 18l2.4.6L19 21l.6-2.4L22 18l-2.4-.6L19 15Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </>
  ),
  "thumb-up": (
    <path d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 10h9.2a2 2 0 0 0 1.9-1.4l2.1-6.5A1.6 1.6 0 0 0 18.7 10H14l.7-4.2A2.4 2.4 0 0 0 12.3 3L7 10v10Z" />
  ),
  "thumb-down": (
    <path d="M17 14V4h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3ZM17 4H7.8a2 2 0 0 0-1.9 1.4l-2.1 6.5A1.6 1.6 0 0 0 5.3 14H10l-.7 4.2A2.4 2.4 0 0 0 11.7 21L17 14V4Z" />
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};

export function AppIcon({ name, size = 18 }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
