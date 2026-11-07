"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import { Crosshair, Layers3, Minus, Plus } from "lucide-react";
import type { Coordinates, Route } from "@/lib/types";

interface Props { route: Route; position: Coordinates; moving: boolean; active: boolean; demo: boolean }

function MapControls({ points, position, moving }: { points: Coordinates[]; position: Coordinates; moving: boolean }) {
  const map = useMap();
  const [follow, setFollow] = useState(false);
  const [visibleRoute, setVisibleRoute] = useState(true);
  useEffect(() => { if (points.length > 1) map.fitBounds(latLngBounds(points), { padding: [65, 60], maxZoom: 13 }); else map.setView(position, 12); }, [map, points]);
  useEffect(() => { if (follow) map.panTo(position, { animate: true, duration: 0.3 }); }, [map, follow, position]);
  useEffect(() => {
    const resize = () => map.invalidateSize();
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return <>
    {visibleRoute && points.length > 1 && <><Polyline positions={points} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.95, lineCap: "round" }}/><Polyline positions={points} pathOptions={{ color: "#10B981", weight: 5, opacity: 1, lineCap: "round" }}/></>}
    <div className="map-controls"><button onClick={() => map.zoomIn()} aria-label="Zoom in"><Plus size={18}/></button><button onClick={() => map.zoomOut()} aria-label="Zoom out"><Minus size={18}/></button><span/><button aria-label="Fit the full route" onClick={() => { setFollow(false); if (points.length > 1) map.fitBounds(latLngBounds(points), { padding: [65, 60] }); else map.setView(position, 13); }}><Layers3 size={17}/></button><button aria-label="Follow vehicle" aria-pressed={follow} className={follow ? "chosen" : ""} onClick={() => { setFollow(!follow); map.panTo(position); }}><Crosshair size={18}/></button><button className="route-toggle" aria-label="Toggle route line" aria-pressed={visibleRoute} onClick={() => setVisibleRoute(!visibleRoute)}><span className={visibleRoute ? "route-line" : "route-line muted-line"}/></button></div>
  </>;
}

export default function RouteMap({ route, position, moving, active, demo }: Props) {
  const [tileError, setTileError] = useState(false);
  const points = useMemo(() => route.coordinates, [route.coordinates]);
  const icon = useMemo(() => divIcon({
    className: "vehicle-map-marker",
    html: `<div class="vehicle-marker ${moving ? "moving" : ""}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17v3m10-3v3M5 15h14V7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v8Zm0-5h14M8 14h.01M16 14h.01M8 4V2h8v2"/></svg></div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  }), [moving]);
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return <div className="map-frame">
    <MapContainer center={position} zoom={12} zoomControl={false} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer url={tileUrl} attribution={attribution} eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }}/>
      <MapControls points={points} position={position} moving={moving}/>
      {points.length > 0 && <CircleMarker center={points[0]} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#10B981", fillOpacity: 1 }}><Tooltip direction="bottom" offset={[0, 10]} permanent className="stop-label">{route.origin.split(",")[0]}</Tooltip></CircleMarker>}
      {points.length > 1 && <CircleMarker center={points[points.length - 1]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0F172A", fillOpacity: 1 }}><Tooltip direction="top" offset={[0, -10]} permanent className="stop-label">{route.destination.split(",")[0]}</Tooltip></CircleMarker>}
      {active && <Marker position={position} icon={icon}><Tooltip direction="top" offset={[0, -22]}>{demo ? "Simulated vehicle" : "Active trip location"} · {route.driver_name}</Tooltip></Marker>}
    </MapContainer>
    <div className="map-journey-label"><span className="tiny-dot"/>{active ? "On the way to campus" : "Trip not streaming"}</div>
    <span className="map-demo-label">{demo ? "SAMPLE GPS" : "LIVE GPS"}</span>
    {tileError && <div className="map-tile-error">Map tiles are temporarily unavailable. Route coordinates and controls remain active.</div>}
  </div>;
}
