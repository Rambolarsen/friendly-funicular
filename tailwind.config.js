/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        fantasy: ['"MedievalSharp"', '"Cinzel"', 'serif'],
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'flash-green': 'flashGreen 0.8s ease-out',
        'flash-red': 'flashRed 0.8s ease-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        flashGreen: {
          '0%': { backgroundColor: 'rgba(34,197,94,0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(239,68,68,0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
