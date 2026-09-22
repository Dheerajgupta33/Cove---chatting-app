/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      opacity: { 8: '0.08', 12: '0.12', 15: '0.15', 55: '0.55', 85: '0.85' },
      colors: {
        app: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        ink: token('ink'),
        sub: token('sub'),
        brand: token('brand'),
        'brand-2': token('brand-2'),
        coral: token('coral'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 12px 40px -8px rgb(0 0 0 / 0.35), 0 2px 8px rgb(0 0 0 / 0.12)',
        glow: '0 8px 30px -6px rgb(var(--brand) / 0.55)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        dot: { '0%,80%,100%': { transform: 'scale(0.6)', opacity: 0.4 }, '40%': { transform: 'scale(1)', opacity: 1 } },
        ring: { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(1.9)', opacity: 0 } },
        flash: { '0%,100%': { background: 'transparent' }, '30%': { background: 'rgb(var(--brand) / 0.22)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 7s ease-in-out infinite',
        dot: 'dot 1.2s infinite ease-in-out',
        ring: 'ring 1.8s ease-out infinite',
        flash: 'flash 1.6s ease-out',
      },
    },
  },
  plugins: [],
};
