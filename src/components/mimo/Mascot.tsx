import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Mimo — o gatinho mascote (ilustração original em SVG).
 * Cores fixas (é um "adesivo"), legíveis no tema claro e no escuro.
 */
export type MascotPose = 'books' | 'headphones' | 'heart' | 'cheer' | 'face';

const INK = '#5A3D45';
const FUR = '#FFFDFB';
const PATCH = '#F7B27E';
const PATCH_DARK = '#E8925C';
const EAR_IN = '#F9B9C9';
const BLUSH = '#F79AB3';
const PINK = '#F28DB0';
const PINK_DEEP = '#E56B97';
const LILAC = '#C7B2F4';
const LILAC_DEEP = '#9B7FE6';

const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Heart({ x, y, s = 1, fill = PINK, rotate = 0 }: { x: number; y: number; s?: number; fill?: string; rotate?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}
      d="M0 4 C -6 -4, -14 2, -8 9 L 0 16 L 8 9 C 14 2, 6 -4, 0 4 Z"
      fill={fill}
      stroke={INK}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  );
}

function Sparkle({ x, y, s = 1, fill = '#FFFFFF' }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7 Q1.2 -1.2 7 0 Q1.2 1.2 0 7 Q-1.2 1.2 -7 0 Q-1.2 -1.2 0 -7Z" fill={fill} />;
}

/** Cabeça do gatinho centrada em (0,0), largura ~110. */
function Head({ clipId, wink = false }: { clipId: string; wink?: boolean }) {
  const face = 'M-52 6 C-54 -30 -30 -44 0 -44 C30 -44 54 -30 52 6 C50 34 28 46 0 46 C-28 46 -50 34 -52 6Z';
  return (
    <g>
      {/* orelhas */}
      <path d="M-46 -18 L-44 -60 Q-42 -66 -36 -62 L-10 -40 Z" fill={PATCH} {...stroke} />
      <path d="M-40 -26 L-39 -52 L-20 -38 Z" fill={EAR_IN} />
      <path d="M46 -18 L44 -60 Q42 -66 36 -62 L10 -40 Z" fill={FUR} {...stroke} />
      <path d="M40 -26 L39 -52 L20 -38 Z" fill={EAR_IN} />
      <defs>
        <clipPath id={clipId}>
          <path d={face} />
        </clipPath>
      </defs>
      <path d={face} fill={FUR} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx={-34} cy={-30} rx={34} ry={26} fill={PATCH} />
        <ellipse cx={-40} cy={-38} rx={14} ry={10} fill={PATCH_DARK} opacity={0.55} />
        <ellipse cx={40} cy={-40} rx={18} ry={12} fill={PATCH} />
      </g>
      <path d={face} fill="none" {...stroke} />
      {/* olhos felizes */}
      <path d="M-26 4 Q-18 -5 -10 4" fill="none" {...stroke} strokeWidth={3.4} />
      {wink ? <path d="M10 2 L26 2" fill="none" {...stroke} strokeWidth={3.4} /> : <path d="M10 4 Q18 -5 26 4" fill="none" {...stroke} strokeWidth={3.4} />}
      {/* bochechas */}
      <ellipse cx={-32} cy={18} rx={9} ry={5.5} fill={BLUSH} opacity={0.75} />
      <ellipse cx={32} cy={18} rx={9} ry={5.5} fill={BLUSH} opacity={0.75} />
      {/* nariz e boca */}
      <path d="M-4 11 Q0 9 4 11 Q2 15 0 15 Q-2 15 -4 11Z" fill={PINK_DEEP} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M0 15 Q-2 21 -8 20 M0 15 Q2 21 8 20" fill="none" {...stroke} strokeWidth={2.4} />
      {/* bigodes */}
      <path d="M-46 12 L-60 10 M-46 18 L-59 20 M46 12 L60 10 M46 18 L59 20" fill="none" {...stroke} strokeWidth={2} opacity={0.7} />
    </g>
  );
}

function Books() {
  return (
    <g>
      <rect x={22} y={146} width={196} height={30} rx={9} fill={PINK} {...stroke} />
      <rect x={190} y={151} width={22} height={20} rx={4} fill="#FFF6F9" />
      <path d="M194 156 H208 M194 161 H208 M194 166 H208" stroke="#F3C6D5" strokeWidth={1.6} />
      <rect x={34} y={118} width={176} height={30} rx={9} fill={LILAC} {...stroke} />
      <rect x={38} y={123} width={20} height={20} rx={4} fill="#F4EEFF" />
      <path d="M42 128 H54 M42 133 H54 M42 138 H54" stroke="#D9CCF7" strokeWidth={1.6} />
      <rect x={26} y={92} width={184} height={28} rx={9} fill="#F9C3D3" {...stroke} />
      <rect x={182} y={97} width={22} height={18} rx={4} fill="#FFF6F9" />
      <path d="M90 92 V120" stroke={PINK_DEEP} strokeWidth={6} opacity={0.5} />
    </g>
  );
}

function Pose({ pose, uid }: { pose: MascotPose; uid: string }) {
  const clip = `mimo-face-${uid}`;
  switch (pose) {
    case 'books':
      return (
        <svg viewBox="0 0 240 190">
          <Books />
          {/* corpo deitado */}
          <path d="M96 94 C96 58 150 50 188 60 C214 66 222 86 210 94 Z" fill={FUR} {...stroke} />
          <ellipse cx={170} cy={68} rx={18} ry={11} fill={PATCH} opacity={0.9} />
          <path d="M206 82 C228 76 232 52 218 44" fill="none" {...stroke} strokeWidth={9} stroke={INK} />
          <path d="M206 82 C228 76 232 52 218 44" fill="none" stroke={PATCH} strokeWidth={5} strokeLinecap="round" />
          <g transform="translate(86 60) scale(0.78)">
            <Head clipId={clip} />
          </g>
          <ellipse cx={70} cy={95} rx={13} ry={8} fill={FUR} {...stroke} />
          <ellipse cx={102} cy={96} rx={13} ry={8} fill={FUR} {...stroke} />
          <Heart x={30} y={22} s={1.1} rotate={-14} />
          <Heart x={200} y={20} s={0.75} fill={LILAC_DEEP} rotate={12} />
          <Sparkle x={150} y={22} s={0.9} fill={PINK} />
        </svg>
      );
    case 'headphones':
      return (
        <svg viewBox="0 0 220 200">
          <path d="M58 196 C56 150 80 128 110 128 C140 128 164 150 162 196 Z" fill={FUR} {...stroke} />
          <ellipse cx={96} cy={158} rx={16} ry={12} fill={PATCH} opacity={0.85} />
          <g transform="translate(110 92)">
            <Head clipId={clip} />
            <path d="M-62 4 C-66 -66 66 -66 62 4" fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
            <path d="M-62 4 C-66 -66 66 -66 62 4" fill="none" stroke={LILAC} strokeWidth={8} strokeLinecap="round" />
            <rect x={-74} y={-14} width={22} height={38} rx={10} fill={PINK} {...stroke} />
            <rect x={52} y={-14} width={22} height={38} rx={10} fill={PINK} {...stroke} />
          </g>
          <path d="M86 170 Q88 182 98 182 M134 170 Q132 182 122 182" fill="none" {...stroke} />
          <path d="M184 40 l0 0" />
          <text x={176} y={46} fontSize={22} fill={LILAC_DEEP} fontFamily="sans-serif">♪</text>
          <text x={22} y={70} fontSize={18} fill={PINK_DEEP} fontFamily="sans-serif">♫</text>
          <Heart x={190} y={110} s={0.8} />
          <Sparkle x={34} y={28} s={1} fill={PINK} />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 220 210">
          <path d="M56 206 C50 150 78 124 110 124 C142 124 170 150 164 206 Z" fill={FUR} {...stroke} />
          <ellipse cx={136} cy={186} rx={18} ry={12} fill={PATCH} opacity={0.85} />
          <path d="M172 196 C204 190 210 160 196 148" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M172 196 C204 190 210 160 196 148" fill="none" stroke={PATCH} strokeWidth={5} strokeLinecap="round" />
          <g transform="translate(110 84)">
            <Head clipId={clip} />
          </g>
          <Heart x={110} y={144} s={3} fill={PINK} />
          <ellipse cx={80} cy={164} rx={13} ry={10} fill={FUR} {...stroke} />
          <ellipse cx={140} cy={164} rx={13} ry={10} fill={FUR} {...stroke} />
          <Heart x={30} y={40} s={1} rotate={-16} />
          <Heart x={188} y={34} s={1.2} fill={LILAC} rotate={14} />
          <Heart x={22} y={120} s={0.7} fill={LILAC_DEEP} />
        </svg>
      );
    case 'cheer':
      return (
        <svg viewBox="0 0 220 210">
          <path d="M58 206 C52 152 80 126 110 126 C140 126 168 152 162 206 Z" fill={FUR} {...stroke} />
          <ellipse cx={92} cy={180} rx={16} ry={12} fill={PATCH} opacity={0.85} />
          <path d="M150 150 C168 132 176 112 172 96" fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
          <path d="M150 150 C168 132 176 112 172 96" fill="none" stroke={FUR} strokeWidth={16} strokeLinecap="round" />
          <g transform="translate(104 86)">
            <Head clipId={clip} wink />
          </g>
          <path d="M172 58 l5 11 12 2 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -2z" fill="#FFD66B" {...stroke} strokeWidth={2.4} />
          <ellipse cx={86} cy={168} rx={13} ry={10} fill={FUR} {...stroke} />
          <Sparkle x={196} y={36} s={1.1} fill="#FFD66B" />
          <Sparkle x={150} y={30} s={0.7} fill={PINK} />
          <Heart x={26} y={56} s={0.9} />
        </svg>
      );
    case 'face':
    default:
      return (
        <svg viewBox="-70 -72 140 124">
          <Head clipId={clip} />
        </svg>
      );
  }
}

interface MascotProps {
  pose?: MascotPose;
  className?: string;
  /** Texto alternativo (omitido = decorativo). */
  label?: string;
  children?: ReactNode;
}

export function Mascot({ pose = 'face', className, label }: MascotProps) {
  const uid = useId().replace(/:/g, '');
  return (
    <span className={cn('inline-block [&>svg]:h-full [&>svg]:w-full', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Pose pose={pose} uid={uid} />
    </span>
  );
}
