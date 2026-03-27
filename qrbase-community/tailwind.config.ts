import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#EFF5FF",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F0F6FF",
        },
        border: "#D0E1FF",
        primary: {
          DEFAULT: "#0052FF",
          dark: "#003FCC",
          light: "#EFF5FF",
        },
        accent: {
          purple: "#7C3AED",
        },
        muted: "#64748B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "'Noto Sans Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
