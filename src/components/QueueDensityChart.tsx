import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const QueueDensityChart = () => {
  // Simulated data showing the comparison
  const data = [
    { time: "08:00", fixed: 85, adaptive: 45 },
    { time: "08:05", fixed: 92, adaptive: 48 },
    { time: "08:10", fixed: 110, adaptive: 55 },
    { time: "08:15", fixed: 125, adaptive: 62 },
    { time: "08:20", fixed: 140, adaptive: 58 },
    { time: "08:25", fixed: 135, adaptive: 52 },
    { time: "08:30", fixed: 150, adaptive: 65 },
    { time: "08:35", fixed: 145, adaptive: 60 },
    { time: "08:40", fixed: 155, adaptive: 68 },
    { time: "08:45", fixed: 162, adaptive: 70 },
    { time: "08:50", fixed: 158, adaptive: 66 },
    { time: "08:55", fixed: 165, adaptive: 72 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/50 p-3 rounded-lg shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-1">{payload[0].payload.time}</p>
          <p className="text-xs text-destructive">
            Fixed Time: <span className="font-bold">{payload[0].value}m</span>
          </p>
          <p className="text-xs text-success">
            Adaptive AI: <span className="font-bold">{payload[1].value}m</span>
          </p>
          <p className="text-xs text-primary mt-1">
            Improvement: <span className="font-bold">
              {((payload[0].value - payload[1].value) / payload[0].value * 100).toFixed(0)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border/50 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-1">Queue Density Comparison</h3>
        <p className="text-xs text-muted-foreground">Real-time queue length analysis (meters)</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: "11px" }}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: "11px" }}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Queue Length (m)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "11px", fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="fixed"
            name="Fixed Time (Legacy)"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--destructive))", r: 3 }}
            activeDot={{ r: 5, fill: "hsl(var(--destructive))" }}
          />
          <Line
            type="monotone"
            dataKey="adaptive"
            name="Adaptive AI (Our Solution)"
            stroke="hsl(var(--success))"
            strokeWidth={3}
            dot={{ fill: "hsl(var(--success))", r: 4 }}
            activeDot={{ r: 6, fill: "hsl(var(--success))" }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-secondary/50 rounded p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase mb-1">Avg Reduction</p>
          <p className="text-lg font-bold text-success">58%</p>
        </div>
        <div className="bg-secondary/50 rounded p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase mb-1">Time Saved</p>
          <p className="text-lg font-bold text-primary">4.2 min</p>
        </div>
        <div className="bg-secondary/50 rounded p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase mb-1">Efficiency</p>
          <p className="text-lg font-bold text-foreground">+142%</p>
        </div>
      </div>
    </Card>
  );
};

export default QueueDensityChart;
