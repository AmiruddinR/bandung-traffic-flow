import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2 } from "lucide-react";

// --- TIPE DATA ---
type LightColor = "red" | "yellow" | "green";

interface DirectionState {
  color: LightColor;
  timer: number;
}

interface IntersectionState {
  north: DirectionState;
  south: DirectionState;
  east: DirectionState;
  west: DirectionState;
}

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Gunakan Token Mapbox (Ganti dengan .env di produksi)
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA";

  const [isLoading, setIsLoading] = useState(false);
  
  // --- STATE TRAFFIC LIGHT (Simulasi Data) ---
  const [samsatData, setSamsatData] = useState<IntersectionState>({
    north: { color: "green", timer: 30 },
    south: { color: "green", timer: 30 },
    east: { color: "red", timer: 65 },
    west: { color: "red", timer: 65 },
  });

  const [bubatData, setBubatData] = useState<IntersectionState>({
    north: { color: "red", timer: 45 },
    south: { color: "red", timer: 45 },
    east: { color: "green", timer: 20 },
    west: { color: "green", timer: 20 },
  });

  // --- 1. UPDATE VISUAL DOM DIRECTLY (Performance Optimization) ---
  const updateMarkerDOM = (idPrefix: string, data: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const box = document.getElementById(`${idPrefix}-${dir}`);
      const timerText = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (box && timerText) {
        const { color, timer } = data[dir];
        
        // Logic Warna
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const borderColor = color === "green" ? "#ffffff" : "#ffffff";
        const boxShadow = color === "green" ? "0 0 15px rgba(34, 197, 94, 0.8)" : "0 0 5px rgba(0,0,0,0.5)";
        const transformScale = color === "green" ? "scale(1.1)" : "scale(1)";
        
        box.style.backgroundColor = bgColor;
        box.style.borderColor = borderColor;
        box.style.boxShadow = boxShadow;
        box.style.transform = `translate(-50%, -50%) ${transformScale}`;
        timerText.innerText = timer.toString();
      }
    });
  };

  // --- 2. SIMULASI LOGIKA TRAFFIC LIGHT ---
  useEffect(() => {
    const interval = setInterval(() => {
      const updatePhase = (prev: IntersectionState): IntersectionState => {
        const next = { ...prev };
        (["north", "south", "east", "west"] as const).forEach(dir => {
            if (next[dir].timer > 0) next[dir].timer -= 1;
        });

        // Logika sederhana pergantian fase
        if (next.north.timer === 0) {
            const isNorthGreen = next.north.color === "green";
            next.north.color = isNorthGreen ? "red" : "green";
            next.south.color = isNorthGreen ? "red" : "green";
            next.east.color = isNorthGreen ? "green" : "red";
            next.west.color = isNorthGreen ? "green" : "red";
            next.north.timer = isNorthGreen ? 60 : 30;
            next.south.timer = isNorthGreen ? 60 : 30;
            next.east.timer = isNorthGreen ? 30 : 60;
            next.west.timer = isNorthGreen ? 30 : 60;
        }
        return next;
      };
      setSamsatData(prev => updatePhase(prev));
      setBubatData(prev => updatePhase(prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger update DOM saat state berubah
  useEffect(() => {
    updateMarkerDOM("samsat", samsatData);
    updateMarkerDOM("bubat", bubatData);
  }, [samsatData, bubatData]);

  // --- 3. INISIALISASI PETA ---
  useEffect(() => {
    if (map.current) return;

    setIsLoading(true);

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11", // Dark mode
        center: [107.6375, -6.9465], // Tengah-tengah antara Samsat & Bubat
        zoom: 15,
        pitch: 0, // Flat view agar lebih jelas (bisa diubah ke 45 jika ingin 3D)
        bearing: 0,
        attributionControl: false,
      });

      // --- HELPER 1: Marker LAMPU (Rotasi mengikuti PETA/JALAN) ---
      const createLightsElement = (idPrefix: string, rotationDeg: number, dist: number = 40) => {
        const container = document.createElement("div");
        Object.assign(container.style, {
          position: "relative",
          width: "0px", height: "0px",
          // Rotasi container ini agar lampu sejajar dengan simpang jalan
          transform: `rotate(${rotationDeg}deg)` 
        });

        // Titik Pusat Simpang (Putih Kecil)
        const center = document.createElement("div");
        Object.assign(center.style, {
          position: "absolute",
          width: "10px", height: "10px", 
          backgroundColor: "white", borderRadius: "50%",
          boxShadow: "0 0 10px white", zIndex: "1",
          transform: "translate(-50%, -50%)"
        });
        container.appendChild(center);

        // Fungsi Membuat Lingkaran Lampu
        const createLight = (dir: string, x: number, y: number) => {
          const circle = document.createElement("div");
          circle.id = `${idPrefix}-${dir}`;
          Object.assign(circle.style, {
            position: "absolute",
            width: "32px", height: "32px",
            left: `${x}px`, top: `${y}px`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "#333", border: "2px solid #fff",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: "5", transition: "all 0.3s ease"
          });

          // Angka Timer - KITA ROTASI BALIK agar angka tetap tegak relatif terhadap user
          // meskipun lampunya diputar mengikuti jalan.
          const span = document.createElement("span");
          span.id = `${idPrefix}-${dir}-timer`;
          span.innerText = "--";
          Object.assign(span.style, {
            color: "white", fontSize: "12px", fontWeight: "bold", fontFamily: "monospace",
            transform: `rotate(${-rotationDeg}deg)` // Counter-rotate
          });

          circle.appendChild(span);
          return circle;
        };

        // Tambahkan 4 lampu (Atas, Bawah, Kiri, Kanan relatif container)
        container.appendChild(createLight("north", 0, -dist));
        container.appendChild(createLight("south", 0, dist));
        container.appendChild(createLight("east", dist, 0));
        container.appendChild(createLight("west", -dist, 0));

        return container;
      };

      // --- HELPER 2: Marker LABEL (Rotasi mengikuti LAYAR/VIEWPORT) ---
      // Ini perbaikan utamanya: Label dipisah agar tidak ikut miring
      const createLabelElement = (label: string) => {
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        Object.assign(labelEl.style, {
          background: "rgba(0,0,0,0.85)", 
          color: "#fff",
          padding: "6px 12px", 
          borderRadius: "4px",
          fontSize: "12px", 
          fontWeight: "600",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
          pointerEvents: "none" // Agar klik tembus ke peta
        });
        return labelEl;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        // Koordinat Lokasi
        const samsatLoc = [107.641889, -6.945306] as [number, number];
        const bubatLoc = [107.633417, -6.948028] as [number, number];

        // --- MARKER 1: SAMSAT ---
        
        // A. Lampu (rotationAlignment: 'map' -> Nempel Aspal/Miring ikut jalan)
        new mapboxgl.Marker({ 
          element: createLightsElement("samsat", -12), // -12 derajat agar lurus dengan Soekarno Hatta
          rotationAlignment: 'map', 
          pitchAlignment: 'map'
        }).setLngLat(samsatLoc).addTo(map.current);

        // B. Label (rotationAlignment: 'viewport' -> Selalu Tegak Lurus Layar)
        new mapboxgl.Marker({ 
          element: createLabelElement("Samsat Kiaracondong"),
          rotationAlignment: 'viewport', 
          pitchAlignment: 'viewport',
          offset: [0, -65] // Geser ke atas agar tidak menumpuk lampu
        }).setLngLat(samsatLoc).addTo(map.current);


        // --- MARKER 2: BUAH BATU ---

        // A. Lampu
        new mapboxgl.Marker({ 
          element: createLightsElement("bubat", -12),
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        }).setLngLat(bubatLoc).addTo(map.current);

        // B. Label
        new mapboxgl.Marker({ 
          element: createLabelElement("Buah Batu"),
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
          offset: [0, -65]
        }).setLngLat(bubatLoc).addTo(map.current);

        map.current.resize();
      });

    } catch (error) {
      console.error("Map Error:", error);
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex-1 relative w-full h-[400px] mb-6 overflow-hidden rounded-xl border border-border/50 shadow-sm bg-card z-0">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Legend Pojok Kiri Bawah */}
      <div className="absolute bottom-4 left-4 z-40 bg-card/90 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
        <h4 className="text-[10px] font-bold mb-2 uppercase text-foreground">Traffic Indicators</h4>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                <span className="text-[9px] text-white font-bold">##</span>
             </div>
             <span className="text-[10px] font-medium text-muted-foreground">Go</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                <span className="text-[9px] text-white font-bold">##</span>
             </div>
             <span className="text-[10px] font-medium text-muted-foreground">Stop</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
