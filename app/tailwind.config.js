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
        sage: {
          bg: "#EDF3EF",
          line: "#D2DFD6",
          text: "#14302A",
          muted: "#4F6A60",
          hover: "#E1ECE5",
          active: "#D3E6DA",
          accent: "#1F6B4E",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
