/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#830cc4",
          dark: "#8f1fcf",
          darker: "#9a2edb",
          medium: "#b246f2",
          light: "#c263f9",
          lighter: "#d58cfc",
          muted: "rgba(131, 12, 196, 0.15)",
          mutedLight: "rgba(131, 12, 196, 0.08)",
          mutedMedium: "rgba(131, 12, 196, 0.12)",
          soft: "#e5b3fe",
          softLight: "#f3d9ff",
          white: "#ffffff",
        },
        surface: {
          DEFAULT: "#1A1A1A",
          elevated: "#242424",
        },
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
