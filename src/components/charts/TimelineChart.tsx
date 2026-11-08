import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '@/constants/app';
import type { TimelinePoint } from '@/utils/statistics';
import { ChartTooltip } from './ChartTooltip';
import { Legend } from './ChartFrame';

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
} as const;

/** Identificados × superados acumulados (mesma unidade, um único eixo). */
export function CumulativeChart({ data, height = 240 }: { data: TimelinePoint[]; height?: number }) {
  return (
    <div className="space-y-3">
      <Legend
        items={[
          { label: 'Dificuldades identificadas', color: CHART_COLORS.primary },
          { label: 'Dificuldades superadas', color: CHART_COLORS.resolved },
        ]}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={CHART_COLORS.primary} stopOpacity={0.14} />
                <stop offset="1" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={CHART_COLORS.resolved} stopOpacity={0.12} />
                <stop offset="1" stopColor={CHART_COLORS.resolved} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} allowDecimals={false} width={44} />
            <Tooltip cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }} content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulativeCreated"
              name="Identificadas"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#grad-created)"
              dot={false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cumulativeResolved"
              name="Superadas"
              stroke={CHART_COLORS.resolved}
              strokeWidth={2}
              fill="url(#grad-resolved)"
              dot={false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Colunas por período de uma única série (registros ou superados). */
export function PeriodColumns({
  data,
  dataKey,
  name,
  color,
  height = 220,
}: {
  data: TimelinePoint[];
  dataKey: 'created' | 'resolved';
  name: string;
  color: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" {...axisProps} minTickGap={12} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: 'rgb(var(--c-blush))', opacity: 0.6 }} content={<ChartTooltip />} />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
