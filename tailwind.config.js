/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#6366f1',
          cyan: '#06b6d4',
          emerald: '#10b981',
          dark: '#0b0f19',
          card: '#111827'
        }
      }
    },
  },
  plugins: [],
}
