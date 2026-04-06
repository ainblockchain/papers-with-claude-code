import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'slide-in-left': 'slide-in-left 200ms ease-out',
      },
      colors: {
        'lms-100': '#1C1E26',
        'lms-200': '#2C2E37',
        'lms-blue-100': '#EFF3FF',
        'lms-blue-200': '#CCDBFF',
        'lms-blue-300': '#92B1FF',
        'lms-blue-400': '#7DA1FF',
        'lms-blue-500': '#5C8AFF',
        'lms-blue-600': '#547EE8',
        'lms-blue-700': '#4162B5',
        'lms-blue-800': '#334C8C',
        'lms-blue-900': '#273A6B',
      },
    },
  },
  plugins: [],
}

export default config
