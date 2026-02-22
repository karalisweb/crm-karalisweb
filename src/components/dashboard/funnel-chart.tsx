"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FunnelData {
  name: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelData[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Nessun dato da visualizzare
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
        barCategoryGap="20%"
      >
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={90}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#132032",
            border: "1px solid #2a2a35",
            borderRadius: "8px",
            color: "#f5f5f7",
            fontSize: "12px",
          }}
          formatter={(value) => [value, "Lead"]}
          cursor={{ fill: "rgba(212, 167, 38, 0.05)" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
