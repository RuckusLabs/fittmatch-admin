import type { Config } from 'tailwindcss'

// FittMatch palette (mirrors the mobile app's theme/index.ts). The stock Tailwind scales used
// across the admin are remapped onto it, so existing classes like text-green-700 or bg-gray-50
// pick up the brand colours without touching every page.
const neutral = {
  50: '#FAFAF8', // paper
  100: '#F4F3F0', // surface
  200: '#E8E6E1', // border
  300: '#D4D1CA', // border2
  400: '#B8B5AF', // ink4
  500: '#7A7A7A', // ink3
  600: '#5A5A58',
  700: '#3A3A3A', // ink2
  800: '#1F1F1E',
  900: '#0D0D0D', // ink
  950: '#070707',
}
const accent = {
  50: '#FFF0ED', 100: '#FDDDD5', 200: '#F8BBAA', 300: '#EE927A', 400: '#E6765A',
  500: '#E05C3A', 600: '#C8472A', 700: '#A33A22', 800: '#7E2D1A', 900: '#5A2013', 950: '#3A150C',
}
const green = {
  50: '#E8F5EE', 100: '#D1EBDD', 200: '#A9D8BF', 300: '#7CC29E', 400: '#4FAD7E',
  500: '#2E9E64', 600: '#1A7A4A', 700: '#146239', 800: '#0F4A2B', 900: '#0A331E', 950: '#051C10',
}
const red = {
  50: '#FDECEA', 100: '#FAD7D3', 200: '#F3B3AB', 300: '#E8877B', 400: '#DC6558',
  500: '#D14A3B', 600: '#C0392B', 700: '#9E2E23', 800: '#7C241B', 900: '#5A1A14', 950: '#3A110D',
}
const gold = {
  50: '#FFF9E6', 100: '#FCEFC7', 200: '#F5DC8E', 300: '#E9C35A', 400: '#D8AC2E',
  500: '#C9981C', 600: '#B8860B', 700: '#936B09', 800: '#6E5007', 900: '#4A3605', 950: '#2E2103',
}
const blue = {
  50: '#EAF0FA', 100: '#D5E1F4', 200: '#B3C8EA', 300: '#85A6DA', 400: '#5480C4',
  500: '#2F60A8', 600: '#1A4A8A', 700: '#153C70', 800: '#102E57', 900: '#0B203D', 950: '#061324',
}

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        gray: neutral,
        slate: neutral,
        zinc: neutral,
        stone: neutral,
        neutral,
        red,
        rose: red,
        green,
        emerald: green,
        amber: gold,
        yellow: gold,
        orange: accent,
        blue,
        sky: blue,
        indigo: blue,
        brand: accent,
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
