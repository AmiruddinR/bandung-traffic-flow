import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useTraffic, LogEntry } from "@/contexts/TrafficContext";

const AIDecisionLog = () => {
  // Consume logs from traffic context
  const { logs } = useTraffic();

  const getIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "reward":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "punishment":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "reward":
        return "text-success";
      case "punishment":
        return "text-destructive";
      case "alert":
        return "text-primary";
    }
  };

  return (
    <Card className="h-full bg-card border-border/50 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">AI Decision Log</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Real-time reinforcement learning decisions
      </p>

      <ScrollArea className="flex-1 pr-3">
        <div className="space-y-3">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="bg-secondary/50 border border-border/30 rounded-lg p-3 transition-all duration-300"
              style={{
                animation: index === 0 ? "fade-in 0.5s ease-out" : undefined,
              }}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getIcon(log.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {log.timestamp}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${getTypeColor(
                        log.type
                      )}`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {log.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total Decisions</span>
        <span className="text-xs font-bold text-primary">{logs.length}</span>
      </div>
    </Card>
  );
};

export default AIDecisionLog;
