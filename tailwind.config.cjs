/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        ink:      '#18180F',
        ink2:     '#48483A',
        ink3:     '#8A8A7A',
        paper:    '#FAFAF6',
        paper2:   '#F3F2EC',
        paper3:   '#ECEAE2',
        rule:     '#DDDDD0',
        rule2:    '#C8C8B8',
        saffron:  '#C8720A',
        'saffron-lt': '#FDF3EA',
        'up':     '#1E6630',
        'dn':     '#991818',
      },
    },
  },
  plugins: [],
}
