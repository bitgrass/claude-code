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
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAFC",
        },
        border: "#E2E8F0",
        primary: {
          DEFAULT: "#3B82F6",
          dark: "#2563EB",
        },
        accent: {
          purple: "#8B5CF6",
        },
        muted: "#64748B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
