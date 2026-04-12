import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sidebar: '#445c49',
        wellbeing: {
          green: {
            DEFAULT: '#445c49',
            light: '#94c1a4',
            dark: '#2d3e31',
          },
          terracotta: '#823509',
          sand: '#cba178',
          cream: '#f6ede2',
          gray: '#737373',
        },
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
