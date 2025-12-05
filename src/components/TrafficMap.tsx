import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// --- HELPER: ROTASI GEOMETRI ---
// Fungsi ini membuat garis lengan simpang yang bisa DI-ROTASI agar pas dengan jalan
const createRotatedArms = (
  center: [number, number], 
  idPrefix: string, 
  radius: number = 0.002, // Panjang lengan (~200m)
  rotationDegrees: number = 0 // Sudut putar (searah jarum jam)
) => {
  const [cx, cy] = center;
  
  // Konversi derajat ke radian
  const rad = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Fungsi putar titik (relatif terhadap center)
  const rotatePoint = (dx: number, dy: number) => {
    return [
      cx + (dx * cos - dy * sin), 
      cy + (dx * sin + dy * cos)
    ];
  };

  // Koordinat relatif lengan (sebelum diputar)
  // dx = longitude offset, dy = latitude offset
  const northEnd = rotatePoint(0, radius);
  const southEnd = rotatePoint(0, -radius);
  const eastEnd  = rotatePoint(radius, 0);
  const westEnd  = rotatePoint(-radius, 0);

  return [
    {
      type: "Feature",
      properties: { id: `${idPrefix}-north`, dir: "Utara" },
      geometry: { type: "LineString", coordinates: [[cx, cy], northEnd] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-south`, dir: "Selatan" },
      geometry: { type: "LineString", coordinates: [[cx, cy], southEnd] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-east`, dir: "Timur" },
      geometry: { type: "LineString", coordinates: [[cx, cy], eastEnd] }
    },
    {
      type: "Feature",
      properties: { id: `${idPrefix}-west`, dir: "Barat" },
      geometry: { type: "LineString", coordinates: [[cx, cy], westEnd] }
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
  
  // State warna jalur (Simulasi)
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

      // --- SETTING PETA VERTIKAL (LANDAI) ---
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        // Titik tengah antara Samsat & Bubat
        center: [107.6375, -6.9465], 
        zoom: 14.5,
        pitch: 0,   // PENTING: 0 agar tegak lurus (2D/Landai)
        bearing: 0, // Utara selalu di atas
        attributionControl: false,
      });

      map.current.on("error", (e) => {
        if (e.error?.message?.includes("forbidden") || e.error?.message?.includes("Unauthorized")) {
           setMapError("Token Invalid.");
           setIsLoading(false);
        }
      });

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        // --- KOORDINAT BARU (Konversi dari DMS ke Decimal) ---
        // Simpang Samsat: 6°56'43.1"S 107°38'30.8"E
        const samsatCoords = [107.641889, -6.945306] as [number, number];
        
        // Simpang Buah Batu: 6°56'52.9"S 107°38'00.3"E
        const bubatCoords = [107.633417, -6.948028] as [number, number];

        // --- GENERATE GEOMETRI DENGAN ROTASI ---
        // Rotasi -12 derajat agar lurus dengan Jl. Soekarno Hatta
        const samsatFeatures = createRotatedArms(samsatCoords, "samsat", 0.0025, -12);
        const bubatFeatures = createRotatedArms(bubatCoords, "bubat", 0.0025, -12);

        const allFeatures = [...samsatFeatures, ...bubatFeatures];

        map.current.addSource("traffic-lanes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: allFeatures as any }
        });

        // LAYER JALUR (GARIS)
        map.current.addLayer({
          id: "lanes-layer",
          type: "line",
          source: "traffic-lanes",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            // Lebar garis dinamis
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              12, 3,
              18, 25 // Makin zoom in, makin tebal
            ],
            // Warna Default (nanti ditimpa useEffect update)
            "line-color": "#555", 
            "line-opacity": 0.8
          }
        });

        // LAYER PANAH ARAH
        map.current.addLayer({
          id: "lanes-arrow",
          type: "symbol",
          source: "traffic-lanes",
          layout: {
            "symbol-placement": "line",
            "text-field": "▶", // Karakter panah
            "text-size": 16,
            "symbol-spacing": 80,
            "text-keep-upright": false 
          },
          paint: { "text-color": "#fff", "text-halo-color": "#000", "text-halo-width": 2 }
        });

        // LABEL NAMA SIMPANG
        map.current.addSource("labels", {
          type: "geojson",
          data: {
              type: "FeatureCollection",
              features: [
                  { type: "Feature", geometry: { type: "Point", coordinates: samsatCoords }, properties: { title: "Samsat Kiaracondong" } },
                  { type: "Feature", geometry: { type: "Point", coordinates: bubatCoords }, properties: { title: "Buah Batu" } }
              ]
          }
        });
        
        map.current.addLayer({
            id: "label-layer",
            type: "symbol",
            source: "labels",
            layout: {
                "text-field": ["get", "title"],
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-size": 13,
                "text-offset": [0, -1.5], // Label di atas titik
                "text-anchor": "bottom"
            },
            paint: {
                "text-color": "#ffffff",
                "text-halo-color": "#000000",
                "text-halo-width": 3
            }
        });

        // Resize Fix
        map.current.resize();
        setTimeout(() => map.current?.resize(), 500);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    } catch (error) {
      console.error("Map Error:", error);
      setMapError("Gagal memuat peta.");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, tokenSubmitted]);

  // Update Warna Real-time
  useEffect(() => {
    if (!map.current?.getLayer("lanes-layer")) return;
    
    // Interval Simulasi
    const interval = setInterval(() => {
        setLaneColors(prev => ({
            ...prev,
            "samsat-north": Math.random() > 0.5 ? "red" : "green",
            "bubat-south": Math.random() > 0.5 ? "red" : "green",
        }));
    }, 2000);

    // Apply Colors
    const matchExpression: any[] = ["match", ["get", "id"]];
    Object.entries(laneColors).forEach(([id, color]) => {
        matchExpression.push(id); 
        const hex = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        matchExpression.push(hex); 
    });
    matchExpression.push("#888");

    if (map.current.isStyleLoaded()) {
      map.current.setPaintProperty("lanes-layer", "line-color", matchExpression);
    }

    return () => clearInterval(interval);
  }, [laneColors]); 

  // --- RENDER UI ---
  return (
    <div className="flex-1 relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-border/50 shadow-sm">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* LEGENDA WARNA (Floating) */}
      <div className="absolute bottom-5 left-5 z-40 bg-card/95 backdrop-blur-md border border-border p-4 rounded-lg shadow-lg">
        <h4 className="text-xs font-bold mb-2 uppercase">Status Lalu Lintas</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span> Lancar</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Padat</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Macet</div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
