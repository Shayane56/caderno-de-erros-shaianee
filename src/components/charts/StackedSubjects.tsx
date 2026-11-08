import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '@/constants/app';
import type { GroupCount } from '@/utils/statistics';
import { ChartTooltip } from './ChartTooltip';
import { Legend } from './ChartFrame';

/** Pendentes × superados por matéria (barras empilhadas com 2px de respiro). */
export function StackedSubjects({ groups, labelWidth = 128 }: { groups: GroupCount[]; labelWidth?: number }) {
  const data = groups.map((g) => ({ name: g.name, pendentes: g.pending, superados: g.superado }));
  const height = data.length * 38 + 16;
  const maxChars = Math.max(10, Math.floor((labelWidth - 8) / 7.4));
  return (
    <div className="space-y-3">
      <Legend
        items={[
          { label: 'Pendentes (alta + média)', color: CHART_COLORS.primary },
          { label: 'Superados', color: CHART_COLORS.resolved },
        ]}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={labelWidth}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              tickFormatter={(v: string) => (v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v)}
            />
            <Tooltip cursor={{ fill: 'rgb(var(--c-blush))', opacity: 0.6 }} content={<ChartTooltip />} />
            <Bar dataKey="pendentes" name="Pendentes" stackId="s" fill={CHART_COLORS.primary} stroke="rgb(var(--c-surface))" strokeWidth={2} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="superados" name="Superados" stackId="s" fill={CHART_COLORS.resolved} stroke="rgb(var(--c-surface))" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
