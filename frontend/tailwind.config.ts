import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        ui: {
          canvas: "var(--ui-canvas)",
          surface: "var(--ui-surface)",
          "surface-subtle": "var(--ui-surface-subtle)",
          "surface-raised": "var(--ui-surface-raised)",
          border: "var(--ui-border)",
          "border-strong": "var(--ui-border-strong)",
          text: "var(--ui-text)",
          muted: "var(--ui-text-muted)",
          accent: "var(--ui-accent)",
        },
        fire: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flame": "flame 2s ease-in-out infinite alternate",
      },
      keyframes: {
        flame: {
          "0%": { transform: "scale(1)", filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))" },
          "100%": { transform: "scale(1.08)", filter: "drop-shadow(0 0 20px rgba(249, 115, 22, 0.9))" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
