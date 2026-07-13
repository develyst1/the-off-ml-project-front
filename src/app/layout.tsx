import "@mantine/core/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { UIProvider } from "@/components/providers/UIProvider";

export const metadata: Metadata = {
  title: "Off ML Project",
  description: "AI Tech Support Assistant for LINE and MS Teams workflows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
