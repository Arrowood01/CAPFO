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
          DEFAULT: '#0D69FF', // New vibrant blue
          dark: '#0052CC',    // Darker shade for hover
          light: '#3C82F6',   // Lighter shade
        },
        gray: colors.zinc,
        contentBg: '#F4F7FE',
        statCardBlueBg: '#E7F0FF',
        statCardRedBg: '#FFEAEA',
        statCardIconBlue: '#0D69FF',
        statCardIconRed: '#FF6B6B',
        statCardTextBlue: '#0D69FF',
        statCardTextRed: '#D9534F',
        sidebarTextActive: '#FFFFFF',
        sidebarTextInactive: '#A7BCFF',
        sidebarActiveBg: '#2575FF',
        tableHeaderBg: '#FFFFFF',
        tableHeaderText: '#A0AEC0',
        tableRowHoverBg: '#F9FAFB', // gray-50
        tableDivider: '#E2E8F0', // slate-200
        searchText: '#A0AEC0',
        iconGray: '#A0AEC0',
        whiteCardBg: '#FFFFFF',
        defaultText: '#374151', // gray-700
        titleText: '#1F2937', // gray-800
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