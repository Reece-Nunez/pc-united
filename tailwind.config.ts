import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'team-blue': '#0f172a', // Navy blue
        'team-red': '#dc2626', // Red accent
        'team-orange': '#8f7f52', // Gray-orange secondary accent
        'team-gray': '#6b7280', // Additional gray tones
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-scale': 'fadeInScale 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;