import Sidebar from "@/components/Sidebar";
import TrafficMap from "@/components/TrafficMap";
import StatusPanel from "@/components/StatusPanel";
import QueueDensityChart from "@/components/QueueDensityChart";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar activeItem="monitoring" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 relative">
          <TrafficMap />
        </div>
        <div className="h-[400px] border-t border-border/50 overflow-y-auto p-4 bg-background">
          <QueueDensityChart />
        </div>
      </div>
      <StatusPanel />
    </div>
  );
};

export default Index;
