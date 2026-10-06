// Design tokens: SRS §8.4. Do not add colours without a reason.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2B36',
        civic: { DEFAULT: '#0F5E63', dark: '#0A4448', soft: '#E3EFEE' },
        paper: '#F6F8F7',
        line: '#D3DCDA',
        signal: '#E3A008',
        danger: '#B42318',
        ok: '#1E7B4F',
      },
      fontFamily: { sans: ['"Public Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'] },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
