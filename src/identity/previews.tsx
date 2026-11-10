import './editorial/editorial.css';
import './soft/soft.css';
import './bold/bold.css';
import { SoftLogo } from './soft/Shell';

/**
 * Prévias das identidades para a página de comparação: pequenas composições
 * desenhadas com a tipografia, a paleta e a geometria de cada proposta, usando
 * os números reais do dia.
 */
export interface PreviewData {
  name: string;
  due: number;
  streak: number;
  retention: number | null;
  week: number[];
}

export function EditorialPreview({ d }: { d: PreviewData }) {
  const max = Math.max(1, ...d.week);
  return (
    <div className="flex h-full flex-col bg-ed-paper p-5 text-ed-ink" aria-hidden>
      <div className="flex items-end justify-between border-b-2 border-ed-ink pb-1.5">
        <span className="ed-serif text-[22px] italic leading-none">Mimo</span>
        <span className="ed-kicker text-[8.5px] text-ed-graphite">A · B · C</span>
      </div>
      <p className="ed-kicker mt-4 text-[8.5px] text-ed-graphite">Hoje</p>
      <p className="ed-serif mt-1.5 text-[27px] font-light leading-[1.02] tracking-[-0.02em]">
        {d.name ? `Boa leitura, ${d.name}.` : 'Boa leitura.'}
        <br />
        <em className="text-ed-accent">{d.due ? `${d.due} cartões esperam.` : 'Tudo revisado.'}</em>
      </p>
      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-ed-ink pt-2">
        <div>
          <p className="ed-kicker text-[7.5px] text-ed-graphite">Pendentes</p>
          <p className="ed-serif text-[24px] font-light text-ed-accent">{d.due}</p>
        </div>
        <div>
          <p className="ed-kicker text-[7.5px] text-ed-graphite">Sequência</p>
          <p className="ed-serif text-[24px] font-light">{d.streak}</p>
        </div>
        <div className="flex items-end gap-[3px] pb-2">
          {d.week.map((v, i) => (
            <span key={i} className={i === d.week.length - 1 ? 'bg-ed-accent' : 'bg-ed-ink'} style={{ width: 4, height: `${4 + (v / max) * 24}px`, opacity: v ? 1 : 0.25 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SoftPreview({ d }: { d: PreviewData }) {
  const pct = d.retention ?? 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex h-full flex-col bg-sf-mist p-4 font-sf text-sf-plum" aria-hidden>
      <div className="flex items-center gap-2">
        <SoftLogo size={24} />
        <span className="text-[14px] font-semibold tracking-[-0.02em]">mimo</span>
        <span className="ml-auto flex gap-0.5 rounded-lg bg-sf-lav-50 p-0.5 text-[9px] font-semibold">
          <span className="px-1.5 py-0.5 text-sf-muted">A</span>
          <span className="rounded-md bg-white px-1.5 py-0.5 text-sf-violet">B</span>
          <span className="px-1.5 py-0.5 text-sf-muted">C</span>
        </span>
      </div>
      <div className="sf-surface mt-3 flex items-center gap-3 !rounded-[18px] p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.02em]">{d.name ? `Olá, ${d.name}` : 'Olá'}</p>
          <p className="mt-0.5 text-[10.5px] text-sf-muted">{d.due ? `${d.due} cartões para hoje` : 'Tudo em dia'}</p>
          <span className="mt-2 inline-flex h-6 items-center rounded-lg bg-sf-violet px-2.5 text-[10px] font-semibold text-white">Começar revisão</span>
        </div>
        <svg width={64} height={64} className="-rotate-90">
          <circle cx={32} cy={32} r={r} fill="none" stroke="#ECE6FC" strokeWidth={7} />
          <circle cx={32} cy={32} r={r} fill="none" stroke="#6B4FD8" strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        </svg>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <div className="sf-surface !rounded-[14px] p-2.5">
          <p className="text-[9px] font-medium text-sf-muted">Sequência</p>
          <p className="text-[16px] font-semibold">{d.streak} dias</p>
        </div>
        <div className="sf-surface !rounded-[14px] p-2.5">
          <p className="text-[9px] font-medium text-sf-muted">Retenção</p>
          <p className="text-[16px] font-semibold">{d.retention === null ? '—' : `${d.retention}%`}</p>
        </div>
      </div>
    </div>
  );
}

export function BoldPreview({ d }: { d: PreviewData }) {
  return (
    <div className="flex h-full bg-bd-bone font-bd text-bd-ink" aria-hidden>
      <div className="flex w-9 flex-col items-center gap-2 bg-bd-ink py-2.5">
        <span className="bd-black flex h-6 w-6 items-center justify-center bg-bd-uv text-[13px] text-white">M</span>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i === 0 ? 'h-5 w-full bg-bd-uv' : 'h-5 w-3 border-2 border-bd-bone/40'} />
        ))}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden p-3.5">
        <span className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-bd-lav" />
        <p className="bd-mono relative text-[8px] text-bd-grey">Para hoje</p>
        <p className="bd-black relative mt-1 text-[78px]">{d.due}</p>
        <p className="bd-wide relative mt-1 text-[12px] uppercase">cartões</p>
        <div className="relative mt-auto flex gap-1.5">
          <span className="bd-wide flex h-8 flex-1 items-center justify-between bg-bd-uv px-2 text-[10px] uppercase text-white">
            Revisar agora <span>→</span>
          </span>
          <span className="bd-black flex h-8 w-8 items-center justify-center rounded-full border-2 border-bd-ink bg-bd-signal text-[12px]">{d.streak}</span>
        </div>
      </div>
    </div>
  );
}
