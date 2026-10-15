/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#006A60',
        'on-primary': '#FFFFFF',
        surface: '#FFFFFF',
        'on-surface': '#191C1C',
        'on-surface-variant': '#3F4948',
        'surface-container': '#F4FBFA',
        'surface-container-high': '#E8F3F1',
        'outline-variant': '#D5E4E2',
        'primary-container': '#9FF2E8',
        'on-primary-container': '#00201C',
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(0, 106, 96, 0.08)',
        card: '0 8px 32px -8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
