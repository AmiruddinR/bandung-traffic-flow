import Sidebar from "@/components/Sidebar";
import TrafficMap from "@/components/TrafficMap";
import StatusPanel from "@/components/StatusPanel";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar activeItem="monitoring" />
      <TrafficMap />
      <StatusPanel />
    </div>
  );
};

export default Index;
