/** Cor baseada em variável CSS com suporte a opacidade (ex.: bg-blush/50). */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Classes montadas dinamicamente (ex.: `cover-${estampa}`, `paper-${papel}`).
  safelist: [{ pattern: /^(paper|cover)-(pautado|quadriculado|pontilhado|liso|bolinhas|listras|xadrez|coracoes|estrelas)$/ }],
  theme: {
    extend: {
      colors: {
        // Identidade visual — os valores vêm de variáveis CSS (ver src/styles/themes.css),
        // o que permite trocar o tema de cores e ativar o modo escuro sem recarregar.
        blush: v('blush'), // fundos suaves e destaques
        petal: v('petal'), // cards e elementos secundários
        rose: {
          antique: v('rose-antique'), // identidade visual
          medium: v('rose-medium'), // elementos interativos
          pink: v('rose-pink'), // ações principais
          deep: v('rose-deep'), // hover/pressionado das ações principais
          ink: v('rose-ink'), // texto de destaque com alto contraste
        },
        lilac: { DEFAULT: v('lilac'), deep: v('lilac-deep') }, // lavanda (destaques secundários)
        canvas: v('canvas'), // fundo geral
        surface: v('surface'), // superfícies (cartões, menus, campos)
        ink: {
          DEFAULT: v('ink'), // textos principais
          muted: v('ink-muted'), // textos secundários (contraste AA)
          soft: v('ink-soft'), // textos terciários
        },
        line: v('line'), // bordas delicadas
      },
      fontFamily: {
        sans: ['"Nunito Variable"', '"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Nunito Variable"', 'system-ui', 'sans-serif'],
        hand: ['"Caveat Variable"', '"Patrick Hand"', 'cursive'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--c-shadow) / 0.04), 0 8px 24px -6px rgb(var(--c-shadow) / 0.10)',
        lift: '0 2px 4px rgb(var(--c-shadow) / 0.05), 0 16px 36px -8px rgb(var(--c-shadow) / 0.18)',
        ring: '0 0 0 4px rgb(var(--c-rose-medium) / 0.18)',
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
  darkMode: 'class',
  plugins: [],
};
