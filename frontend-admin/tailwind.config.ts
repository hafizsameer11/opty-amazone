import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC',
          dark: '#0052a3',
          darker: '#004080',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        error: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-poppins)', 'system-ui', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
