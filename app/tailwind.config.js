/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#24221E",
        paper: "#F8F7F5",
        surface: "#FFFFFF",
        hairline: "#DAD8D2",
        muted: "#66625A",
        gold: "#B8902E",
        success: "#3D7A5B",
        warning: "#B8902E",
        danger: "#A83B32",
        theme: {
          bg: "#F0EFEC",
          line: "#DAD8D2",
          text: "#24221E",
          muted: "#66625A",
          hover: "#E8E6E1",
          active: "#E0DDD5",
          accent: "#3A3733",
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
