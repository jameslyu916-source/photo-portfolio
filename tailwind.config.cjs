/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1c1c",
        paper: "#f9f7f2",
        muted: "#78716c",
        border: "#e7e3da",
        accent: "#c44900",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        serif: ['"Playfair Display"', '"Noto Serif SC"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
