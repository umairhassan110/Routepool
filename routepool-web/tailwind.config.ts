import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { emerald: { 500: "#10B981" }, navy: "#0F172A", canvas: "#F8FAFC" },
      fontFamily: { sans: ["var(--font-sans)", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
