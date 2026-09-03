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
          50:  '#fff5f7',
          100: '#ffe8ee',
          200: '#ffc9d7',
          300: '#ff9db6',
          400: '#ff6d92',
          500: '#ff3f6c',   // primary action pink
          600: '#e63a62',
          700: '#c22f52',
          800: '#9c2642',
          900: '#7a1e34',
        },
        ink: '#282c3f',        // primary text
        muted: '#7e818c',      // secondary text
        line: '#eaeaec',       // borders
        shell: '#f5f5f6',      // page / input background
        deal: '#ff905a',       // discount text
        ok: '#03a685',         // success / in stock
        rating: '#14958f',     // rating pill
      },
      fontFamily: {
        sans: ['Inter', 'Assistant', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:   '0 1px 4px 0 rgba(40,44,63,0.08)',
        'card-hover': '0 4px 14px 0 rgba(40,44,63,0.16)',
        header: '0 2px 6px 0 rgba(40,44,63,0.10)',
        pink: '0 4px 14px 0 rgba(255,63,108,0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
