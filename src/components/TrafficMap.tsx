import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2 } from "lucide-react";
import { useTraffic, IntersectionState } from "@/contexts/TrafficContext";

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Gunakan Token Mapbox
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA";

  const [isLoading, setIsLoading] = useState(false);
  
  // Consume traffic light states from context
  const { samsatLights, bubatLights } = useTraffic();

  // --- UPDATE VISUAL DOM ---
  const updateMarkerDOM = (idPrefix: string, data: IntersectionState) => {
    const directions = ["north", "south", "east", "west"] as const;
    
    directions.forEach((dir) => {
      const box = document.getElementById(`${idPrefix}-${dir}`);
      const timerText = document.getElementById(`${idPrefix}-${dir}-timer`);
      
      if (box && timerText) {
        const { color, timer } = data[dir];
        
        const bgColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : "#22c55e";
        const borderColor = "#ffffff";
        const boxShadow = color === "green" 
          ? "0 0 12px rgba(34, 197, 94, 0.9)" 
          : color === "red" 
            ? "0 0 12px rgba(239, 68, 68, 0.6)" 
            : "none";
        
        // Transform scale untuk efek denyut saat aktif
        const transformScale = color === "green" ? "scale(1.15)" : "scale(1)";
        
        box.style.backgroundColor = bgColor;
        box.style.borderColor = borderColor;
        box.style.boxShadow = boxShadow;
        // Kita hanya mainkan scale, posisi (translate) sudah diatur saat inisialisasi
        box.style.transform = `translate(-50%, -50%) ${transformScale}`;
        
        timerText.innerText = timer.toString();
      }
    });
  };

  // Update DOM when light states change
  useEffect(() => {
    updateMarkerDOM("samsat", samsatLights);
    updateMarkerDOM("bubat", bubatLights);
  }, [samsatLights, bubatLights]);

  // --- INISIALISASI PETA ---
  useEffect(() => {
    if (map.current) return;

    setIsLoading(true);

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [107.6375, -6.9465],
        zoom: 15,
        pitch: 0,   // Pastikan 0 untuk tampilan 2D datar
        bearing: 0, 
        attributionControl: false,
      });

      // --- HELPER 1: Marker LAMPU ---
      const createLightsElement = (idPrefix: string, rotationDeg: number, dist: number = 42) => {
        const container = document.createElement("div");
        Object.assign(container.style, {
          position: "relative",
          width: "0px", height: "0px",
          display: "flex", alignItems: "center", justifyContent: "center",
          // HAPUS SEMUA ROTASI CSS DI SINI
          transform: "none" 
        });

        // Titik Tengah
        const center = document.createElement("div");
        Object.assign(center.style, {
          position: "absolute",
          width: "8px", height: "8px", 
          backgroundColor: "white", borderRadius: "50%",
          boxShadow: "0 0 8px white", zIndex: "1",
          transform: "translate(-50%, -50%)"
        });
        container.appendChild(center);

        // Rumus Rotasi 2D Manual
        const toRad = (deg: number) => deg * (Math.PI / 180);
        const rotatePoint = (x: number, y: number, angleDeg: number) => {
            const rad = toRad(angleDeg);
            const newX = x * Math.cos(rad) - y * Math.sin(rad);
            const newY = x * Math.sin(rad) + y * Math.cos(rad);
            return { x: newX, y: newY };
        };

        const createLight = (dir: string, originalX: number, originalY: number) => {
          // Hitung posisi X,Y berdasarkan sudut jalan
          const pos = rotatePoint(originalX, originalY, rotationDeg);

          const circle = document.createElement("div");
          circle.id = `${idPrefix}-${dir}`;
          Object.assign(circle.style, {
            position: "absolute",
            width: "30px", height: "30px",
            left: `${pos.x}px`, top: `${pos.y}px`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "#333", border: "2px solid #fff",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: "5", transition: "background-color 0.2s"
          });

          // Angka Timer
          const span = document.createElement("span");
          span.id = `${idPrefix}-${dir}-timer`;
          span.innerText = "--";
          Object.assign(span.style, {
            color: "white", 
            fontSize: "11px", 
            fontWeight: "800",
            fontFamily: "monospace",
            // FIX: Hapus rotasi di sini. Karena parent tidak di-rotate, angka otomatis lurus.
            transform: "none" 
          });

          circle.appendChild(span);
          return circle;
        };

        container.appendChild(createLight("north", 0, -dist));
        container.appendChild(createLight("south", 0, dist));
        container.appendChild(createLight("east", dist, 0));
        container.appendChild(createLight("west", -dist, 0));

        return container;
      };

      // --- HELPER 2: Marker LABEL (Nama Jalan) ---
      const createLabelElement = (label: string) => {
        const labelEl = document.createElement("div");
        labelEl.innerText = label;
        Object.assign(labelEl.style, {
          background: "rgba(0,0,0,0.85)", 
          color: "#fff",
          padding: "5px 10px", 
          borderRadius: "6px",
          fontSize: "11px", 
          fontWeight: "600",
          border: "1px solid rgba(255,255,255,0.2)",
          whiteSpace: "nowrap",
          pointerEvents: "none"
        });
        return labelEl;
      };

      map.current.on("load", () => {
        setIsLoading(false);
        if (!map.current) return;

        const samsatLoc = [107.641889, -6.945306] as [number, number];
        const bubatLoc = [107.633417, -6.948028] as [number, number];

        // --- SAMSAT ---
        // Marker Lampu (rotationAlignment 'map' agar posisi relatif X,Y nempel di peta)
        new mapboxgl.Marker({ 
          element: createLightsElement("samsat", -12), 
          rotationAlignment: 'map', 
          pitchAlignment: 'map'
        }).setLngLat(samsatLoc).addTo(map.current);

        // Marker Label (Offset ditambah jadi -85 agar tidak menumpuk)
        new mapboxgl.Marker({ 
          element: createLabelElement("Samsat Kiaracondong"),
          rotationAlignment: 'viewport', 
          pitchAlignment: 'viewport',
          offset: [0, -85] 
        }).setLngLat(samsatLoc).addTo(map.current);


        // --- BUAH BATU ---
        new mapboxgl.Marker({ 
          element: createLightsElement("bubat", -12),
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        }).setLngLat(bubatLoc).addTo(map.current);

        new mapboxgl.Marker({ 
          element: createLabelElement("Buah Batu"),
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
          offset: [0, -85]
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

      {/* Legend */}
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
