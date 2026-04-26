import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sovereign: {
          DEFAULT: "#1B4332",
          deep: "#14332A",
        },
        copper: {
          DEFAULT: "#BC6C25",
          soft: "#D48A4A",
        },
        cream: {
          DEFAULT: "#F5F1E8",
          deep: "#EEE8D8",
        },
        ink: "#0A1F1C",
        stone: {
          DEFAULT: "#7A8A7E",
          light: "#A8B3AA",
        },
        hairline: "rgba(10, 31, 28, 0.10)",
        "hairline-strong": "rgba(10, 31, 28, 0.22)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        arabic: ["var(--font-plex-arabic)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
        page: "1280px",
        narrow: "880px",
      },
      letterSpacing: {
        rail: "0.18em",
        wordmark: "0.06em",
      },
      fontSize: {
        rail: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.18em" }],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
