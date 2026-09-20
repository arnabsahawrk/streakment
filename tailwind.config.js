/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ash: "#14110E",
        "ash-raised": "#1C1815",
        "ash-sunk": "#0F0D0B",
        "ember-line": "#2E2620",
        paper: "#F2ECE3",
        "paper-dim": "#A79C8C",
        flame: "#FF6B35",
        gold: "#E0A82E",
      },
      fontFamily: {
        sans: ["var(--font-roboto-mono)", "ui-monospace", "monospace"],
        mono: ["var(--font-roboto-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
