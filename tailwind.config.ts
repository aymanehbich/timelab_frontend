/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#171717', hover: '#262626', light: '#404040' },
        background: { DEFAULT: '#fafafa', card: '#ffffff', input: '#fafafa', secondary: '#f5f5f5' },
        text: { DEFAULT: '#171717', secondary: '#525252', muted: '#737373', placeholder: '#a3a3a3' },
        border: { DEFAULT: '#e5e5e5', light: '#f5f5f5' },
        error: { DEFAULT: '#dc2626', light: '#fef2f2', border: '#fee2e2' },
        success: { DEFAULT: '#16a34a', light: '#f0fdf4', border: '#dcfce7' },
        warning: { DEFAULT: '#ca8a04', light: '#fefce8', border: '#fef9c3' },
        overlay: 'rgba(0, 0, 0, 0.5)',
      },
      borderRadius: { card: '1rem', input: '0.75rem', button: '0.75rem' },
      boxShadow: {
        card: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'card-subtle': '0 20px 25px -5px rgba(229, 229, 229, 0.5)',
      },
    },
  },
  plugins: [],
}
