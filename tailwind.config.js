/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./layouts/**/*.html", "./content/**/*.md"],
  safelist: ["py-12"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        elixir: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7c3aed",
          800: "#6b46c1",
          900: "#553c9a",
          950: "#3b0764",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: "none",
            code: {
              backgroundColor: theme("colors.gray.100"),
              borderRadius: theme("borderRadius.DEFAULT"),
              paddingLeft: theme("spacing.1"),
              paddingRight: theme("spacing.1"),
              fontWeight: "400",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
          },
        },
        invert: {
          css: {
            code: {
              backgroundColor: theme("colors.gray.800"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
