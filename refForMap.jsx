import React, { useState, useEffect, useMemo } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import { Truck, MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "dummy_token_to_prevent_crash_in_dev";

// Bengaluru operational center view
const INITIAL_VIEW_STATE = {
  longitude: 77.61,
  latitude: 12.95,
  zoom: 11.5,
  pitch: 60,
  bearing: -10
};

// Dummy routes (simplified operational paths)
const routes = [
  {
    id: 'r1',
    color: '#2563EB', // blue
    path: [[77.53, 13.01], [77.58, 12.97], [77.61, 12.92], [77.63, 12.91]],
    tankerId: 'KA-01-HD-9922',
    eta: '8 mins'
  },
  {
    id: 'r2',
    color: '#10B981', // green
    path: [[77.68, 12.99], [77.65, 12.95], [77.61, 12.92]],
    tankerId: 'KA-03-MP-1102',
    eta: '4 mins'
  },
  {
    id: 'r3',
    color: '#8B5CF6', // purple
    path: [[77.55, 12.91], [77.59, 12.94], [77.62, 12.96], [77.66, 12.95]],
    tankerId: 'KA-51-AB-4050',
    eta: '12 mins'
  },
  {
    id: 'r4',
    color: '#F59E0B', // amber
    path: [[77.62, 13.02], [77.64, 12.99], [77.62, 12.96]],
    tankerId: 'KA-02-CD-5678',
    eta: '15 mins'
  }
];

// Helper to interpolate between points
const interpolate = (p1, p2, t) => {
  return [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t
  ];
};

const routeLayer = {
  id: 'routes',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 5,
    'line-opacity': 0.7
  }
};

const HeroLiveMap = () => {
  const [progress, setProgress] = useState(0);

  // Animation Loop
  useEffect(() => {
    let animationFrame;
    let lastTime = performance.now();
    
    const animate = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      
      // Speed multiplier. Adjust to make tankers move faster/slower
      const speed = 0.00003; 
      
      setProgress((prev) => {
        const next = prev + (delta * speed);
        return next > 1 ? 0 : next;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Compute current tanker positions based on progress
  const activeTankers = useMemo(() => {
    return routes.map((route, i) => {
      // Offset progress slightly so all tankers aren't at the exact same percentage
      const offsetProgress = (progress + (i * 0.25)) % 1;
      
      const segments = route.path.length - 1;
      const scaledProgress = offsetProgress * segments;
      const segmentIndex = Math.min(Math.floor(scaledProgress), segments - 1);
      const segmentProgress = scaledProgress - segmentIndex;
      
      const pos = interpolate(route.path[segmentIndex], route.path[segmentIndex + 1], segmentProgress);
      return {
        ...route,
        lng: pos[0],
        lat: pos[1]
      };
    });
  }, [progress]);

  const geoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: routes.map(r => ({
        type: 'Feature',
        properties: { color: r.color },
        geometry: {
          type: 'LineString',
          coordinates: r.path
        }
      }))
    };
  }, []);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "dummy_token_to_prevent_crash_in_dev") {
    return <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">Mapbox Token Required</div>;
  }

  return (
    <div className="w-full h-full relative bg-[#F8FAFC]">
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
      >
        {/* Render Routes */}
        <Source id="routes" type="geojson" data={geoJSON}>
          <Layer {...routeLayer} />
        </Source>

        {/* Tanker Markers */}
        {activeTankers.map((tanker) => (
          <Marker 
            key={tanker.id} 
            longitude={tanker.lng} 
            latitude={tanker.lat} 
            anchor="bottom"
            style={{zIndex: 10}}
          >
            <div className="flex flex-col items-center cursor-pointer group">
              {/* ETA Bubble */}
              <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded shadow-premium text-[11px] font-bold text-content-primary mb-1 border border-surface-border whitespace-nowrap transition-transform group-hover:-translate-y-1 group-hover:scale-105">
                {tanker.tankerId} <span className="text-content-secondary font-medium mx-1">|</span> <span className="text-primary-blue">{tanker.eta}</span>
              </div>
              {/* Tanker Icon */}
              <div className="w-9 h-9 rounded-full bg-primary-blue shadow-[0_0_15px_rgba(37,99,235,0.4)] border-[2.5px] border-white flex items-center justify-center relative">
                <Truck className="w-4.5 h-4.5 text-white" />
                <div className="absolute inset-0 rounded-full border-2 border-primary-blue animate-ping opacity-60"></div>
              </div>
            </div>
          </Marker>
        ))}

        {/* Delivery Destination Markers (Ends of routes) */}
        {routes.map(route => {
          const endPoint = route.path[route.path.length - 1];
          return (
            <Marker key={`${route.id}-dest`} longitude={endPoint[0]} latitude={endPoint[1]} anchor="center">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center relative">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm z-10"></div>
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
};

export default HeroLiveMap;