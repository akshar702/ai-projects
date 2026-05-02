/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0f',
        'bg-surface': '#13131a',
        'bg-card': '#1a1a24',
        'folio-border': '#1e1e2e',
        'primary': '#7c3aed',
        'primary-light': '#a855f7',
        'accent': '#06b6d4',
        'accent-light': '#22d3ee',
        'success': '#10b981',
      },
      animation: {
        'gradient-shift': 'gradientShift 20s ease infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px #7c3aed40' },
          '50%': { boxShadow: '0 0 24px #7c3aed80' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
