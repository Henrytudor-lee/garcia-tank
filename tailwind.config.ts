import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff00',
          yellow: '#ffff00',
          cyan: '#00ffff',
          magenta: '#ff00ff',
          red: '#ff0000',
          orange: '#ff8800',
          purple: '#8800ff',
          blue: '#0088ff',
        },
      },
      boxShadow: {
        'neon-green': '0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 20px #00ff00',
        'neon-yellow': '0 0 5px #ffff00, 0 0 10px #ffff00, 0 0 20px #ffff00',
        'neon-cyan': '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 20px #00ffff',
        'neon-red': '0 0 5px #ff0000, 0 0 10px #ff0000, 0 0 20px #ff0000',
        'neon-purple': '0 0 5px #8800ff, 0 0 10px #8800ff, 0 0 20px #8800ff',
      },
    },
  },
  plugins: [],
}
export default config
