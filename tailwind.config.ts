import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Broadly scan the entire src directory
    "./app/**/*.{js,ts,jsx,tsx,mdx}",   // Scan a root app directory if it exists
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
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