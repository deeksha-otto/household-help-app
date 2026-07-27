/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f7eef8',
          100: '#edd9f0',
          200: '#dbb3e1',
          300: '#c485cc',
          400: '#a857b5',
          500: '#8c3a96',
          600: '#6D2E75',
          700: '#5A2060',
          800: '#4A0E4E',
          900: '#3a0a3d',
        },
      },
    },
  },
  plugins: [],
}
