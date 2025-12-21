import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// --- TYPES ---
export type LightColor = "red" | "yellow" | "green";
export type SystemMode = "default" | "ml" | "manual";
export type DensityLevel = "flowing" | "moderate" | "congested";
export type ManualOverrideType = "red" | "green" | null;

export interface DirectionState {
  color: LightColor;
  timer: number;
}

export interface IntersectionState {
  north: DirectionState;
  south: DirectionState;
  east: DirectionState;
  west: DirectionState;
}

export interface TrafficMetrics {
  vehicles: number;
  avgSpeed: string;
  waitTime: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  type: "reward" | "punishment" | "alert";
  message: string;
}

interface TrafficContextType {
  // Mode control
  systemMode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
  manualOverride: ManualOverrideType;
  
  // Traffic light states
  samsatLights: IntersectionState;
  bubatLights: IntersectionState;
  
  // Density levels
  samsatDensity: DensityLevel;
  bubatDensity: DensityLevel;
  
  // Traffic metrics
  samsatMetrics: TrafficMetrics;
  bubatMetrics: TrafficMetrics;
  
  // AI Logs
  logs: LogEntry[];
  
  // Actions
  triggerManualOverride: (type: "red" | "green") => void;
  resetToAI: () => void;
}

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

// --- HELPER FUNCTIONS ---
const getTimestamp = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
};

const calculateDensity = (vehicles: number): DensityLevel => {
  if (vehicles < 40) return "flowing";
  if (vehicles <= 70) return "moderate";
  return "congested";
};

const getGreenDuration = (density: DensityLevel, isML: boolean): number => {
  if (!isML) return 30; // Default fixed cycle
  switch (density) {
    case "flowing": return 20;
    case "moderate": return 30;
    case "congested": return 45;
  }
};

const getRedDuration = (density: DensityLevel, isML: boolean, holdingTraffic: boolean): number => {
  const base = isML ? (density === "flowing" ? 40 : density === "moderate" ? 50 : 60) : 60;
  return holdingTraffic ? base + 15 : base;
};

// --- PROVIDER ---
export const TrafficProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemMode, setSystemModeInternal] = useState<SystemMode>("ml");
  const [manualOverride, setManualOverride] = useState<ManualOverrideType>(null);
  
  // Traffic light states
  const [samsatLights, setSamsatLights] = useState<IntersectionState>({
    north: { color: "green", timer: 30 },
    south: { color: "green", timer: 30 },
    east: { color: "red", timer: 65 },
    west: { color: "red", timer: 65 },
  });

  const [bubatLights, setBubatLights] = useState<IntersectionState>({
    north: { color: "red", timer: 45 },
    south: { color: "red", timer: 45 },
    east: { color: "green", timer: 20 },
    west: { color: "green", timer: 20 },
  });

  // Simulated vehicle counts (fluctuating)
  const [samsatVehicles, setSamsatVehicles] = useState(45);
  const [bubatVehicles, setBubatVehicles] = useState(67);
  
  // Previous queue lengths for reward/punishment
  const prevSamsatQueue = useRef(45);
  const prevBubatQueue = useRef(67);

  // AI Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      timestamp: getTimestamp(),
      type: "alert",
      message: "System initialized in ML Optimized mode.",
    },
  ]);

  // Derived densities
  const samsatDensity = calculateDensity(samsatVehicles);
  const bubatDensity = calculateDensity(bubatVehicles);

  // Derived metrics
  const samsatMetrics: TrafficMetrics = {
    vehicles: samsatVehicles,
    avgSpeed: samsatDensity === "flowing" ? "38 km/h" : samsatDensity === "moderate" ? "25 km/h" : "12 km/h",
    waitTime: samsatDensity === "flowing" ? "8s" : samsatDensity === "moderate" ? "18s" : "35s",
  };

  const bubatMetrics: TrafficMetrics = {
    vehicles: bubatVehicles,
    avgSpeed: bubatDensity === "flowing" ? "35 km/h" : bubatDensity === "moderate" ? "22 km/h" : "10 km/h",
    waitTime: bubatDensity === "flowing" ? "10s" : bubatDensity === "moderate" ? "22s" : "42s",
  };

  // Add log helper
  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs(prev => [
      { id: Date.now(), timestamp: getTimestamp(), type, message },
      ...prev.slice(0, 29), // Keep last 30 entries
    ]);
  }, []);

  // Mode change handler
  const setSystemMode = useCallback((mode: SystemMode) => {
    setSystemModeInternal(mode);
    if (mode !== "manual") {
      setManualOverride(null);
    }
    addLog("alert", `System switched to ${mode === "default" ? "Default (Fixed Cycle)" : mode === "ml" ? "ML Optimized (Adaptive)" : "Manual Override"} mode.`);
  }, [addLog]);

  // Manual override actions
  const triggerManualOverride = useCallback((type: "red" | "green") => {
    setSystemModeInternal("manual");
    setManualOverride(type);
    
    const allColor: LightColor = type;
    const manualState: IntersectionState = {
      north: { color: allColor, timer: 0 },
      south: { color: allColor, timer: 0 },
      east: { color: allColor, timer: 0 },
      west: { color: allColor, timer: 0 },
    };
    
    setSamsatLights(manualState);
    setBubatLights(manualState);
    addLog("alert", `Manual Override: All lights forced to ${type.toUpperCase()}.`);
  }, [addLog]);

  const resetToAI = useCallback(() => {
    setSystemModeInternal("ml");
    setManualOverride(null);
    
    // Reset to initial ML states
    setSamsatLights({
      north: { color: "green", timer: 30 },
      south: { color: "green", timer: 30 },
      east: { color: "red", timer: 65 },
      west: { color: "red", timer: 65 },
    });
    setBubatLights({
      north: { color: "red", timer: 45 },
      south: { color: "red", timer: 45 },
      east: { color: "green", timer: 20 },
      west: { color: "green", timer: 20 },
    });
    
    addLog("alert", "AI Mode restored. System recalibrating...");
  }, [addLog]);

  // --- TRAFFIC SIMULATION (Vehicle count fluctuation) ---
  useEffect(() => {
    if (systemMode === "manual") return;

    const interval = setInterval(() => {
      // Simulate vehicle count changes
      setSamsatVehicles(prev => {
        const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
        return Math.max(15, Math.min(95, prev + change));
      });
      setBubatVehicles(prev => {
        const change = Math.floor(Math.random() * 21) - 10;
        return Math.max(15, Math.min(95, prev + change));
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [systemMode]);

  // --- MAIN TRAFFIC LIGHT LOGIC ---
  useEffect(() => {
    if (systemMode === "manual") return;

    const isML = systemMode === "ml";

    const interval = setInterval(() => {
      // Update Samsat lights
      setSamsatLights(prev => {
        const next = { ...prev };
        const dirs = ["north", "south", "east", "west"] as const;
        
        // Decrement timers
        dirs.forEach(dir => {
          if (next[dir].timer > 0) next[dir].timer -= 1;
        });

        // Phase transition when timer hits 0
        if (next.north.timer === 0) {
          const isNorthGreen = next.north.color === "green";
          const newDensity = calculateDensity(samsatVehicles);
          
          // Calculate new durations based on mode
          const greenDur = getGreenDuration(newDensity, isML);
          const redDur = getRedDuration(newDensity, isML, false);

          next.north.color = isNorthGreen ? "red" : "green";
          next.south.color = isNorthGreen ? "red" : "green";
          next.east.color = isNorthGreen ? "green" : "red";
          next.west.color = isNorthGreen ? "green" : "red";
          
          next.north.timer = isNorthGreen ? redDur : greenDur;
          next.south.timer = isNorthGreen ? redDur : greenDur;
          next.east.timer = isNorthGreen ? greenDur : redDur;
          next.west.timer = isNorthGreen ? greenDur : redDur;

          // Log ML decision
          if (isML && !isNorthGreen) {
            addLog("reward", `Samsat N-S green extended to ${greenDur}s (density: ${newDensity}).`);
          }
        }

        return next;
      });

      // Update Bubat lights with Samsat coordination
      setBubatLights(prev => {
        const next = { ...prev };
        const dirs = ["north", "south", "east", "west"] as const;
        
        dirs.forEach(dir => {
          if (next[dir].timer > 0) next[dir].timer -= 1;
        });

        if (next.north.timer === 0) {
          const isNorthGreen = next.north.color === "green";
          const newDensity = calculateDensity(bubatVehicles);
          
          // Check if Samsat is congested - hold Bubat traffic
          const holdingTraffic = isML && samsatDensity === "congested";
          
          const greenDur = getGreenDuration(newDensity, isML);
          const redDur = getRedDuration(newDensity, isML, holdingTraffic);

          next.north.color = isNorthGreen ? "red" : "green";
          next.south.color = isNorthGreen ? "red" : "green";
          next.east.color = isNorthGreen ? "green" : "red";
          next.west.color = isNorthGreen ? "green" : "red";
          
          next.north.timer = isNorthGreen ? redDur : greenDur;
          next.south.timer = isNorthGreen ? redDur : greenDur;
          next.east.timer = isNorthGreen ? greenDur : redDur;
          next.west.timer = isNorthGreen ? greenDur : redDur;

          // Log coordination decision
          if (holdingTraffic) {
            addLog("alert", `Coordination: Samsat congested → Bubat red extended +15s (holding traffic).`);
          } else if (isML && !isNorthGreen) {
            addLog("reward", `Bubat E-W green set to ${greenDur}s (density: ${newDensity}).`);
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [systemMode, samsatVehicles, bubatVehicles, samsatDensity, addLog]);

  // --- REWARD/PUNISHMENT LOGIC ---
  useEffect(() => {
    if (systemMode !== "ml") return;

    const interval = setInterval(() => {
      // Compare with previous queue lengths
      const samsatDelta = prevSamsatQueue.current - samsatVehicles;
      const bubatDelta = prevBubatQueue.current - bubatVehicles;

      if (samsatDelta > 5) {
        const percent = Math.round((samsatDelta / prevSamsatQueue.current) * 100);
        addLog("reward", `Samsat queue reduced by ${percent}% → Timing strategy effective.`);
      } else if (samsatDelta < -8) {
        addLog("punishment", `Samsat queue increased → Adjusting phase timing...`);
      }

      if (bubatDelta > 5) {
        const percent = Math.round((bubatDelta / prevBubatQueue.current) * 100);
        addLog("reward", `Buah Batu flow improved by ${percent}% → Optimal timing maintained.`);
      } else if (bubatDelta < -8) {
        addLog("punishment", `Buah Batu congestion rising → Recalculating cycles...`);
      }

      prevSamsatQueue.current = samsatVehicles;
      prevBubatQueue.current = bubatVehicles;
    }, 8000);

    return () => clearInterval(interval);
  }, [systemMode, samsatVehicles, bubatVehicles, addLog]);

  const value: TrafficContextType = {
    systemMode,
    setSystemMode,
    manualOverride,
    samsatLights,
    bubatLights,
    samsatDensity,
    bubatDensity,
    samsatMetrics,
    bubatMetrics,
    logs,
    triggerManualOverride,
    resetToAI,
  };

  return (
    <TrafficContext.Provider value={value}>
      {children}
    </TrafficContext.Provider>
  );
};

export const useTraffic = () => {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error("useTraffic must be used within a TrafficProvider");
  }
  return context;
};
