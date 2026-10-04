/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        heritage: {
          50:  '#E5EAF1',
          100: '#B3C0D4',
          200: '#8095B7',
          300: '#4D6B9A',
          400: '#1A417D',
          500: '#002D72',
          600: '#00255E',
          700: '#001D4A',
          800: '#001536',
          900: '#000B1F',
        },
        breath: {
          50:  '#EAF6FE',
          100: '#C9E8FD',
          200: '#9DD6FB',
          300: '#6BC2FA',
          400: '#3AB2FA',
          500: '#0CA4F9',
          600: '#0892DE',
          700: '#0676B3',
          800: '#055A88',
          900: '#033F5E',
        },
        sys: {
          50:  '#FFFFFF',
          100: '#F4F4F5',
          200: '#E8E8EA',
          300: '#CFCFD3',
          700: '#3A3A3D',
          900: '#0A0A0B',
        },
        ink: {
          DEFAULT: '#0A0A0B',
          2: 'rgba(10,10,11,0.65)',
          3: 'rgba(10,10,11,0.4)',
        },
      },
      fontFamily: {
        en:   ['Inter', 'system-ui', 'sans-serif'],
        kr:   ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
}
