import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// --- MASUKKAN TOKEN MAPBOX ANDA DI SINI ---
const MAPBOX_TOKEN = "pk.eyJ1IjoiYW1pcnVkZGluciIsImEiOiJjbWlndXkwOHMwYnlmM2twbGd4NTZtcDJqIn0.XeXOdO7CygNuVKhv7W8FnA"; // Ganti tulisan ini dengan token asli Anda (pk....)
// ------------------------------------------

type TrafficLightColor = "red" | "yellow" | "green";

interface TrafficLightState {
  color: TrafficLightColor;
  countdown: number;
}

const TrafficMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Traffic light states
  const [light1, setLight1] = useState<TrafficLightState>({ color: "green", countdown: 45 });
  const [light2, setLight2] = useState<TrafficLightState>({ color: "red", countdown: 52 });

  // Logic Timer Lampu
  useEffect(() => {
    const timer = setInterval(() => {
      setLight1((prev) => {
        if (prev.countdown > 1) return { ...prev, countdown: prev.countdown - 1 };
        if (prev.color === "green") return { color: "yellow", countdown: 5 };
        if (prev.color === "yellow") return { color: "red", countdown: 50 };
        return { color: "green", countdown: 45 };
      });

      setLight2((prev) => {
        if (prev.countdown > 1) return { ...prev, countdown: prev.countdown - 1 };
        if (prev.color === "green") return { color: "yellow", countdown: 5 };
        if (prev.color === "yellow") return { color: "red", countdown: 45 };
        return { color: "green", countdown: 50 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getColorHex = (color: TrafficLightColor) => {
    switch (color) {
      case "red": return "#ff0066";
      case "yellow": return "#ffcc00";
      case "green": return "#00ff88";
    }
  };

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Set Token secara langsung
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [107.636, -6.936], // Koordinat tengah antara Samsat & Buah Batu
      zoom: 13.5, // Zoom sedikit dijauhkan agar kedua simpang terlihat
      pitch: 45,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      const kiaracondong = [107.6385, -6.9297]; 
      const buahBatu = [107.6338, -6.9432]; 

      // --- Fungsi Membuat Marker ---
      const createMarkerElement = (lightId: number) => {
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.id = `marker-${lightId}`;
        el.style.width = "60px";
        el.style.height = "80px";
        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 50px; height: 50px; background: rgba(0, 212, 255, 0.2); border: 2px solid #00d4ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);">
              <div id="light-indicator-${lightId}" style="width: 20px; height: 20px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 15px currentColor;"></div>
            </div>
            <div id="countdown-${lightId}" style="margin-top: 4px; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 14px; font-weight: bold; color: white;">45</div>
          </div>
        `;
        return el;
      };

      // Tambah Marker
      new mapboxgl.Marker({ element: createMarkerElement(1) })
        .setLngLat(kiaracondong as [number, number])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div class="text-center p-2 text-black"><strong>Samsat Kiaracondong</strong><br/>Status: Flowing</div>'))
        .addTo(map.current);

      new mapboxgl.Marker({ element: createMarkerElement(2) })
        .setLngLat(buahBatu as [number, number])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div class="text-center p-2 text-black"><strong>Simpang Buah Batu</strong><br/>Status: Moderate</div>'))
        .addTo(map.current);

      // Tambah Garis Rute (Sync Line)
      if (!map.current.getSource("route")) {
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: [kiaracondong, buahBatu] },
            },
          });

          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#00ff88", "line-width": 4, "line-opacity": 0.8 },
          });
      }
    });

    return () => { map.current?.remove(); };
  }, []); 

  // Update Indikator Lampu
  useEffect(() => {
    const updateIndicator = (lightId: number, state: TrafficLightState) => {
      const indicator = document.getElementById(`light-indicator-${lightId}`);
      const countdown = document.getElementById(`countdown-${lightId}`);
      if (indicator) indicator.style.background = getColorHex(state.color);
      if (countdown) {
        countdown.textContent = state.countdown.toString();
        countdown.style.color = getColorHex(state.color);
      }
    };
    updateIndicator(1, light1);
    updateIndicator(2, light2);
  }, [light1, light2]);

  return (
    <div className="flex-1 relative">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Status Overlay */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-lg max-w-xs z-10">
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
