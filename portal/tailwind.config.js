/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'digidromen-yellow': '#FFD500',
        'digidromen-orange': '#EE7219',
        'digidromen-orange-hover': '#B75C0E',
        'digidromen-dark': '#2E3848',
        'digidromen-beige': '#FBF4EB',
        'digidromen-blue': '#87CEDC',
        'surface': '#FFFFFF',
        'surface-soft': '#FFF9EA',
        'digidromen-primary': '#005FB8',
        'digidromen-warm': '#FAF8F5',
        'digidromen-cream': '#F5F0EB',
        'digidromen-secondary': '#F2A900',
        'digidromen-orange-light': '#FFF7ED',
        'digidromen-orange-medium': '#FED7AA',
      },
      fontFamily: {
        heading: ['Sora', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Roboto', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
