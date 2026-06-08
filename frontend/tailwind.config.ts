import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3864',
          50:  '#e8ecf3',
          100: '#c5cfe2',
          200: '#9eb0ce',
          300: '#7690ba',
          400: '#5678ab',
          500: '#1F3864',
          600: '#1b3058',
          700: '#16274a',
          800: '#111e3b',
          900: '#0c152a',
        },
        // MEGAINDUS Industrial Dark Design System
        surface: {
          base:     '#0B0F17',
          DEFAULT:  '#121826',
          elevated: '#1A2233',
          card:     '#1E2638',
        },
        border: {
          DEFAULT: '#2A3346',
          sub:     '#1F2638',
        },
        ink: {
          hi: '#E6ECF5',
          md: '#A8B3C7',
          lo: '#6B7896',
        },
        accent: {
          DEFAULT: '#00D4FF',
          2:       '#0EA5E9',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      fontSize: {
        base: ['14px', '20px'],
      },
    },
  },
  plugins: [],
} satisfies Config
