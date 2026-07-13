"use client";

import { MantineProvider, createTheme } from "@mantine/core";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif",
  headings: {
    fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif",
    fontWeight: "700",
  },
});

export function UIProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
