import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-lexend)', 'sans-serif'],
        lexend: ['var(--font-lexend)', 'sans-serif'],
        jakarta: ['var(--font-jakarta)', 'sans-serif']
      },
      colors: {
        teal: {
          DEFAULT: '#1a989e',
          light: '#20bec6',
          dark: '#1d6d70',
          deep: '#083032',
          50: '#d2f2f4',
          100: '#a6e8ec',
          500: '#1a989e',
          600: '#188f95',
          700: '#1d6d70',
          900: '#083032'
        },
        orange: {
          DEFAULT: '#f06f14',
          light: '#fbe9dd',
          accent: '#ea9357',
          pale: '#ffdfca'
        },
        brand: {
          bg: '#f5f6f0',
          'bg-alt': '#f8fafc',
          cream: '#fdfdfa',
          card: '#ffffff',
          border: '#d8d4c3',
          'border-md': '#c9c8c6',
          'text-primary': '#1f1c2f',
          'text-secondary': '#676d65',
          'text-muted': '#939490',
          'text-light': '#c2c6c0',
          error: '#ff2056',
          'error-dark': '#ca1b1b'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'typing': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-6px)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'typing': 'typing 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

export default config
