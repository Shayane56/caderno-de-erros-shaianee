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

        // ---- Identidades visuais (propostas em /identidades — ver docs/IDENTIDADES.md).
        // Paletas fixas, sem variáveis: cada identidade é um sistema fechado.
        ed: {
          paper: '#F6F3EE', // A · Editorial — papel
          sheet: '#FBF9F5',
          wash: '#EEE8DF',
          ink: '#171513',
          graphite: '#5B544C',
          stone: '#8E867B',
          rule: '#DCD5CA',
          accent: '#7B2D4E', // bordô — acento único
          'accent-deep': '#5E1F3A',
          'accent-wash': '#F2E6EA',
          moss: '#3F5A47',
          'moss-wash': '#E4EAE3',
        },
        sf: {
          mist: '#F6F4FB', // B · Soft Modern — névoa
          surface: '#FFFFFF',
          lav: '#ECE6FC',
          'lav-50': '#F5F2FE',
          lilac: '#B9A6F2',
          violet: '#6B4FD8',
          'violet-deep': '#4E37AE',
          plum: '#2B2540',
          muted: '#6C6683',
          soft: '#A39DB8',
          line: '#E9E4F4',
          mint: '#DFF3EA',
          'mint-ink': '#2E7A61',
          peach: '#FCEADF',
          'peach-ink': '#A9552F',
          sky: '#E3EDFA',
          'sky-ink': '#3B66A6',
          rose: '#FBE6EF',
          'rose-ink': '#AC3D69',
        },
        bd: {
          bone: '#EEEBE4', // C · Bold Minimal — osso
          paper: '#F8F6F1',
          ink: '#0E0E10',
          uv: '#4A2BFF', // ultravioleta — ação
          'uv-deep': '#3317DB',
          signal: '#FF5A1F', // sinal — urgência
          grey: '#625E57',
          line: '#CFCAC0',
          lav: '#D8D1FF',
        },
      },
      fontFamily: {
        // As fontes da interface vêm de variáveis (src/styles/index.css), para que as
        // identidades visuais também alcancem janelas e avisos compartilhados.
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        'ed-serif': ['"Newsreader Variable"', 'Georgia', 'serif'],
        'ed-sans': ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        sf: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        bd: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        'bd-mono': ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
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
