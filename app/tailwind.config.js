/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#142B27",
        paper: "#F6F4EE",
        surface: "#FFFFFF",
        hairline: "#E1DDCF",
        muted: "#5B6660",
        gold: "#B8902E",
        success: "#3D7A5B",
        warning: "#B8902E",
        danger: "#A83B32",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
