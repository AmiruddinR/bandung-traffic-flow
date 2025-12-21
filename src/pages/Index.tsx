import Sidebar from "@/components/Sidebar";
import TrafficMap from "@/components/TrafficMap";
import StatusPanel from "@/components/StatusPanel";
import AIDecisionLog from "@/components/AIDecisionLog";
import { TrafficProvider } from "@/contexts/TrafficContext";

const Index = () => {
  return (
    <TrafficProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar activeItem="monitoring" />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 relative min-h-0" style={{ minHeight: '400px' }}>
            <TrafficMap />
          </div>
          <div className="h-[400px] border-t border-border/50 overflow-hidden">
            <div className="h-full p-4 bg-background overflow-y-auto">
              <AIDecisionLog />
            </div>
          </div>
        </div>
        <StatusPanel />
      </div>
    </TrafficProvider>
  );
};

export default Index;
