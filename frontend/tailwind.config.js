/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#030812",
        accent: "#00E5FF",
        secondary: "#7B5EF8",
        panel: "#0A1020",
        panelSoft: "#101A31",
        text: "#DBE6FF",
        muted: "#8CA0C8",
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 229, 255, 0.15)",
      },
    },
  },
  plugins: [],
};