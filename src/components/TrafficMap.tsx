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
  
  // Gunakan Environment Variable untuk keamanan, fallback ke token lama untuk dev
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA";

  const [isLoading, setIsLoading] = useState(false);
  
  // --- STATE TRAFFIC LIGHT ---
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

  // --- 1. UPDATE VISUAL DOM (Tanpa Re-render React) ---
  const updateMarkerDOM = (idPrefix: string, data: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const box = document.getElementById(`${idPrefix}-${dir}`);
      const timerText = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (box && timerText) {
        const { color, timer } = data[dir];
        
        // Warna & Glow
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const borderColor = color === "green" ? "#ffffff" : "#333";
        const boxShadow = color === "green" ? "0 0 12px rgba(34, 197, 94, 0.9)" : "none";
        
        box.style.backgroundColor = bgColor;
        box.style.borderColor = borderColor;
        box.style.boxShadow = boxShadow;
        timerText.innerText = timer.toString();
      }
    });
  };

  // --- 2. SIMULASI LOGIKA ---
  useEffect(() => {
    const interval = setInterval(() => {
      const updatePhase = (prev: IntersectionState): IntersectionState => {
        const next = { ...prev };
        (["north", "south", "east", "west"] as const).forEach(dir => {
            if (next[dir].timer > 0) next[dir].timer -= 1;
        });

        if (next.north.timer === 0) {
            const isNorthGreen = next.north.color === "green";
            // Tukar Fase
            next.north.color = isNorthGreen ? "red" : "green";
            next.south.color = isNorthGreen ? "red" : "green";
            next.east.color = isNorthGreen ? "green" : "red";
            next.west.color = isNorthGreen ? "green" : "red";
            // Reset Timer
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

  useEffect(() => {
    updateMarkerDOM("samsat", samsatData);
    updateMarkerDOM("bubat", bubatData);
  }, [samsatData, bubatData]);

  // --- 3. INISIALISASI PETA ---
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    setIsLoading(true);

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [107.6375, -6.9465],
        zoom: 14.8,
        pitch: 45, // Memberikan efek 3D sedikit agar lebih keren
        bearing: 0,
        attributionControl: false,
      });

      // --- HELPER 1: Marker Lampu (Ikut Rotasi Peta) ---
      const createLightsElement = (idPrefix: string, rotationDeg: number, dist: number = 38) => {
        const container = document.createElement("div");
        container.className = "traffic-lights-group";
        Object.assign(container.style, {
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "0px",
          height: "0px",
          // Rotasi statis menyesuaikan arah jalan (heading)
          transform: `rotate(${rotationDeg}deg)` 
        });

        // Titik Tengah
        const center = document.createElement("div");
        Object.assign(center.style, {
          position: "absolute",
          width: "12px", height: "12px", 
          backgroundColor: "white", borderRadius: "50%",
          boxShadow: "0 0 10px white", zIndex: "10",
          transform: "translate(-50%, -50%)"
        });
        container.appendChild(center);

        // Fungsi Pembuat Lampu
        const createLight = (dir: string, x: number, y: number) => {
          const circle = document.createElement("div");
          circle.id = `${idPrefix}-${dir}`;
          Object.assign(circle.style, {
            position: "absolute",
            width: "30px", height: "30px",
            // Posisi relatif terhadap pusat
            left: `${x}px`, top: `${y}px`,
            transform: "translate(-50%, -50%)", // Center anchor
            backgroundColor: "#555", border: "2px solid #fff",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: "5", transition: "background-color 0.2s"
          });

          // Text Angka (Harus di-counter-rotate agar tegak lurus relatif user)
          // TAPI: Karena parent container di-set rotationAlignment 'map', 
          // maka angka ini akan ikut muter.
          // Solusi terbaik: Biarkan angka mengikuti orientasi lampu untuk keterbacaan "driver view",
          // atau buat angka tegak lurus. Di sini kita buat tegak lurus relatif lampu.
          const span = document.createElement("span");
          span.id = `${idPrefix}-${dir}-timer`;
          span.innerText = "--";
          Object.assign(span.style, {
            color: "white", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace",
            transform: `rotate(${-rotationDeg}deg)` // Counter rotate agar angka tegak saat load awal
          });

          circle.appendChild(span);
          return circle;
        };

        // Posisi Lampu
        container.appendChild(createLight("north", 0, -dist));
        container.appendChild(createLight("south", 0, dist));
        container.appendChild(createLight("east", dist, 0));
        container.appendChild(createLight("west", -dist, 0));

        return container;
      };

      // --- HELPER 2: Marker Label (Selalu Horizontal/Viewport Aligned) ---
      const createLabelElement = (label: string) => {
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        Object.assign(labelEl.style, {
          background: "rgba(0,0,0,0.8)", color: "#fff",
          padding: "6px 10px", borderRadius: "6px",
          fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          // Pointer events none agar klik tembus ke peta jika perlu
          pointerEvents: "none"
        });
        return labelEl;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        const samsat = [107.641889, -6.945306] as [number, number];
        const bubat = [107.633417, -6.948028] as [number, number];

        // --- RENDER MARKER SAMSAT ---
        // 1. Lampu (Menempel di Peta)
        new mapboxgl.Marker({ 
          element: createLightsElement("samsat", -12),
          rotationAlignment: 'map', // KUNCI: Ikut rotasi peta
          pitchAlignment: 'map'     // KUNCI: Ikut kemiringan peta (menempel tanah)
        }).setLngLat(samsat).addTo(map.current);

        // 2. Label (Tegak Lurus Layar)
        new mapboxgl.Marker({ 
          element: createLabelElement("Samsat Kiaracondong"),
          rotationAlignment: 'viewport', // KUNCI: Selalu horizontal
          pitchAlignment: 'viewport',    // KUNCI: Selalu tegak
          offset: [0, -60]               // Geser ke atas agar tidak menumpuk lampu
        }).setLngLat(samsat).addTo(map.current);


        // --- RENDER MARKER BUAH BATU ---
        // 1. Lampu
        new mapboxgl.Marker({ 
          element: createLightsElement("bubat", -12),
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        }).setLngLat(bubat).addTo(map.current);

        // 2. Label
        new mapboxgl.Marker({ 
          element: createLabelElement("Buah Batu"),
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
          offset: [0, -60]
        }).setLngLat(bubat).addTo(map.current);

        map.current.resize();
      });

    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex-1 relative w-full h-[400px] mb-10 overflow-hidden rounded-xl border border-border/50 shadow-sm bg-card z-0">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* LEGEND */}
      <div className="absolute bottom-4 left-4 z-40 bg-card/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
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
