import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSubmitted, setTokenSubmitted] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !tokenSubmitted) return;

    mapboxgl.accessToken = mapboxToken;

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

      // Add markers for intersections
      const marker1 = new mapboxgl.Marker({
        color: "#00d4ff",
        scale: 1.2,
      })
        .setLngLat(kiaracondong as [number, number])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            '<div class="text-center p-2"><strong>Simpang Samsat Kiaracondong</strong><br/><span class="text-green-400">Status: Flowing</span></div>'
          )
        )
        .addTo(map.current);

      const marker2 = new mapboxgl.Marker({
        color: "#00d4ff",
        scale: 1.2,
      })
        .setLngLat(buahBatu as [number, number])
        .setPopup(
          new mapboxgl.Popup().setHTML(
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
