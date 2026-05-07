import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function ChartComponent({ data }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-[#6B7280]">
        No chart data — check API or symbol.
      </div>
    );
  }

  return (
    <div className="h-[min(360px,50vh)] w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="price"
            stroke="#00FFB2"
            tick={{ fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="sent"
            orientation="right"
            stroke="#FACC15"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#121826",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12
            }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="Price"
            stroke="#00FFB2"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="sent"
            type="monotone"
            dataKey="sentiment"
            name="Sentiment"
            stroke="#FACC15"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
