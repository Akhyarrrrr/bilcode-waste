/** Web Mercator tile math for the key-free static map (Esri Gray Canvas tiles). */
export const TILE_SIZE = 256;

/** Global pixel position of a coordinate at a zoom level (256 px tiles). */
export function worldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.min(
    Math.max(Math.sin((latitude * Math.PI) / 180), -0.9999),
    0.9999,
  );
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export interface MapTile {
  key: string;
  x: number;
  y: number;
  /** Offset of the tile's top-left corner inside the viewport. */
  left: number;
  top: number;
}

/** Tiles covering a width x height viewport centred on the coordinate. */
export function tileLayout(
  latitude: number,
  longitude: number,
  zoom: number,
  width: number,
  height: number,
): MapTile[] {
  const center = worldPixel(latitude, longitude, zoom);
  // Whole-pixel origin keeps tile seams from showing hairlines.
  const originX = Math.round(center.x - width / 2);
  const originY = Math.round(center.y - height / 2);
  const count = 2 ** zoom;
  const tiles: MapTile[] = [];
  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  for (let ty = firstY; ty * TILE_SIZE < originY + height; ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = firstX; tx * TILE_SIZE < originX + width; tx++)
      tiles.push({
        key: `${tx}:${ty}`,
        x: ((tx % count) + count) % count,
        y: ty,
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
  }
  return tiles;
}

/** Esri Gray Canvas: a base layer plus a transparent label overlay; note the z/y/x order. */
export const tileUrl = (
  layer: "Base" | "Reference",
  dark: boolean,
  zoom: number,
  tile: MapTile,
) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? "Dark" : "Light"}_Gray_${layer}/MapServer/tile/${zoom}/${tile.y}/${tile.x}`;
