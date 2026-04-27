/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        serif: ["Source Serif 4", "Georgia", "ui-serif", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f6f2",
          100: "#eeece4",
          200: "#d9d5c3",
          300: "#b8b099",
          400: "#8b8267",
          500: "#5e573f",
          600: "#3f3a29",
          700: "#2a2619",
          800: "#1a170d",
          900: "#0d0b06",
        },
        accent: {
          DEFAULT: "#b04a2e",
          soft: "#e8b9a4",
          dark: "#7a2f1a",
        },
      },
      boxShadow: {
        paper: "0 1px 0 rgba(20,16,8,0.04), 0 8px 32px -16px rgba(20,16,8,0.18)",
      },
    },
  },
  plugins: [],
};
