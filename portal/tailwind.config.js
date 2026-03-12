/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'digidromen-primary': '#005FB8',
        'digidromen-secondary': '#F2A900',
      }
    },
  },
  plugins: [],
}
