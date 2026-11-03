import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { useTheme } from "@/app/theme";
import { reportCode, type Category, type Report } from "@bilcode/contracts";
import { cn } from "@/lib/utils";
import { categoryStyle, StatusBadge } from "./report-badges";

// Banda Aceh city centre; used only when there is nothing to show yet.
const DEFAULT_CENTER: [number, number] = [5.5535, 95.3215];
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

const pinIcon = (category?: Category) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:22px;height:22px;border-radius:999px 999px 999px 0;transform:rotate(-45deg);background:${
      category ? categoryStyle[category].color : "var(--primary)"
    };border:3px solid var(--card);box-shadow:0 1px 4px rgb(0 0 0 / .35)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 24],
    popupAnchor: [0, -22],
  });

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  // Re-fit only when the coordinates change, not on every new array identity.
  const key = points.map((p) => p.join()).join("|");
  useEffect(() => {
    const list = key
      ? key.split("|").map((p) => p.split(",").map(Number) as [number, number])
      : [];
    if (list.length > 1)
      map.fitBounds(L.latLngBounds(list), { padding: [32, 32], maxZoom: 15 });
    else if (list[0]) map.setView(list[0], 15);
  }, [map, key]);
  return null;
}

function PickPosition({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function ReportMap({
  reports = [],
  position,
  category,
  onPick,
  className,
}: {
  reports?: Report[];
  position?: [number, number];
  category?: Category;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const points = useMemo<[number, number][]>(
    () =>
      position ? [position] : reports.map((r) => [r.latitude, r.longitude]),
    [position, reports],
  );
  // Esri Gray Canvas needs no API key and has matching light/dark styles; labels are a separate layer.
  const canvas = `${ESRI}/World_${resolvedTheme === "dark" ? "Dark" : "Light"}_Gray`;
  return (
    <MapContainer
      center={points[0] ?? DEFAULT_CENTER}
      zoom={points.length ? 14 : 13}
      scrollWheelZoom={false}
      className={cn("h-full min-h-64 w-full rounded-xl", className)}
      aria-label="Peta lokasi laporan"
    >
      <TileLayer
        key={`${canvas}-base`}
        maxZoom={16}
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={`${canvas}_Base/MapServer/tile/{z}/{y}/{x}`}
      />
      <TileLayer
        key={`${canvas}-labels`}
        maxZoom={16}
        url={`${canvas}_Reference/MapServer/tile/{z}/{y}/{x}`}
      />
      <FitBounds points={points} />
      {onPick && <PickPosition onPick={onPick} />}
      {position && (
        <Marker
          icon={pinIcon(category)}
          position={position}
          title="Lokasi laporan"
          alt="Lokasi laporan"
        />
      )}
      {!position &&
        reports.map((r) => (
          <Marker
            key={r.id}
            icon={pinIcon(r.category)}
            position={[r.latitude, r.longitude]}
            title={`Lokasi ${r.title}`}
            alt={`Lokasi ${r.title}`}
          >
            <Popup>
              <div className="w-52 space-y-2">
                <img
                  src={r.photo.url}
                  alt=""
                  className="aspect-video w-full rounded-md object-cover"
                />
                <p className="m-0! text-sm leading-snug font-semibold">
                  {r.title}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={r.status} />
                  <Link
                    to={`/reports/${r.id}`}
                    className="text-xs font-semibold text-primary"
                  >
                    Buka {reportCode(r.number)}
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
