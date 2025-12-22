import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// --- TYPES ---
export type LightColor = "red" | "yellow" | "green";
export type SystemMode = "default" | "ml" | "manual";
export type DensityLevel = "flowing" | "moderate" | "congested";
export type ManualOverrideType = "red" | "green" | null;

// Phase-based state machine
export type TrafficPhase = "NS_GREEN" | "NS_YELLOW" | "EW_GREEN" | "EW_YELLOW";

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

// Phase state for each intersection
interface PhaseState {
  phase: TrafficPhase;
  timer: number;
  greenDuration: number; // Dynamic duration for current green phase
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
  if (vehicles <= 80) return "moderate";
  return "congested";
};

// Adaptive green duration based on vehicle count
const getAdaptiveGreenDuration = (vehicles: number, isML: boolean): number => {
  if (!isML) return 30; // Default fixed cycle: 30s
  if (vehicles < 40) return 20;  // Sepi
  if (vehicles <= 80) return 40; // Sedang
  return 60; // Macet
};

const YELLOW_DURATION = 5; // Fixed 5s yellow

// Convert phase to light colors
const phaseToLights = (phase: TrafficPhase, timer: number): IntersectionState => {
  switch (phase) {
    case "NS_GREEN":
      return {
        north: { color: "green", timer },
        south: { color: "green", timer },
        east: { color: "red", timer },
        west: { color: "red", timer },
      };
    case "NS_YELLOW":
      return {
        north: { color: "yellow", timer },
        south: { color: "yellow", timer },
        east: { color: "red", timer },
        west: { color: "red", timer },
      };
    case "EW_GREEN":
      return {
        north: { color: "red", timer },
        south: { color: "red", timer },
        east: { color: "green", timer },
        west: { color: "green", timer },
      };
    case "EW_YELLOW":
      return {
        north: { color: "red", timer },
        south: { color: "red", timer },
        east: { color: "yellow", timer },
        west: { color: "yellow", timer },
      };
  }
};

// Get next phase in sequence
const getNextPhase = (current: TrafficPhase): TrafficPhase => {
  const sequence: TrafficPhase[] = ["NS_GREEN", "NS_YELLOW", "EW_GREEN", "EW_YELLOW"];
  const idx = sequence.indexOf(current);
  return sequence[(idx + 1) % 4];
};

// --- PROVIDER ---
export const TrafficProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemMode, setSystemModeInternal] = useState<SystemMode>("ml");
  const [manualOverride, setManualOverride] = useState<ManualOverrideType>(null);
  
  // Simulated vehicle counts (mock sensors)
  const [samsatVehicles, setSamsatVehicles] = useState(55);
  const [bubatVehicles, setBubatVehicles] = useState(45);
  
  // Phase states for each intersection
  const [samsatPhase, setSamsatPhase] = useState<PhaseState>({
    phase: "NS_GREEN",
    timer: 30,
    greenDuration: 30,
  });
  
  const [bubatPhase, setBubatPhase] = useState<PhaseState>({
    phase: "EW_GREEN",
    timer: 30,
    greenDuration: 30,
  });

  // AI Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      timestamp: getTimestamp(),
      type: "alert",
      message: "System initialized. Rule-Based AI active.",
    },
  ]);

  // Derived densities
  const samsatDensity = calculateDensity(samsatVehicles);
  const bubatDensity = calculateDensity(bubatVehicles);

  // Convert phase states to light states for rendering
  const samsatLights = phaseToLights(samsatPhase.phase, samsatPhase.timer);
  const bubatLights = phaseToLights(bubatPhase.phase, bubatPhase.timer);

  // Derived metrics based on density
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
      ...prev.slice(0, 49), // Keep last 50 entries
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
    addLog("alert", `Manual Override: All lights forced to ${type.toUpperCase()}.`);
  }, [addLog]);

  const resetToAI = useCallback(() => {
    setSystemModeInternal("ml");
    setManualOverride(null);
    
    // Reset phases with fresh adaptive durations
    const samsatGreen = getAdaptiveGreenDuration(samsatVehicles, true);
    const bubatGreen = getAdaptiveGreenDuration(bubatVehicles, true);
    
    setSamsatPhase({
      phase: "NS_GREEN",
      timer: samsatGreen,
      greenDuration: samsatGreen,
    });
    setBubatPhase({
      phase: "EW_GREEN",
      timer: bubatGreen,
      greenDuration: bubatGreen,
    });
    
    addLog("alert", "AI Mode restored. System recalibrating...");
  }, [addLog, samsatVehicles, bubatVehicles]);

  // --- MOCK SENSORS: Randomize vehicle counts every 5 seconds ---
  useEffect(() => {
    if (systemMode === "manual") return;

    const interval = setInterval(() => {
      setSamsatVehicles(prev => {
        const change = Math.floor(Math.random() * 31) - 15; // -15 to +15
        return Math.max(10, Math.min(120, prev + change));
      });
      setBubatVehicles(prev => {
        const change = Math.floor(Math.random() * 31) - 15;
        return Math.max(10, Math.min(120, prev + change));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [systemMode]);

  // --- MAIN PHASE-BASED TRAFFIC LIGHT LOGIC ---
  useEffect(() => {
    if (systemMode === "manual") return;

    const isML = systemMode === "ml";

    const interval = setInterval(() => {
      // Update Samsat phase
      setSamsatPhase(prev => {
        const newTimer = prev.timer - 1;
        
        // Timer hits 0 -> transition to next phase
        if (newTimer <= 0) {
          const nextPhase = getNextPhase(prev.phase);
          
          // Determine duration for next phase
          let nextDuration: number;
          let nextGreenDuration = prev.greenDuration;
          
          if (nextPhase === "NS_GREEN" || nextPhase === "EW_GREEN") {
            // Entering green phase: calculate adaptive duration
            nextGreenDuration = getAdaptiveGreenDuration(samsatVehicles, isML);
            nextDuration = nextGreenDuration;
            
            // Log AI decision
            if (isML) {
              const direction = nextPhase === "NS_GREEN" ? "N-S" : "E-W";
              addLog("reward", `Samsat ${direction}: Green set to ${nextDuration}s (${samsatVehicles} vehicles, ${samsatDensity})`);
            }
          } else {
            // Yellow phase: fixed 5s
            nextDuration = YELLOW_DURATION;
          }
          
          return {
            phase: nextPhase,
            timer: nextDuration,
            greenDuration: nextGreenDuration,
          };
        }
        
        return { ...prev, timer: newTimer };
      });

      // Update Bubat phase with Samsat coordination
      setBubatPhase(prev => {
        const newTimer = prev.timer - 1;
        
        if (newTimer <= 0) {
          const nextPhase = getNextPhase(prev.phase);
          
          let nextDuration: number;
          let nextGreenDuration = prev.greenDuration;
          
          if (nextPhase === "NS_GREEN" || nextPhase === "EW_GREEN") {
            nextGreenDuration = getAdaptiveGreenDuration(bubatVehicles, isML);
            
            // Inter-intersection coordination: if Samsat is congested, extend red at Bubat
            if (isML && samsatDensity === "congested" && nextPhase === "NS_GREEN") {
              // Delay green to hold traffic
              nextGreenDuration = Math.max(20, nextGreenDuration - 10);
              addLog("alert", `Coordination: Samsat congested → Bubat N-S reduced to ${nextGreenDuration}s (holding traffic)`);
            } else if (isML) {
              const direction = nextPhase === "NS_GREEN" ? "N-S" : "E-W";
              addLog("reward", `Bubat ${direction}: Green set to ${nextGreenDuration}s (${bubatVehicles} vehicles, ${bubatDensity})`);
            }
            
            nextDuration = nextGreenDuration;
          } else {
            nextDuration = YELLOW_DURATION;
          }
          
          return {
            phase: nextPhase,
            timer: nextDuration,
            greenDuration: nextGreenDuration,
          };
        }
        
        return { ...prev, timer: newTimer };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [systemMode, samsatVehicles, bubatVehicles, samsatDensity, bubatDensity, addLog]);

  // --- REWARD/PUNISHMENT LOGIC based on vehicle changes ---
  const prevSamsatVehicles = useRef(samsatVehicles);
  const prevBubatVehicles = useRef(bubatVehicles);

  useEffect(() => {
    if (systemMode !== "ml") return;

    const interval = setInterval(() => {
      const samsatDelta = prevSamsatVehicles.current - samsatVehicles;
      const bubatDelta = prevBubatVehicles.current - bubatVehicles;

      if (samsatDelta > 10) {
        const percent = Math.round((samsatDelta / prevSamsatVehicles.current) * 100);
        addLog("reward", `Samsat: Traffic reduced by ${percent}% → Timing effective`);
      } else if (samsatDelta < -15) {
        addLog("punishment", `Samsat: Traffic spike detected → Recalculating...`);
      }

      if (bubatDelta > 10) {
        const percent = Math.round((bubatDelta / prevBubatVehicles.current) * 100);
        addLog("reward", `Bubat: Traffic reduced by ${percent}% → Optimal timing`);
      } else if (bubatDelta < -15) {
        addLog("punishment", `Bubat: Congestion rising → Adjusting cycles...`);
      }

      prevSamsatVehicles.current = samsatVehicles;
      prevBubatVehicles.current = bubatVehicles;
    }, 10000);

    return () => clearInterval(interval);
  }, [systemMode, samsatVehicles, bubatVehicles, addLog]);

  // Manual override light states
  const getManualLights = (color: LightColor): IntersectionState => ({
    north: { color, timer: 0 },
    south: { color, timer: 0 },
    east: { color, timer: 0 },
    west: { color, timer: 0 },
  });

  const value: TrafficContextType = {
    systemMode,
    setSystemMode,
    manualOverride,
    samsatLights: manualOverride ? getManualLights(manualOverride) : samsatLights,
    bubatLights: manualOverride ? getManualLights(manualOverride) : bubatLights,
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