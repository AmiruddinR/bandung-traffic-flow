import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

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

const MAPBOX_TOKEN_KEY = "traffic_dashboard_mapbox_token";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const HARDCODED_TOKEN = "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA"; 

  const [mapboxToken, setMapboxToken] = useState(HARDCODED_TOKEN);
  const [tokenSubmitted, setTokenSubmitted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // --- STATE SIMULASI DATA (Cerminan Data Real-time ML) ---
  const [samsatData, setSamsatData] = useState<IntersectionState>({
    north: { color: "red", timer: 45 },    // Dari Jl. Ibrahim Adjie (Utara)
    south: { color: "green", timer: 15 },  // Dari Jl. Ibrahim Adjie (Selatan)
    east: { color: "red", timer: 60 },     // Dari Jl. Soekarno Hatta (Timur)
    west: { color: "red", timer: 60 },     // Dari Jl. Soekarno Hatta (Barat)
  });

  const [bubatData, setBubatData] = useState<IntersectionState>({
    north: { color: "green", timer: 25 },
    south: { color: "red", timer: 80 },
    east: { color: "red", timer: 30 },
    west: { color: "green", timer: 25 },
  });

  // --- 1. LOGIKA UPDATE DOM MARKER (Tanpa Re-render Peta) ---
  // Fungsi ini memperbarui warna/angka pada elemen HTML marker secara langsung
  const updateMarkerDOM = (idPrefix: string, data: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const box = document.getElementById(`${idPrefix}-${dir}`);
      const timerText = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (box && timerText) {
        const { color, timer } = data[dir];
        
        // Update Style Box
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const borderColor = color === "green" ? "#ffffff" : "#444";
        const boxShadow = color === "green" ? "0 0 10px #22c55e" : "none";
        
        box.style.backgroundColor = bgColor;
        box.style.borderColor = borderColor;
        box.style.boxShadow = boxShadow;
        
        // Update Angka
        timerText.innerText = timer.toString();
      }
    });
  };

  // --- 2. LOGIKA SIMULASI HITUNG MUNDUR ---
  useEffect(() => {
    const interval = setInterval(() => {
      const cycleTraffic = (prev: IntersectionState): IntersectionState => {
        const next = { ...prev };
        (["north", "south", "east", "west"] as const).forEach(dir => {
          if (next[dir].timer > 0) {
            next[dir].timer -= 1;
          } else {
            // Logika sederhana ganti lampu saat 0
            const isRed = next[dir].color === "red";
            next[dir].color = isRed ? "green" : "red";
            next[dir].timer = isRed ? 30 : 60;
          }
        });
        return next;
      };

      setSamsatData(prev => cycleTraffic(prev));
      setBubatData(prev => cycleTraffic(prev));

    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --- 3. SYNC STATE KE VISUAL PETA ---
  useEffect(() => {
    updateMarkerDOM("samsat", samsatData);
    updateMarkerDOM("bubat", bubatData);
  }, [samsatData, bubatData]);

  // --- 4. INISIALISASI PETA ---
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
        // Titik Tengah Camera
        center: [107.6375, -6.9465], 
        zoom: 14.5,
        pitch: 0, // Tegak lurus (2D) agar posisi akurat
        attributionControl: false,
      });

      // --- HELPER: MEMBUAT ELEMEN HTML MARKER (HUD) ---
      const createHUDElement = (idPrefix: string, label: string, rotationDeg: number) => {
        // Container Utama (Rotatable)
        const container = document.createElement("div");
        container.className = "traffic-hud";
        // Styling Inline untuk Layout
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.width = "0px";
        container.style.height = "0px";
        container.style.position = "relative";
        // ROTASI PENTING: Agar sejajar dengan jalan (Jl. Soekarno Hatta miring ~12 derajat)
        container.style.transform = `rotate(${rotationDeg}deg)`;

        // Titik Pusat Simpang
        const center = document.createElement("div");
        center.style.width = "14px";
        center.style.height = "14px";
        center.style.backgroundColor = "white";
        center.style.borderRadius = "50%";
        center.style.boxShadow = "0 0 15px white";
        center.style.zIndex = "10";
        container.appendChild(center);

        // Label Nama (Tidak ikut rotasi agar mudah dibaca -> perlu wrapper terpisah atau counter-rotate)
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        labelEl.style.position = "absolute";
        labelEl.style.top = "-60px";
        labelEl.style.backgroundColor = "rgba(0,0,0,0.8)";
        labelEl.style.color = "white";
        labelEl.style.padding = "4px 8px";
        labelEl.style.borderRadius = "4px";
        labelEl.style.fontSize = "12px";
        labelEl.style.fontWeight = "bold";
        labelEl.style.whiteSpace = "nowrap";
        labelEl.style.border = "1px solid #444";
        // Counter rotate agar teks tetap lurus horizontal
        labelEl.style.transform = `rotate(${-rotationDeg}deg)`; 
        container.appendChild(labelEl);

        // Fungsi Helper Kotak Lampu
        const createBox = (dir: string, x: number, y: number) => {
          const box = document.createElement("div");
          box.id = `${idPrefix}-${dir}`;
          box.style.position = "absolute";
          box.style.width = "32px";
          box.style.height = "32px";
          box.style.transform = `translate(${x}px, ${y}px)`; // Posisi relatif dari pusat
          box.style.backgroundColor = "#555"; // Default color
          box.style.border = "2px solid #fff";
          box.style.borderRadius = "6px";
          box.style.display = "flex";
          box.style.alignItems = "center";
          box.style.justifyContent = "center";
          box.style.color = "white";
          box.style.fontWeight = "800";
          box.style.fontSize = "12px";
          box.style.fontFamily = "monospace";
          box.style.zIndex = "5";
          box.style.transition = "background-color 0.2s";

          const span = document.createElement("span");
          span.id = `${idPrefix}-${dir}-timer`;
          span.innerText = "--";
          box.appendChild(span);
          
          return box;
        };

        // Posisi Kotak (Jarak 30px dari pusat)
        // Koordinat local: Y- negative is UP, Y+ is DOWN
        container.appendChild(createBox("north", 0, -35)); // Atas
        container.appendChild(createBox("south", 0, 35));  // Bawah
        container.appendChild(createBox("east", 35, 0));   // Kanan
        container.appendChild(createBox("west", -35, 0));  // Kiri

        return container;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        // KOORDINAT PRESISI
        const samsatCoords = [107.641889, -6.945306] as [number, number];
        const bubatCoords = [107.633417, -6.948028] as [number, number];

        // Buat Marker Samsat (Rotasi -12 derajat agar pas dengan jalan)
        new mapboxgl.Marker({ element: createHUDElement("samsat", "Samsat Kiaracondong", -12) })
          .setLngLat(samsatCoords)
          .addTo(map.current);

        // Buat Marker Buah Batu (Rotasi -12 derajat)
        new mapboxgl.Marker({ element: createHUDElement("bubat", "Buah Batu", -12) })
          .setLngLat(bubatCoords)
          .addTo(map.current);
          
        map.current.resize();
      });

      map.current.on("error", (e) => {
        if (e.error?.message?.includes("forbidden")) {
           setMapError("Token Invalid.");
           setIsLoading(false);
        }
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

  // --- RENDER ---
  return (
    <div className="flex-1 relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-border/50 shadow-sm">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* ERROR OVERLAY */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-4">
          <div className="text-destructive text-center font-bold">
            <AlertCircle className="mx-auto mb-2" />
            {mapError}
            <button 
              onClick={() => window.location.reload()}
              className="block mt-4 text-xs text-white underline"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* LEGEND POJOK KANAN BAWAH */}
      <div className="absolute bottom-5 right-5 z-40 bg-card/90 backdrop-blur p-3 rounded-lg border border-border shadow-lg max-w-[200px]">
        <h4 className="text-[10px] font-bold mb-2 uppercase text-foreground tracking-wider">Traffic Status</h4>
        <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="w-5 h-5 bg-green-500 border border-white rounded flex items-center justify-center text-[9px] text-white font-bold">25</div>
             <span className="text-[10px] text-muted-foreground">Green (Go)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-5 h-5 bg-red-500 border border-white rounded flex items-center justify-center text-[9px] text-white font-bold">60</div>
             <span className="text-[10px] text-muted-foreground">Red (Stop)</span>
           </div>
           <div className="mt-2 pt-2 border-t border-border">
             <p className="text-[9px] text-muted-foreground italic">
               *Angka menunjukkan sisa waktu (detik)
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
