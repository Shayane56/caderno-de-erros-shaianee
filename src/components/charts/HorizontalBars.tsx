import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '@/constants/app';
import { ChartTooltip } from './ChartTooltip';

export interface BarDatum {
  name: string;
  value: number;
  fill?: string;
  hint?: string;
}

interface HorizontalBarsProps {
  data: BarDatum[];
  seriesName: string;
  color?: string;
  /** Largura reservada aos rótulos do eixo Y. */
  labelWidth?: number;
}

const ROW = 38;

function truncateLabel(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Barras horizontais ordenadas: uma série = uma cor; cores por entidade quando `fill` é informado. */
export function HorizontalBars({ data, seriesName, color = CHART_COLORS.primary, labelWidth = 128 }: HorizontalBarsProps) {
  const height = data.length * ROW + 16;
  const maxChars = Math.max(10, Math.floor((labelWidth - 8) / 7.4));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 4 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" hide allowDecimals={false} domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            tickFormatter={(v: string) => truncateLabel(v, maxChars)}
          />
          <Tooltip
            cursor={{ fill: 'rgb(var(--c-blush))', opacity: 0.6 }}
            content={<ChartTooltip title={(_l, p) => String(p[0]?.payload?.hint ?? p[0]?.payload?.name ?? '')} />}
          />
          <Bar dataKey="value" name={seriesName} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill ?? color} />
            ))}
            <LabelList dataKey="value" position="right" offset={8} style={{ fill: CHART_COLORS.text, fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
