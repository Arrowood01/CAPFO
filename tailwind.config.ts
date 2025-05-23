import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Ensure this broadly scans all relevant files in src
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          dark: '#1d4ed8',    // blue-700
          light: '#3b82f6',   // blue-500
        },
        gray: colors.zinc,
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // mono: ['var(--font-geist-mono)', 'monospace'], // Removed as per new config, can be added back if needed
      },
      backgroundImage: { // Kept existing backgroundImage, can be removed if not needed
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config