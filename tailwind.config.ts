import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111111",
          800: "#2a2a2a",
          600: "#5a5a5a",
        },
        paper: {
          50: "#faf9f6",
          100: "#f2efe8",
        },
        matcha: {
          500: "#4f8a58",
          700: "#2f5f39",
        },
        sakura: {
          400: "#d9788f",
          600: "#b64f68",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 16px 40px rgb(17 17 17 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

