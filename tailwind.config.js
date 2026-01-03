/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e9fff3",
          100: "#c9ffe0",
          200: "#97ffc3",
          300: "#5fffa2",
          400: "#2dff84",
          500: "#00f06a",
          600: "#00c455",
          700: "#009443",
          800: "#066f36",
          900: "#075a2f",
          950: "#03341a",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,240,106,.25), 0 0 40px rgba(0,240,106,.18)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0), radial-gradient(ellipse at top, rgba(0,240,106,.18), transparent 60%)",
      },
    },
  },
  plugins: [],
}

