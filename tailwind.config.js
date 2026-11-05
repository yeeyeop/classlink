/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        song: ['"Noto Serif SC"', 'STSong', 'SimSun', '"Songti SC"', 'serif'],
        english: ['"Times New Roman"', 'Times', 'serif'],
        phantom: [
          'MaboroshinoNijimiMincho',
          'STSong',
          'SimSun',
          '"Songti SC"',
          'serif',
        ],
      },
    },
  },
  plugins: [],
}

export default tailwindConfig
