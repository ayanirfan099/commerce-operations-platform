/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CommerceOps visual system — storefront (editorial) vs admin (data-oriented)
        storefront: {
          ink: "#0f172a",
          paper: "#ffffff",
          muted: "#64748b",
          accent: "#b45309", // amber
        },
        admin: {
          ink: "#0f172a",
          surface: "#f8fafc",
          border: "#e2e8f0",
          accent: "#2563eb", // blue
          danger: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
