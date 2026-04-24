/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Syne", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        monoDisplay: ["Space Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        bg: {
          primary: "#030812",
          secondary: "#070f1e",
          card: "#0b1628",
        },
        brand: {
          cyan: "#00E5FF",
          violet: "#7B5EF8",
          green: "#00FF9D",
          red: "#FF4D6D",
          gold: "#FFD700",
        },
        text: {
          primary: "#E8F0FE",
          muted: "#6B88A8",
          faint: "#2A3F5F",
        },
        accent: "#00E5FF",
        secondary: "#7B5EF8",
        panel: "#0b1628",
        panelSoft: "#070f1e",
        muted: "#6B88A8",
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 229, 255, 0.15)",
      },
    },
  },
  plugins: [],
};