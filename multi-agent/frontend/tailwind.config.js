/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0d12",
          800: "#11141b",
          700: "#181c25",
          600: "#222633",
          500: "#2c3142"
        },
        accent: {
          400: "#7c9cff",
          500: "#5a7dff"
        }
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
