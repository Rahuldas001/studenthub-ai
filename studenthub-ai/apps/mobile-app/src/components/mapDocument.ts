import type { PlaceSummary } from '@studenthub/types';
import { COLLEGE } from '../services/places';

export interface MapProps {
  places: PlaceSummary[];
  /** Optional device location (lat,lng) shown as a pulsing dot and used as the map center. */
  userLocation?: { latitude: number; longitude: number } | null;
}

/** Haversine distance in km between two coordinates. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

// Encode untrusted listing text before embedding JSON inside an HTML script.
export function mapDocument(places: PlaceSummary[], userLocation?: { latitude: number; longitude: number } | null): string {
  const data = JSON.stringify(places.map(({ name, latitude, longitude, category }) =>
    ({ name, latitude, longitude, category }))).replace(/</g, '\\u003c');
  const user = userLocation ?? null;
  const center = user ? [user.latitude, user.longitude] : [COLLEGE.latitude, COLLEGE.longitude];
  const zoom = user ? 15 : 14;
  const userDot = user
    ? `L.circleMarker([${user.latitude},${user.longitude}],{radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).addTo(map).bindPopup('You are here');`
    : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}body{font:13px system-ui;background:#ede9fe}#status{position:absolute;z-index:1000;bottom:26px;left:8px;background:white;padding:6px;border-radius:8px}.leaflet-control-zoom a{min-width:44px;min-height:44px;line-height:44px}</style></head>
<body><div id="map" aria-label="Places near Gauhati University"></div><div id="status" role="status">Loading map…</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const status=document.getElementById('status');
if(!window.L){status.textContent='Map unavailable. Check your connection; place cards are below.';}
else {
const map=L.map('map',{scrollWheelZoom:false}).setView([${center[0]},${center[1]}],${zoom});
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
tiles.on('tileerror',()=>{status.textContent='Map tiles unavailable. Markers and place cards still work.';});
function marker(lat,lng,label,color){
 const text=document.createElement('strong');text.textContent=label;
 return L.circleMarker([lat,lng],{radius:11,color:'#fff',weight:3,fillColor:color,fillOpacity:1}).addTo(map).bindPopup(text);
}
marker(${COLLEGE.latitude},${COLLEGE.longitude},'Gauhati University','#4c1d95');
${userDot}
const colors={PG:'#7c3aed',HOSTEL:'#2563eb',RESTAURANT:'#ea580c',CAFE:'#db2777'};
const places=${data};
places.forEach(p=>{if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))marker(p.latitude,p.longitude,p.name+' · '+p.category,colors[p.category]||'#059669');});
status.textContent=places.length+' places · tap a marker';
}
</script></body></html>`;
}