import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f4ff",
          100: "#e6e9fe",
          200: "#c3caFC",
          300: "#a3adfa",
          400: "#7c8bf5",
          500: "#5b6cee",
          600: "#4450d6",
          700: "#3540ac",
          800: "#2b3489",
          900: "#242c6e",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.1)",
        popover: "0 12px 32px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
