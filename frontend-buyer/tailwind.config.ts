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
        secondary: {
          DEFAULT: '#00CC66',
          dark: '#00b359',
          darker: '#00994d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
