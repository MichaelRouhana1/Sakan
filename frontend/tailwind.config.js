/** @type {import('tailwindcss').Config} */
module.exports = {
  important: ".skoun-admin",
  content: [
    "./app/admin/**/*.{ts,tsx}",
    "./components/admin-neu/**/*.{ts,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        clay: {
          50: "var(--admin-clay-50)",
          100: "var(--admin-clay-100)",
          200: "var(--admin-clay-200)",
          500: "var(--admin-clay-500)",
          700: "var(--admin-clay-700)",
          900: "var(--admin-clay-900)",
        },
        moss: {
          DEFAULT: "var(--admin-moss)",
          soft: "var(--admin-moss-soft)",
        },
        ember: {
          DEFAULT: "var(--admin-ember)",
          soft: "var(--admin-ember-soft)",
        },
        ochre: {
          DEFAULT: "var(--admin-ochre)",
          soft: "var(--admin-ochre-soft)",
        },
      },
      boxShadow: {
        neu: "8px 8px 16px var(--admin-neu-dark), -8px -8px 16px var(--admin-neu-light), inset 1px 1px 0 var(--admin-neu-hi)",
        "neu-sm":
          "5px 5px 10px var(--admin-neu-dark), -5px -5px 10px var(--admin-neu-light), inset 1px 1px 0 var(--admin-neu-hi-sm)",
        "neu-in":
          "inset 6px 6px 12px var(--admin-neu-dark), inset -6px -6px 12px var(--admin-neu-light)",
        "neu-in-sm":
          "inset 3px 3px 7px var(--admin-neu-dark), inset -3px -3px 7px var(--admin-neu-light)",
        press:
          "inset 4px 4px 8px var(--admin-neu-dark), inset -2px -2px 6px var(--admin-neu-light)",
        "glow-moss":
          "inset 3px 3px 7px var(--admin-neu-dark), inset -3px -3px 7px var(--admin-neu-light), 0 0 14px color-mix(in srgb, var(--admin-moss) 38%, transparent)",
        "glow-ochre":
          "inset 3px 3px 7px var(--admin-neu-dark), inset -3px -3px 7px var(--admin-neu-light), 0 0 14px color-mix(in srgb, var(--admin-ochre) 40%, transparent)",
        "glow-ember":
          "inset 3px 3px 7px var(--admin-neu-dark), inset -3px -3px 7px var(--admin-neu-light), 0 0 14px color-mix(in srgb, var(--admin-ember) 40%, transparent)",
        "dot-moss": "0 0 8px var(--admin-moss)",
        "dot-ochre": "0 0 8px var(--admin-ochre)",
        "dot-ember": "0 0 8px var(--admin-ember)",
      },
      fontFamily: {
        display: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        neu: "20px",
        "neu-md": "14px",
      },
      transitionDuration: {
        press: "160ms",
        panel: "240ms",
      },
    },
  },
  plugins: [],
};
