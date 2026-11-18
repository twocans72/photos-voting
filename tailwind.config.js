/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      colors: {
        // Palette des Umbaus 2026-11: Pflaumenviolett, Blau, helles Blaugrau
        surface: {
          DEFAULT: '#211a33',
          1: '#1a1429',
          2: '#2a2240',
          3: '#3a3154',
        },
        accent: {
          DEFAULT: '#358de5',
          warm: '#5ba5ee',
          muted: '#2a6fb8',
        },
        text: {
          primary: '#edf2f7',
          secondary: '#a5b1c2',
          muted: '#8a94a8',
        },
        gold: {
          1: '#FFD700',
          2: '#C0C0C0',
          3: '#CD7F32',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
