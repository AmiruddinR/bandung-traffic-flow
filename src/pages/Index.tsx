import Sidebar from "@/components/Sidebar";
import TrafficMap from "@/components/TrafficMap";
import StatusPanel from "@/components/StatusPanel";
import QueueDensityChart from "@/components/QueueDensityChart";
import AIDecisionLog from "@/components/AIDecisionLog";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar activeItem="monitoring" />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 relative min-h-0" style={{ minHeight: '400px' }}>
          <TrafficMap />
        </div>
        <div className="h-[400px] border-t border-border/50 overflow-hidden flex">
          <div className="flex-1 p-4 bg-background overflow-y-auto">
            <QueueDensityChart />
          </div>
          <div className="w-96 p-4 bg-background border-l border-border/50">
            <AIDecisionLog />
          </div>
        </div>
      </div>
      <StatusPanel />
    </div>
  );
};

export default Index;
