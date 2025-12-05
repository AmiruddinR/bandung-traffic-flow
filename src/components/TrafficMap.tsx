import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// --- DATA TYPES ---
type LightStatus = {
  color: "red" | "yellow" | "green";
  timer: number;
};

type IntersectionState = {
  north: LightStatus;
  south: LightStatus;
  east: LightStatus;
  west: LightStatus;
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

  // --- STATE TRAFFIC LIGHT (Simulasi Data ML) ---
  const [samsatState, setSamsatState] = useState<IntersectionState>({
    north: { color: "red", timer: 45 },
    south: { color: "green", timer: 20 },
    east: { color: "red", timer: 60 },
    west: { color: "red", timer: 60 },
  });

  const [bubatState, setBubatState] = useState<IntersectionState>({
    north: { color: "green", timer: 30 },
    south: { color: "red", timer: 85 },
    east: { color: "red", timer: 40 },
    west: { color: "green", timer: 30 }, // Belok kiri jalan terus misal
  });

  // --- 1. FUNGSI UPDATE DOM MARKER (Agar performa ringan) ---
  const updateMarkerVisuals = (idPrefix: string, state: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const el = document.getElementById(`${idPrefix}-${dir}`);
      const timerEl = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (el && timerEl) {
        const { color, timer } = state[dir];
        
        // Update Warna Background
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const shadow = color === "green" ? "0 0 15px #22c55e" : "none";
        
        el.style.backgroundColor = bgColor;
        el.style.boxShadow = shadow;
        el.style.borderColor = color === "red" ? "#991b1b" : "#fff";
        
        // Update Angka Timer
        timerEl.innerText = timer.toString();
      }
    });
  };

  // --- 2. LOGIKA SIMULASI COUNTDOWN ---
  useEffect(() => {
    const timer = setInterval(() => {
      // Helper untuk logika lampu sederhana (decrement timer, ganti warna kalau 0)
      const cycleLight = (prev: IntersectionState): IntersectionState => {
        const next = { ...prev };
        (["north", "south", "east", "west"] as const).forEach((dir) => {
          if (next[dir].timer > 0) {
            next[dir].timer -= 1;
          } else {
            // Reset cycle sederhana
            next[dir].color = next[dir].color === "red" ? "green" : "red";
            next[dir].timer = next[dir].color === "green" ? 30 : 60;
          }
        });
        return next;
      };

      setSamsatState(prev => cycleLight(prev));
      setBubatState(prev => cycleLight(prev));

    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- 3. SYNC STATE REACT KE PETA ---
  useEffect(() => {
    if(!map.current) return;
    updateMarkerVisuals("samsat", samsatState);
    updateMarkerVisuals("bubat", bubatState);
  }, [samsatState, bubatState]);


  // --- 4. INISIALISASI PETA & PEMBUATAN MARKER HTML ---
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
        center: [107.6375, -6.9465], 
        zoom: 14.5, // Zoom ideal untuk melihat 2 simpang
        pitch: 0,   // Tegak lurus (2D) agar posisi akurat
        attributionControl: false,
      });

      // --- FUNGSI MEMBUAT ELEMEN HTML MARKER (HUD) ---
      const createHUDMarker = (idPrefix: string, label: string) => {
        const container = document.createElement("div");
        container.className = "traffic-hud-container";
        container.style.position = "relative";
        container.style.width = "0px";
        container.style.height = "0px";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";

        // Titik Tengah (Pusat Simpang)
        const centerDot = document.createElement("div");
        centerDot.style.width = "12px";
        centerDot.style.height = "12px";
        centerDot.style.backgroundColor = "white";
        centerDot.style.borderRadius = "50%";
        centerDot.style.boxShadow = "0 0 10px white";
        centerDot.style.zIndex = "10";
        container.appendChild(centerDot);

        // Label Nama Simpang
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        labelEl.style.position = "absolute";
        labelEl.style.top = "-50px";
        labelEl.style.whiteSpace = "nowrap";
        labelEl.style.color = "white";
        labelEl.style.fontWeight = "bold";
        labelEl.style.textShadow = "0 2px 4px black";
        labelEl.style.fontSize = "12px";
        labelEl.style.background = "rgba(0,0,0,0.7)";
        labelEl.style.padding = "2px 8px";
        labelEl.style.borderRadius = "4px";
        container.appendChild(labelEl);

        // Helper untuk membuat kotak lampu
        const createLightBox = (dir: string, dx: string, dy: string) => {
          const box = document.createElement("div");
          box.id = `${idPrefix}-${dir}`; // ID unik: samsat-north
          box.style.position = "absolute";
          box.style.width = "28px";
          box.style.height = "28px";
          box.style.transform = `translate(${dx}, ${dy})`;
          box.style.borderRadius = "6px";
          box.style.border = "2px solid #555";
          box.style.display = "flex";
          box.style.alignItems = "center";
          box.style.justifyContent = "center";
          box.style.color = "white";
          box.style.fontWeight = "bold";
          box.style.fontSize = "11px";
          box.style.transition = "background-color 0.3s";
          box.style.zIndex = "5";
          
          const timerSpan = document.createElement("span");
          timerSpan.id = `${idPrefix}-${dir}-timer`;
          timerSpan.innerText = "--";
          box.appendChild(timerSpan);

          return box;
        };

        // Posisi 4 Arah (Pixel Offset dari tengah)
        // Utara (Atas), Selatan (Bawah), Timur (Kanan), Barat (Kiri)
        container.appendChild(createLightBox("north", "0px", "-25px"));
        container.appendChild(createLightBox("south", "0px", "25px"));
        container.appendChild(createLightBox("east", "25px", "0px"));
        container.appendChild(createLightBox("west", "-25px", "0px"));

        return container;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        // KOORDINAT PRESISI (Decimal)
        const samsatCoords = [107.641889, -6.945306] as [number, number];
        const bubatCoords = [107.633417, -6.948028] as [number, number];

        // Tambahkan Marker Samsat
        new mapboxgl.Marker({ element: createHUDMarker("samsat", "Samsat Kiaracondong") })
          .setLngLat(samsatCoords)
          .addTo(map.current);

        // Tambahkan Marker Buah Batu
        new mapboxgl.Marker({ element: createHUDMarker("bubat", "Buah Batu") })
          .setLngLat(bubatCoords)
          .addTo(map.current);

        // Force Resize
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
      console.error("Map Init Error:", error);
      setMapError("Gagal memuat peta.");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, tokenSubmitted]);

  // --- RENDER UI ---
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

      {/* ERROR MESSAGE */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-4">
          <div className="text-destructive text-center font-bold">
            <AlertCircle className="mx-auto mb-2" />
            {mapError}
          </div>
        </div>
      )}

      {/* LEGEND SEDERHANA */}
      <div className="absolute bottom-5 left-5 z-40 bg-card/90 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
        <h4 className="text-xs font-bold mb-2 uppercase text-foreground">Traffic Light Status</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-white/20 bg-green-500 text-[8px] text-white flex items-center justify-center font-bold">20</div>
            <span>Green (Go)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-white/20 bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">45</div>
            <span>Red (Stop)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
