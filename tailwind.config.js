/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        panel: "#FFFFFF",
        ink: "#221F1C",
        muted: "#6B6560",
        line: "#E6E1D6",
        accent: {
          DEFAULT: "#8A6A42",
          dark: "#6E5333",
          light: "#F1E7D6",
        },
        success: "#2F6F4F",
        danger: "#B3432B",
        warn: "#B4832A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["\"Fraunces\"", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(34, 31, 28, 0.06)",
      },
    },
  },
  plugins: [],
};
