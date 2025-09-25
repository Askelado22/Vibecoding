/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0f1220",
        surface: "#111322",
        surfaceAlt: "#1c2033",
        textPrimary: "#e5e7eb",
        accentBlue: "#3b82f6",
        accentPink: "#ec4899"
      }
    }
  },
  plugins: []
};
