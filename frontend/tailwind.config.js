/** @type {import('tailwindcss').Config} */
//
// Strict 4-colour brand palette for the BNR Compliance Portal.
//
//   gold   #8B6914  -- headings, primary action backgrounds
//   brown  #5C3D0E  -- logo, borders, secondary emphasis
//   white  #FFFFFF  -- page and surface backgrounds
//   ink    #1A1A1A  -- body text
//   error  #B91C1C  -- validation and failed-auth feedback (against white)
//
// `theme.colors` REPLACES Tailwind's default colour palette (instead of
// extending it), so any stray `bg-slate-200` / `text-rose-600` etc. simply
// won't compile to a class -- the build acts as a guardrail enforcing the
// brand.
//
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      gold: '#8B6914',
      brown: '#5C3D0E',
      ink: '#1A1A1A',
      error: '#B91C1C',
    },
    extend: {},
  },
  plugins: [],
};
