import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const StatusPanel = () => {
  const trafficData = [
    {
      id: 1,
      location: "Simpang Samsat Kiaracondong",
      status: "flowing",
      vehicles: 45,
      avgSpeed: "35 km/h",
      waitTime: "12s",
    },
    {
      id: 2,
      location: "Simpang Buah Batu",
      status: "moderate",
      vehicles: 67,
      avgSpeed: "22 km/h",
      waitTime: "28s",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "flowing":
        return "text-success";
      case "moderate":
        return "text-primary";
      case "congested":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "flowing":
        return <CheckCircle className="w-5 h-5" />;
      case "moderate":
        return <Activity className="w-5 h-5" />;
      case "congested":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <aside className="w-80 bg-card border-l border-border/50 p-6 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">Real-Time Status</h2>
        <p className="text-sm text-muted-foreground">Live traffic monitoring</p>
      </div>

      <div className="space-y-4">
        {trafficData.map((data) => (
          <Card key={data.id} className="p-4 bg-secondary border-glow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground leading-tight flex-1">
                {data.location}
              </h3>
              <div className={`${getStatusColor(data.status)}`}>
                {getStatusIcon(data.status)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`text-xs font-bold uppercase ${getStatusColor(data.status)}`}>
                  {data.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Vehicles</span>
                <span className="text-xs font-semibold text-foreground">{data.vehicles}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Avg Speed</span>
                <span className="text-xs font-semibold text-primary">{data.avgSpeed}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Wait Time</span>
                <span className="text-xs font-semibold text-foreground">{data.waitTime}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t border-border/50">
        <h3 className="text-sm font-bold text-foreground mb-3">System Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Traffic Sync</span>
            <span className="text-xs font-semibold text-success flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Sensors</span>
            <span className="text-xs font-semibold text-success">2/2 Online</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last Update</span>
            <span className="text-xs font-semibold text-foreground">2 sec ago</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default StatusPanel;
