import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// --- HELPERS ---
const createIntersectionFeature = (
  center: [number, number], 
  idPrefix: string, 
  radius: number = 0.002
) => {
  const [lng, lat] = center;
  return [
    {
      type: "Feature",
      properties: { id: `${idPrefix}-north`, dir: "Utara" },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng, lat + radius]] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-south`, dir: "Selatan" },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng, lat - radius]] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-east`, dir: "Timur" },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng + radius, lat]] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-west`, dir: "Barat" },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng - radius, lat]] }
    }
  ];
};

const MAPBOX_TOKEN_KEY = "traffic_dashboard_mapbox_token";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const HARDCODED_TOKEN = "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA"; 

  const [mapboxToken, setMapboxToken] = useState(HARDCODED_TOKEN);
  const [tokenSubmitted, setTokenSubmitted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const [laneColors, setLaneColors] = useState<Record<string, string>>({
    "samsat-north": "red", "samsat-south": "green", "samsat-east": "yellow", "samsat-west": "green",
    "bubat-north": "green", "bubat-south": "red", "bubat-east": "green", "bubat-west": "red",
  });

  useEffect(() => {
    if (!tokenSubmitted) return;
    if (!mapboxToken || mapboxToken.trim().length < 10) return;
    if (!mapContainer.current) return;
    if (map.current) return;

    setIsLoading(true);
    setMapError(null);

    try {
      mapboxgl.accessToken = mapboxToken.trim();

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [107.636, -6.935],
        zoom: 13.5,
        pitch: 45, // 3D view
        attributionControl: false,
      });

      map.current.on("error", (e) => {
        console.error("Mapbox Error:", e);
        if (e.error?.message?.includes("forbidden") || e.error?.message?.includes("Unauthorized")) {
           setMapError("Token Invalid atau Ditolak.");
           setIsLoading(false);
        }
      });

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        const kiaracondong = [107.6385, -6.9297] as [number, number];
        const buahBatu = [107.6338, -6.9432] as [number, number];

        // 1. Setup GeoJSON Data
        const allFeatures = [
          ...createIntersectionFeature(kiaracondong, "samsat", 0.003),
          ...createIntersectionFeature(buahBatu, "bubat", 0.003)
        ];

        map.current.addSource("traffic-lanes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: allFeatures as any }
        });

        // 2. Add Line Layer (Jalur)
        map.current.addLayer({
          id: "lanes-layer",
          type: "line",
          source: "traffic-lanes",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            // Lebar garis responsif terhadap Zoom (Fix tampilan titik kecil/besar)
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              12, 3,  // Zoom jauh: Tipis
              15, 8,  // Zoom sedang
              18, 20  // Zoom dekat: Tebal
            ],
            "line-color": "#555", 
            "line-opacity": 0.8
          }
        });

        // 3. Add Arrow Layer (Panah Arah)
        map.current.addLayer({
          id: "lanes-arrow",
          type: "symbol",
          source: "traffic-lanes",
          layout: {
            "symbol-placement": "line",
            "text-field": "▶",
            "text-size": 14,
            "symbol-spacing": 100,
            "text-keep-upright": false
          },
          paint: { "text-color": "#fff", "text-halo-color": "#000", "text-halo-width": 2 }
        });

        // PENTING: Resize map setelah load agar tidak blank
        map.current.resize();
        setTimeout(() => map.current?.resize(), 500);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("Gagal memuat peta.");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, tokenSubmitted]);

  // Effect untuk Update Warna Real-time
  useEffect(() => {
    if (!map.current?.getLayer("lanes-layer")) return;
    
    // Timer Simulasi Perubahan Warna
    const interval = setInterval(() => {
        setLaneColors(prev => ({
            ...prev,
            "samsat-north": Math.random() > 0.5 ? "red" : "green",
            "bubat-south": Math.random() > 0.5 ? "red" : "green",
        }));
    }, 2000);

    // Update Paint Property Mapbox
    const matchExpression: any[] = ["match", ["get", "id"]];
    Object.entries(laneColors).forEach(([id, color]) => {
        matchExpression.push(id); 
        const hex = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        matchExpression.push(hex); 
    });
    matchExpression.push("#888"); // Fallback color

    if (map.current.isStyleLoaded()) {
      map.current.setPaintProperty("lanes-layer", "line-color", matchExpression);
    }

    return () => clearInterval(interval);
  }, [laneColors]); 

  // --- RENDER ---
  return (
    // Style inline menjamin height tidak 0
    <div className="relative w-full h-full flex-1" style={{ minHeight: "500px", height: "100%" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 p-4">
          <div className="text-red-400 font-bold flex flex-col items-center gap-2">
            <AlertCircle />
            <span>{mapError}</span>
            <button onClick={() => window.location.reload()} className="text-xs underline text-white">Reload Page</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficMap;
