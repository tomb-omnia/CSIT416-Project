// Small single-series column chart (UC14, UC24). One hue (accent, validated), so no legend:
// the card title names the series. Thin 24px columns, 4px rounded tops, hairline solid grid,
// value labels on caps, hover tooltip. Each page also shows the same numbers in a table.

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function SimpleBarChart({ data, unit = '', height = 220, label }: { data: { name: string; value: number }[]; unit?: string; height?: number; label: string }) {
  return (
    <figure aria-label={label} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeWidth={1} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#475569', fontSize: 12 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={40} allowDecimals={false} unit={unit} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => [`${v}${unit}`, label]} contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <Bar dataKey="value" fill="#2557e8" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" formatter={(v) => `${v}${unit}`} style={{ fill: '#334155', fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
