import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Added to cover root app directory
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}', // Kept for src/app structure
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', 'sans-serif'], // Simplified as per suggestion
        mono: ['var(--font-geist-mono)', 'monospace'], // Retaining Geist Mono for mono
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config