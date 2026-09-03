/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',   // primary pink/magenta
          600: '#db2777',   // dark pink
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#fafafa',
          card:    '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card:   '0 1px 4px 0 rgba(0,0,0,0.06), 0 4px 16px 0 rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px 0 rgba(0,0,0,0.12)',
        'pink': '0 4px 14px 0 rgba(236,72,153,0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
