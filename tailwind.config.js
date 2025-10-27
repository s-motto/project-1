/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors per Let's Walk
        brand: {
          primary: '#2563eb',    // blue-600
          secondary: '#10b981',  // green-600
          danger: '#ef4444',     // red-600
          warning: '#f59e0b',    // amber-600
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'Arial', 'Helvetica', 'sans-serif'],
      },
      zIndex: {
        'modal': '9999',
        'map-marker': '400',
        'dropdown': '50',
        'nav': '40',
      }
    },
  },
  plugins: [],
}