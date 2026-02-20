import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'cogito-blue': '#3B82F6',
        'cogito-purple': '#8B5CF6',
        'cogito-dark': '#0F172A',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
