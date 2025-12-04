import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

// Traffic light simulation states
type TrafficLightColor = "red" | "yellow" | "green";

interface TrafficLightState {
  color: TrafficLightColor;
  countdown: number;
}

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSubmitted, setTokenSubmitted] = useState(false);
  
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
        // Cycle through lights
        if (prev.color === "green") return { color: "yellow", countdown: 5 };
        if (prev.color === "yellow") return { color: "red", countdown: 50 };
        return { color: "green", countdown: 45 };
      });

      setLight2((prev) => {
        if (prev.countdown > 1) {
          return { ...prev, countdown: prev.countdown - 1 };
        }
        // Cycle through lights (offset from light1)
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
    if (!mapContainer.current || !tokenSubmitted) return;
    if (!mapboxToken || mapboxToken.trim().length < 10) return;

    mapboxgl.accessToken = mapboxToken.trim();

    // Initialize map centered on Bandung
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [107.6191, -6.9175], // Bandung coordinates
      zoom: 12.5,
      pitch: 45,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Coordinates for the two intersections
      const kiaracondong = [107.6385, -6.9297]; // Simpang Samsat Kiaracondong
      const buahBatu = [107.6338, -6.9432]; // Simpang Buah Batu

      // Create custom marker elements with traffic light indicators
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

      // Add markers with custom elements
      const marker1Element = createMarkerElement(1);
      const marker1 = new mapboxgl.Marker({ element: marker1Element })
        .setLngLat(kiaracondong as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div class="text-center p-2"><strong>Simpang Samsat Kiaracondong</strong><br/><span class="text-green-400">Status: Flowing</span></div>'
          )
        )
        .addTo(map.current);

      const marker2Element = createMarkerElement(2);
      const marker2 = new mapboxgl.Marker({ element: marker2Element })
        .setLngLat(buahBatu as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div class="text-center p-2"><strong>Simpang Buah Batu</strong><br/><span class="text-cyan-400">Status: Moderate</span></div>'
          )
        )
        .addTo(map.current);

      // Add line connecting the two intersections
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

      // Add animated pulse effect
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

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
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
            onClick={() => {
              if (mapboxToken.trim()) {
                setTokenSubmitted(true);
              }
            }}
            className="w-full py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg max-w-xs">
        <h3 className="text-sm font-bold text-foreground mb-2">Traffic Synchronization</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Real-time coordination between Simpang Samsat Kiaracondong and Simpang Buah Batu
        </p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-success">Sync Active</span>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
