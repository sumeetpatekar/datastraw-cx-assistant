/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B1A",
        paper: "#FAFAF8",
        line: "#E4E2DD",
        moss: "#3F5B4E",
        clay: "#B5603F",
        sand: "#EFEBE3",
        warn: "#A6501F",
      },
      fontFamily: {
        display: ["'IBM Plex Serif'", "Georgia", "serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};
