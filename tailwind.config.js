/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade Pink Premium
        blush: '#FCE7F3', // rosa bebê — fundos suaves e destaques
        petal: '#F9D5E5', // rosa pastel — cards e elementos secundários
        rose: {
          antique: '#D98BAE', // rosa antigo — identidade visual
          medium: '#E879A9', // rosa médio — elementos interativos
          pink: '#DB2777', // rosa pink — ações principais
          deep: '#BE185D', // hover/pressionado das ações principais
          ink: '#9D174D', // texto rosa com alto contraste
        },
        canvas: '#F8F5F7', // cinza rosado — fundo geral
        ink: {
          DEFAULT: '#51434B', // textos principais
          muted: '#7A6871', // textos secundários pequenos (contraste AA)
          soft: '#A3949D', // textos secundários/terciários
        },
        line: '#F1E4EB', // bordas delicadas
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display Variable"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(81, 67, 75, 0.04), 0 4px 16px rgba(219, 39, 119, 0.06)',
        lift: '0 2px 4px rgba(81, 67, 75, 0.05), 0 12px 32px rgba(219, 39, 119, 0.10)',
        ring: '0 0 0 4px rgba(232, 121, 169, 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 240ms ease-out both',
        'scale-in': 'scale-in 180ms ease-out',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
