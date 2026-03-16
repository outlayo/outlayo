/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./apps/server/src/**/*.{ts,js}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9efff",
          600: "#0284c7",
          700: "#0369a1"
        }
      }
    }
  },
  plugins: []
};
