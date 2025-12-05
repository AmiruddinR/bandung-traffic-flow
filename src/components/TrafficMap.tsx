import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// Traffic light simulation states
type TrafficLightColor = "red" | "yellow" | "green";

interface TrafficLightState {
  color: TrafficLightColor;
  countdown: number;
}

const MAPBOX_TOKEN_KEY = "traffic_dashboard_mapbox_token";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const HARDCODED_TOKEN = "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA"; 

  const [mapboxToken, setMapboxToken] = useState(HARDCODED_TOKEN);
  const [tokenSubmitted, setTokenSubmitted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Traffic light states for both intersections
  const [light1, setLight1] = useState<TrafficLightState>({ color: "green", countdown: 45 });
  const [light2, setLight2] = useState<TrafficLightState>({ color: "red", countdown: 52 });

  // Simulate traffic light cycles
  useEffect(() => {
    const timer = setInterval(() => {
      setLight1((prev) => {
        if (prev.countdown > 1) {
          return { ...prev, countdown: prev.countdown - 1 };
        }
        if (prev.color === "green") return { color: "yellow", countdown: 5 };
        if (prev.color === "yellow") return { color: "red", countdown: 50 };
        return { color: "green", countdown: 45 };
      });

      setLight2((prev) => {
        if (prev.countdown > 1) {
          return { ...prev, countdown: prev.countdown - 1 };
        }
        if (prev.color === "green") return { color: "yellow", countdown: 5 };
        if (prev.color === "yellow") return { color: "red", countdown: 45 };
        return { color: "green", countdown: 50 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getColorHex = (color: TrafficLightColor) => {
    switch (color) {
      case "red": return "#ff0066";
      case "yellow": return "#ffcc00";
      case "green": return "#00ff88";
    }
  };

  useEffect(() => {
    if (!tokenSubmitted) return;
    if (!mapboxToken || mapboxToken.trim().length < 10) return;
    
    // Delay to ensure DOM is ready and container has dimensions
    const initTimer = setTimeout(() => {
      if (!mapContainer.current) {
        console.error("Map container ref is null");
        setMapError("Map container not found. Please refresh the page.");
        return;
      }
      
      // Check if container has actual dimensions
      const rect = mapContainer.current.getBoundingClientRect();
      console.log("Map container dimensions:", rect.width, rect.height);
      
      if (rect.width === 0 || rect.height === 0) {
        console.error("Map container has no dimensions");
        setMapError("Map container has no dimensions. Please refresh the page.");
        return;
      }
      
      setIsLoading(true);
      setMapError(null);

      try {
        mapboxgl.accessToken = mapboxToken.trim();

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [107.6191, -6.9175],
          zoom: 12.5,
          pitch: 45,
        });

        map.current.on("error", (e) => {
          console.error("Mapbox error:", e);
          setMapError("Failed to load map. Please check your token.");
          setIsLoading(false);
        });

        map.current.on("load", () => {
          setIsLoading(false);
          if (!map.current) return;

          const kiaracondong = [107.6385, -6.9297];
          const buahBatu = [107.6338, -6.9432];

          const createMarkerElement = (lightId: number) => {
            const el = document.createElement("div");
            el.className = "custom-marker";
            el.id = `marker-${lightId}`;
            el.style.width = "60px";
            el.style.height = "80px";
            el.style.position = "relative";
            
            el.innerHTML = `
              <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;">
                <div style="
                  width: 50px;
                  height: 50px;
                  background: rgba(0, 212, 255, 0.2);
                  border: 2px solid #00d4ff;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
                ">
                  <div id="light-indicator-${lightId}" style="
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #00ff88;
                    box-shadow: 0 0 15px currentColor;
                  "></div>
                </div>
                <div id="countdown-${lightId}" style="
                  margin-top: 4px;
                  background: rgba(10, 14, 26, 0.95);
                  border: 1px solid rgba(0, 212, 255, 0.3);
                  border-radius: 4px;
                  padding: 2px 8px;
                  font-size: 14px;
                  font-weight: bold;
                  font-family: 'Inter', monospace;
                  color: white;
                  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
                ">45</div>
              </div>
            `;
            
            return el;
          };

          const marker1Element = createMarkerElement(1);
          new mapboxgl.Marker({ element: marker1Element })
            .setLngLat(kiaracondong as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                '<div class="text-center p-2"><strong>Simpang Samsat Kiaracondong</strong><br/><span class="text-green-400">Status: Flowing</span></div>'
              )
            )
            .addTo(map.current);

          const marker2Element = createMarkerElement(2);
          new mapboxgl.Marker({ element: marker2Element })
            .setLngLat(buahBatu as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                '<div class="text-center p-2"><strong>Simpang Buah Batu</strong><br/><span class="text-cyan-400">Status: Moderate</span></div>'
              )
            )
            .addTo(map.current);

          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [kiaracondong, buahBatu],
              },
            },
          });

          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#00ff88",
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });

          map.current.addLayer({
            id: "route-glow",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#00ff88",
              "line-width": 8,
              "line-opacity": 0.3,
              "line-blur": 4,
            },
          });
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError("Failed to initialize map.");
        setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(initTimer);
      map.current?.remove();
    };
  }, [mapboxToken, tokenSubmitted]);

  // Update traffic light indicators in real-time
  useEffect(() => {
    if (!tokenSubmitted) return;

    const updateIndicator = (lightId: number, state: TrafficLightState) => {
      const indicator = document.getElementById(`light-indicator-${lightId}`);
      const countdown = document.getElementById(`countdown-${lightId}`);
      
      if (indicator) {
        indicator.style.background = getColorHex(state.color);
      }
      if (countdown) {
        countdown.textContent = state.countdown.toString();
        countdown.style.color = getColorHex(state.color);
      }
    };

    updateIndicator(1, light1);
    updateIndicator(2, light2);
  }, [light1, light2, tokenSubmitted]);

  const handleSubmitToken = () => {
    if (mapboxToken.trim().length >= 10) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, mapboxToken.trim());
      setTokenSubmitted(true);
    }
  };

  const handleResetToken = () => {
    localStorage.removeItem(MAPBOX_TOKEN_KEY);
    setMapboxToken("");
    setTokenSubmitted(false);
    setMapError(null);
    map.current?.remove();
    map.current = null;
  };

  if (!tokenSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 bg-card border border-border/50 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-bold">Mapbox Token Required</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            To display the interactive map, please enter your Mapbox public token. You can get one
            for free at{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="space-y-2">
            <Label htmlFor="token">Mapbox Public Token</Label>
            <Input
              id="token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <button
            onClick={handleSubmitToken}
            disabled={mapboxToken.trim().length < 10}
            className="w-full py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative w-full h-full" style={{ minHeight: '400px' }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }}></div>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3 p-6 bg-card border border-destructive/50 rounded-lg">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <span className="text-sm text-destructive">{mapError}</span>
            <button
              onClick={handleResetToken}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90"
            >
              Reset Token
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg max-w-xs z-20">
        <h3 className="text-sm font-bold text-foreground mb-2">Traffic Synchronization</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Real-time coordination between Simpang Samsat Kiaracondong and Simpang Buah Batu
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-success">Sync Active</span>
          </div>
          <button
            onClick={handleResetToken}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
