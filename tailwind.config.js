/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pcuf-blue': '#1e3a8a', // Dark blue
        'pcuf-red': '#dc2626',  // Red accent
        'pcuf-orange': '#8f7f52', // Gray orange
        'pcuf-gray': '#6b7280', // Secondary gray
      },
    },
  },
  plugins: [],
}