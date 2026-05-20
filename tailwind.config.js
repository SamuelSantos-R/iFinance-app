/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
          yellow: '#FFCC00',
          teal: '#5AC8FA',
          gray: {
            100: '#F2F2F7',
            200: '#E5E5EA',
            300: '#D1D1D6',
            400: '#C7C7CC',
            500: '#AEAEB2',
            600: '#8E8E93',
          },
          darkGray: {
            100: '#8E8E93',
            200: '#636366',
            300: '#48484A',
            400: '#3A3A3C',
            500: '#2C2C2E',
            600: '#1C1C1E',
          },
          bgLight: '#F2F2F7',
          bgDark: '#000000',
          cardLight: '#FFFFFF',
          cardDark: '#1C1C1E',
        }
      },
      fontFamily: {
        rounded: ['SF Pro Rounded', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
