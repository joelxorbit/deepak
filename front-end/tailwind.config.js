/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#006e2f",
        "on-primary": "#ffffff",
        "primary-container": "#74ff8f",
        "on-primary-container": "#00210a",
        background: "#faf8ff",
        "on-background": "#191c20",
        surface: "#f8f9ff",
        "on-surface": "#191c20",
        "surface-variant": "#dee5d9",
        "on-surface-variant": "#424940",
        "surface-dark": "#0f172a",
        "on-surface-dark-variant": "#94a3b8",
        "inverse-surface": "#2e3135",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
      },
      padding: {
        'container-padding-desktop': '40px',
        'container-padding-mobile': '16px'
      }
    },
  },
  plugins: [],
}
