import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Confidence/status colors used across the app; kept as named tuples so
// components can reference them the same way Mantine's default palette works.
const dangerRed: MantineColorsTuple = [
  "#fff5f5",
  "#ffe3e3",
  "#ffc9c9",
  "#ff8787",
  "#ff6b6b",
  "#fa5252",
  "#e03131",
  "#c92a2a",
  "#b02525",
  "#962020",
];

export const theme = createTheme({
  primaryColor: "blue",
  primaryShade: 6,
  fontFamily: '"Noto Sans Thai", -apple-system, "Segoe UI", Roboto, sans-serif',
  defaultRadius: "md",
  colors: {
    dangerRed,
  },
  components: {
    AppShell: {
      styles: {
        main: { background: "var(--mantine-color-gray-0)" },
      },
    },
  },
});
