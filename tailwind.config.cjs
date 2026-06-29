/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#2d2d2d",
        paper: "#fafaf9",
        muted: "#8c8c8c",
        border: "#e8e8e4",
        accent: "#7d9b76",
      },
      fontFamily: {
        sans: ['"Zen Kaku Gothic New"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        display: ['"Zen Maru Gothic"', '"M PLUS Rounded 1c"', "system-rounded", "sans-serif"],
      },
    },
  },
  plugins: [],
};
