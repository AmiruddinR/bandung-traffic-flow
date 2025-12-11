import { Activity, AlertCircle, CheckCircle, Clock, Video, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Hls from "hls.js";

const StatusPanel = () => {
  const [time, setTime] = useState(new Date());
  const [manualOverride, setManualOverride] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // HLS stream for Buah Batu CCTV
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = "https://atcs-dishub.bandung.go.id:1990/Buahbatu/stream.m3u8";

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS support
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, []);

  const handleOverrideToggle = (checked: boolean) => {
    setManualOverride(checked);
    toast({
      title: checked ? "Manual Override Enabled" : "Manual Override Disabled",
      description: checked
        ? "System control transferred to operator."
        : "AI adaptive control resumed.",
      variant: checked ? "destructive" : "default",
    });
  };

  const handleForceRed = () => {
    toast({
      title: "Force Red Activated",
      description: "All traffic lights set to RED. Emergency stop initiated.",
      variant: "destructive",
    });
  };

  const handleForceGreen = () => {
    toast({
      title: "Force Green Activated",
      description: "Selected intersection set to GREEN. Use with caution.",
    });
  };

  const handleResetAI = () => {
    setManualOverride(false);
    toast({
      title: "AI Mode Reset",
      description: "Adaptive AI control restored. System recalibrating...",
    });
  };
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

      {/* CCTV Feeds Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">CCTV Live Feeds</h3>
        </div>
        
        <Card className="bg-secondary border-glow p-3 space-y-2">
          <div className="relative aspect-video bg-background/50 rounded overflow-hidden border border-primary/30">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Video className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">CCTV Cam 1: Samsat</p>
              </div>
            </div>
            <div className="absolute top-2 left-2 bg-destructive/90 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white">LIVE</span>
            </div>
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-[10px] font-mono text-foreground">
                {time.toLocaleTimeString()}
              </span>
            </div>
            {/* Simulated video feed effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px)',
            }} />
          </div>
        </Card>

        <Card className="bg-secondary border-glow p-3 space-y-2">
          <div className="relative aspect-video bg-background/50 rounded overflow-hidden border border-primary/30">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="absolute top-2 left-2 bg-destructive/90 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white">LIVE</span>
            </div>
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-[10px] font-mono text-foreground">
                {time.toLocaleTimeString()}
              </span>
            </div>
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-[10px] font-semibold text-foreground">CCTV Cam 2: Buah Batu</span>
            </div>
          </div>
        </Card>
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

      {/* Manual Override Section */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Manual Override</h3>
        </div>
        
        <div className="bg-secondary/50 border border-border/30 rounded-lg p-3 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="override-switch" className="text-xs font-medium text-foreground">
              Operator Control
            </Label>
            <Switch
              id="override-switch"
              checked={manualOverride}
              onCheckedChange={handleOverrideToggle}
            />
          </div>

          {manualOverride && (
            <div className="space-y-2 pt-2 border-t border-border/30 animate-fade-in">
              <p className="text-[10px] text-destructive font-semibold uppercase mb-2">
                ⚠ Emergency Controls Active
              </p>
              <Button
                onClick={handleForceRed}
                variant="destructive"
                size="sm"
                className="w-full text-xs"
              >
                Force Red
              </Button>
              <Button
                onClick={handleForceGreen}
                size="sm"
                className="w-full text-xs bg-success hover:bg-success/90 text-success-foreground"
              >
                Force Green
              </Button>
              <Button
                onClick={handleResetAI}
                variant="outline"
                size="sm"
                className="w-full text-xs border-primary text-primary hover:bg-primary/10"
              >
                Reset AI Mode
              </Button>
            </div>
          )}

          {!manualOverride && (
            <p className="text-[10px] text-muted-foreground italic">
              AI adaptive control is active
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default StatusPanel;
