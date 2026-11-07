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
        // Resolved through CSS variables so html:lang(zh) can swap the whole
        // stack (including .font-sans / .font-display utilities) to Traditional
        // Chinese faces. Defaults live in src/styles/global.css.
        sans: ["var(--font-sans, system-ui, sans-serif)"],
        display: ["var(--font-display, system-ui, sans-serif)"],
      },
    },
  },
  plugins: [],
};
