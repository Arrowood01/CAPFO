/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    // require('@tailwindcss/postcss'), // CommonJS style, might be needed if ESM fails
    '@tailwindcss/postcss', // Try ESM style first
    'autoprefixer',
  ],
};

export default config;
