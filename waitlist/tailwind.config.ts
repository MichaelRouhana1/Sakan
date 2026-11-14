import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#EA3F4A",
          pressed: "#C0343D",
          mist: "#FDECEE",
          soft: "#F7B7BC",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          muted: "#5E5A55",
          faint: "#8A847C",
        },
        wash: {
          DEFAULT: "#F7F5F3",
          warm: "#EFEBE7",
        },
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        phone:
          "0 30px 60px -20px rgba(26, 26, 26, 0.35), 0 12px 24px -12px rgba(234, 63, 74, 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
