import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// --- HELPERS (Ditaruh di luar component agar bersih) ---

// Fungsi membuat geometri 4 lengan simpang (Utara, Selatan, Timur, Barat)
// Mengembalikan array Coordinate GeoJSON
const createIntersectionFeature = (
  center: [number, number], 
  idPrefix: string, 
  radius: number = 0.002 // Panjang lengan dalam derajat (~200m)
) => {
  const [lng, lat] = center;
  
  return [
    // Utara
    {
      type: "Feature",
      properties: { id: `${idPrefix}-north`, dir: "Utara", parent: idPrefix },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng, lat + radius]] }
    },
    // Selatan
    {
      type: "Feature",
      properties: { id: `${idPrefix}-south`, dir: "Selatan", parent: idPrefix },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng, lat - radius]] }
    },
    // Timur
    {
      type: "Feature",
      properties: { id: `${idPrefix}-east`, dir: "Timur", parent: idPrefix },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng + radius, lat]] }
    },
    // Barat
    {
      type: "Feature",
      properties: { id: `${idPrefix}-west`, dir: "Barat", parent: idPrefix },
      geometry: { type: "LineString", coordinates: [[lng, lat], [lng - radius, lat]] }
    }
  ];
};

const MAPBOX_TOKEN_KEY = "traffic_dashboard_mapbox_token";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  // Default fallback token (Opsional)
  const HARDCODED_TOKEN = "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA"; 

  const [mapboxToken, setMapboxToken] = useState(HARDCODED_TOKEN);
  const [tokenSubmitted, setTokenSubmitted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // State data warna jalur (Bisa diupdate real-time nanti)
  // Format: [id_jalur]: "warna"
  const [laneColors, setLaneColors] = useState<Record<string, string>>({
    "samsat-north": "red",
    "samsat-south": "green",
    "samsat-east": "yellow",
    "samsat-west": "green",
    "bubat-north": "green",
    "bubat-south": "red",
    "bubat-east": "green",
    "bubat-west": "red",
  });

  // --- Efek Inisialisasi Peta ---
  useEffect(() => {
    if (!tokenSubmitted) return;
    if (!mapboxToken || mapboxToken.trim().length < 10) return;
    if (!mapContainer.current) return;
    if (map.current) return; // Mencegah double render

    setIsLoading(true);
    setMapError(null);

    try {
      mapboxgl.accessToken = mapboxToken.trim();

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [107.636, -6.935], // Titik tengah antara dua simpang
        zoom: 13.5,
        pitch: 45, // Memberi efek 3D
        attributionControl: false,
      });

      map.current.on("error", (e) => {
        if (e.error?.message?.includes("forbidden") || e.error?.message?.includes("Unauthorized")) {
           setMapError("Invalid Token.");
           setIsLoading(false);
        }
      });

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        const kiaracondong = [107.6385, -6.9297] as [number, number];
        const buahBatu = [107.6338, -6.9432] as [number, number];

        // 1. Buat Data GeoJSON Lengan Simpang
        const samsatFeatures = createIntersectionFeature(kiaracondong, "samsat", 0.003);
        const bubatFeatures = createIntersectionFeature(buahBatu, "bubat", 0.003);

        const allFeatures = [...samsatFeatures, ...bubatFeatures];

        // 2. Tambahkan Source Data ke Peta
        map.current.addSource("traffic-lanes", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: allFeatures as any
          }
        });

        // 3. Tambahkan Layer Visualisasi (Garis Jalan)
        // Layer ini MENEMPEL di peta, bukan mengambang
        map.current.addLayer({
          id: "lanes-layer",
          type: "line",
          source: "traffic-lanes",
          layout: {
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            // Lebar garis dinamis berdasarkan ZOOM level
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              12, 3,  // Saat zoom jauh (level 12), tebal 3px
              15, 8,  // Saat zoom sedang (level 15), tebal 8px
              18, 20  // Saat zoom dekat (level 18), tebal 20px
            ],
            // Warna awal (abu-abu dulu, nanti diupdate oleh useEffect updateColors)
            "line-color": "#555", 
            "line-opacity": 0.8
          }
        });

        // 4. Tambahkan Layer Simbol Panah (Opsional, agar terlihat arah)
        map.current.addLayer({
          id: "lanes-arrow",
          type: "symbol",
          source: "traffic-lanes",
          layout: {
            "symbol-placement": "line",
            "text-field": "▶",
            "text-size": 14,
            "symbol-spacing": 150,
            "text-keep-upright": false
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2
          }
        });

        // 5. Tambahkan Label Nama Simpang (Text Layer, bukan HTML Marker)
        map.current.addSource("labels", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [
                    { type: "Feature", geometry: { type: "Point", coordinates: kiaracondong }, properties: { title: "Samsat Kiaracondong" } },
                    { type: "Feature", geometry: { type: "Point", coordinates: buahBatu }, properties: { title: "Buah Batu" } }
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
                "text-size": 12,
                "text-offset": [0, 1.5], // Geser sedikit ke atas
                "text-anchor": "top"
            },
            paint: {
                "text-color": "#ffffff",
                "text-halo-color": "#000000",
                "text-halo-width": 2
            }
        });

        map.current.resize();
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("Failed to initialize map.");
      setIsLoading(false);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, tokenSubmitted]);

  // --- Efek Update Warna (Real-time Simulation) ---
  useEffect(() => {
    if (!map.current || !map.current.getLayer("lanes-layer")) return;

    // Timer untuk simulasi ganti warna
    const interval = setInterval(() => {
        // Acak warna untuk demo (Ganti logika ini dengan data backend nanti)
        setLaneColors(prev => ({
            ...prev,
            "samsat-north": Math.random() > 0.5 ? "red" : "green",
            "bubat-south": Math.random() > 0.5 ? "red" : "green",
        }));
    }, 2000);

    // Apply warna ke Mapbox Layer
    // Kita gunakan 'match' expression untuk performa tinggi
    const matchExpression: any[] = ["match", ["get", "id"]];
    
    // Loop state laneColors untuk membuat aturan warna
    Object.entries(laneColors).forEach(([id, color]) => {
        matchExpression.push(id); // Jika ID match...
        // Translate nama warna ke Hex code
        const hex = color === "red" ? "#ef4444" : 
                    color === "yellow" ? "#eab308" : 
                    color === "green" ? "#22c55e" : "#888";
        matchExpression.push(hex); // ...gunakan warna ini
    });
    
    matchExpression.push("#888"); // Default color fallback

    // Update properti paint peta
    if (map.current.getStyle()) {
        map.current.setPaintProperty("lanes-layer", "line-color", matchExpression);
    }

    return () => clearInterval(interval);
  }, [laneColors]); // Re-run jika laneColors berubah tapi logic dalam effect menangani update ke map

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

  // --- Render UI (Form Token) ---
  if (!tokenSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-[400px]">
        <div className="w-full max-w-md p-8 bg-card border border-border/50 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-bold">Mapbox Token Required</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Mapbox Public Token</Label>
            <Input
              id="token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <button
            onClick={handleSubmitToken}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  // --- Render UI (Peta) ---
  return (
    <div className="flex-1 relative w-full h-full min-h-[500px]">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* Info Legend Sederhana */}
      <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded text-white text-xs z-20 pointer-events-none">
        <div className="font-bold mb-1">Status Jalur</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Macet</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Lancar</div>
      </div>
    </div>
  );
};

export default TrafficMap;
