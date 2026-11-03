import { describe, expect, it } from "vitest";
import { TILE_SIZE, tileLayout, tileUrl, worldPixel } from "./tiles";

// Independent slippy-map formula (OSM wiki) to cross-check worldPixel.
function slippyTile(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const rad = (latitude * Math.PI) / 180;
  return {
    x: Math.floor(((longitude + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
    ),
  };
}

describe("static map tile math", () => {
  it("projects the origin to the centre of the world", () => {
    expect(worldPixel(0, 0, 0)).toEqual({ x: 128, y: 128 });
    expect(worldPixel(0, 0, 1)).toEqual({ x: 256, y: 256 });
  });

  it("matches the standard slippy tile index for Banda Aceh and Jakarta", () => {
    for (const [lat, lng] of [
      [5.5483, 95.3238],
      [-6.1754, 106.8272],
    ]) {
      const pixel = worldPixel(lat, lng, 16);
      expect({
        x: Math.floor(pixel.x / TILE_SIZE),
        y: Math.floor(pixel.y / TILE_SIZE),
      }).toEqual(slippyTile(lat, lng, 16));
    }
    expect(slippyTile(5.5483, 95.3238, 16)).toEqual({ x: 50121, y: 31756 });
  });

  it("covers the whole viewport and centres the coordinate", () => {
    const [lat, lng, zoom, width, height] = [5.5483, 95.3238, 16, 343, 180];
    const tiles = tileLayout(lat, lng, zoom, width, height);
    expect(Math.min(...tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
    expect(
      Math.max(...tiles.map((t) => t.left + TILE_SIZE)),
    ).toBeGreaterThanOrEqual(width);
    expect(
      Math.max(...tiles.map((t) => t.top + TILE_SIZE)),
    ).toBeGreaterThanOrEqual(height);
    expect(new Set(tiles.map((t) => t.key)).size).toBe(tiles.length);

    const pixel = worldPixel(lat, lng, zoom);
    const home = slippyTile(lat, lng, zoom);
    const tile = tiles.find((t) => t.x === home.x && t.y === home.y)!;
    // Viewport centre minus the tile's offset equals the coordinate's position in that tile.
    expect(width / 2 - tile.left).toBeCloseTo(pixel.x - home.x * TILE_SIZE, 0);
    expect(height / 2 - tile.top).toBeCloseTo(pixel.y - home.y * TILE_SIZE, 0);
  });

  it("wraps across the antimeridian and builds Esri z/y/x URLs per theme and layer", () => {
    const tiles = tileLayout(0, 179.999, 2, 300, 100);
    expect(tiles.some((t) => t.x === 0)).toBe(true);
    expect(tiles.every((t) => t.x >= 0 && t.x < 4)).toBe(true);
    const tile = { key: "", x: 1, y: 2, left: 0, top: 0 };
    expect(tileUrl("Base", false, 16, tile)).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/16/2/1",
    );
    expect(tileUrl("Reference", true, 16, tile)).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/16/2/1",
    );
  });
});
