/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#06080e',
          900: '#0a0e17',
          850: '#0f1422',
          800: '#141b2d',
          700: '#1e2942',
          600: '#334155',
        },
        cyber: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 242, 254, 0.2), inset 0 0 5px rgba(0, 242, 254, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 242, 254, 0.6), inset 0 0 10px rgba(0, 242, 254, 0.3)' },
        }
      }
    },
  },
  plugins: [],
}
