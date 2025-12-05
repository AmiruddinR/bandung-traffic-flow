import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

  // --- STATE TRAFFIC LIGHT (Data Dummy yang Lebih Realistis) ---
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

  // --- 1. LOGIKA UPDATE DOM (Ringan) ---
  const updateMarkerDOM = (idPrefix: string, data: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const box = document.getElementById(`${idPrefix}-${dir}`);
      const timerText = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (box && timerText) {
        const { color, timer } = data[dir];
        
        // Warna & Glow Effect
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const borderColor = color === "green" ? "#ffffff" : "#333";
        const boxShadow = color === "green" ? "0 0 15px rgba(34, 197, 94, 0.8)" : "none";
        
        box.style.backgroundColor = bgColor;
        box.style.borderColor = borderColor;
        box.style.boxShadow = boxShadow;
        timerText.innerText = timer.toString();
      }
    });
  };

  // --- 2. SIMULASI LOGIKA FASE (Integrasi Mockup) ---
  useEffect(() => {
    // Fungsi ini mensimulasikan logika "Backend" sederhana
    // Fase 1: Utara-Selatan Hijau, Timur-Barat Merah
    // Fase 2: Utara-Selatan Merah, Timur-Barat Hijau
    const interval = setInterval(() => {
      const updatePhase = (prev: IntersectionState): IntersectionState => {
        const next = { ...prev };
        
        // Kurangi Timer Semua Arah
        (["north", "south", "east", "west"] as const).forEach(dir => {
            if (next[dir].timer > 0) {
                next[dir].timer -= 1;
            }
        });

        // Logika Pergantian Fase (Sederhana)
        // Jika timer Utara habis (0), tukar fase
        if (next.north.timer === 0) {
            const isNorthGreen = next.north.color === "green";
            
            // Tukar Warna
            next.north.color = isNorthGreen ? "red" : "green";
            next.south.color = isNorthGreen ? "red" : "green";
            next.east.color = isNorthGreen ? "green" : "red";
            next.west.color = isNorthGreen ? "green" : "red";

            // Reset Timer
            next.north.timer = isNorthGreen ? 60 : 30; // Merah lebih lama
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

  // Sync React State ke DOM
  useEffect(() => {
    updateMarkerDOM("samsat", samsatData);
    updateMarkerDOM("bubat", bubatData);
  }, [samsatData, bubatData]);

  // --- 3. MAPBOX INITIALIZATION ---
  useEffect(() => {
    if (!tokenSubmitted || !mapboxToken || mapboxToken.length < 10) return;
    if (map.current) return;

    setIsLoading(true);
    setMapError(null);

    try {
      mapboxgl.accessToken = mapboxToken.trim();

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [107.6375, -6.9465],
        zoom: 14.8, // Sedikit lebih dekat
        pitch: 0,   // Tegak lurus (2D)
        attributionControl: false,
      });

      // --- PEMBUATAN MARKER (LINGKARAN & MANUAL POSITION) ---
      const createHUDElement = (
        idPrefix: string, 
        label: string, 
        rotationDeg: number,
        distance: number = 35 // Jarak lampu dari titik tengah (manual adjust)
      ) => {
        // Container Utama (Diputar sesuai arah jalan)
        const container = document.createElement("div");
        container.className = "traffic-hud";
        container.style.position = "relative";
        container.style.width = "0px"; 
        container.style.height = "0px";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.transform = `rotate(${rotationDeg}deg)`; // Rotasi Container

        // Titik Tengah (Putih)
        const center = document.createElement("div");
        center.style.width = "10px";
        center.style.height = "10px";
        center.style.backgroundColor = "white";
        center.style.borderRadius = "50%";
        center.style.boxShadow = "0 0 10px white";
        center.style.zIndex = "10";
        container.appendChild(center);

        // Label Nama Jalan (Counter-Rotate agar lurus)
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        labelEl.style.position = "absolute";
        labelEl.style.top = "-70px"; // Geser ke atas
        labelEl.style.background = "rgba(0,0,0,0.7)";
        labelEl.style.color = "#fff";
        labelEl.style.padding = "4px 8px";
        labelEl.style.borderRadius = "4px";
        labelEl.style.fontSize = "11px";
        labelEl.style.fontWeight = "bold";
        labelEl.style.whiteSpace = "nowrap";
        labelEl.style.transform = `rotate(${-rotationDeg}deg)`; // Luruskan teks
        container.appendChild(labelEl);

        // Fungsi Helper Lampu Bulat
        const createLightCircle = (dir: string, x: number, y: number) => {
          const circle = document.createElement("div");
          circle.id = `${idPrefix}-${dir}`;
          circle.style.position = "absolute";
          circle.style.width = "28px";  // Ukuran Lampu
          circle.style.height = "28px"; // Ukuran Lampu
          circle.style.transform = `translate(${x}px, ${y}px)`;
          circle.style.backgroundColor = "#555";
          circle.style.border = "2px solid #fff";
          circle.style.borderRadius = "50%"; // JADI BULAT
          circle.style.display = "flex";
          circle.style.alignItems = "center";
          circle.style.justifyContent = "center";
          circle.style.zIndex = "5";
          circle.style.transition = "background-color 0.2s";

          // Text Angka
          const span = document.createElement("span");
          span.id = `${idPrefix}-${dir}-timer`;
          span.innerText = "--";
          span.style.color = "white";
          span.style.fontSize = "11px";
          span.style.fontWeight = "bold";
          span.style.fontFamily = "monospace";
          // PENTING: Counter-rotate angka agar selalu horizontal
          span.style.transform = `rotate(${-rotationDeg}deg)`;
          span.style.display = "block";

          circle.appendChild(span);
          return circle;
        };

        // Posisi Lampu (Bisa diatur manual via parameter 'distance')
        // Koordinat CSS: Y- (Atas), Y+ (Bawah), X+ (Kanan), X- (Kiri)
        container.appendChild(createLightCircle("north", 0, -distance)); 
        container.appendChild(createLightCircle("south", 0, distance));  
        container.appendChild(createLightCircle("east", distance, 0));   
        container.appendChild(createLightCircle("west", -distance, 0));  

        return container;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        const samsatCoords = [107.641889, -6.945306] as [number, number];
        const bubatCoords = [107.633417, -6.948028] as [number, number];

        // RENDER MARKER
        // Parameter: id, label, rotasi (derajat), jarak_lampu_dari_pusat (pixel)
        
        // Samsat: Rotasi -12 derajat, Jarak lampu 40px
        new mapboxgl.Marker({ element: createHUDElement("samsat", "Samsat Kiaracondong", -12, 40) })
          .setLngLat(samsatCoords)
          .addTo(map.current);

        // Bubat: Rotasi -12 derajat, Jarak lampu 40px
        new mapboxgl.Marker({ element: createHUDElement("bubat", "Buah Batu", -12, 40) })
          .setLngLat(bubatCoords)
          .addTo(map.current);

        map.current.resize();
      });

    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }, [tokenSubmitted]);

  return (
    // FIX HEIGHT: Dikurangi jadi h-[450px]
    <div className="flex-1 relative w-full h-[450px] overflow-hidden rounded-xl border border-border/50 shadow-sm bg-background">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* LEGEND YANG DIPERBAIKI (Tanpa Angka Statis) */}
      <div className="absolute bottom-4 left-4 z-40 bg-card/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
        <h4 className="text-[10px] font-bold mb-2 uppercase text-foreground">Traffic Indicators</h4>
        <div className="flex items-center gap-4">
           {/* Item Hijau */}
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                <span className="text-[9px] text-white font-bold">##</span>
             </div>
             <span className="text-[10px] font-medium text-muted-foreground">Green (Go)</span>
           </div>
           
           {/* Item Merah */}
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                <span className="text-[9px] text-white font-bold">##</span>
             </div>
             <span className="text-[10px] font-medium text-muted-foreground">Red (Stop)</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
