import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Dashboard-Fixierung (festes 100vh-Layout) nur auf groß genug Bildschirmen:
      // breit (>=1280px) UND hoch genug (>=900px). Auf kleineren Laptops/MacBooks
      // (geringe Viewport-Höhe) scrollt das Dashboard stattdessen normal, statt
      // alles in die Höhe zu quetschen. Wird via extend gemerged → sm/md/lg/xl/2xl bleiben.
      screens: {
        dash: { raw: '(min-width: 1280px) and (min-height: 900px)' },
      },
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
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
