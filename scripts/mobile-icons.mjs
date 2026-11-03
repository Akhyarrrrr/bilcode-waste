import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// The Bilcode glyph is the first path of the official wordmark SVG.
const source = await readFile(
  new URL("../apps/mobile/assets/brand/Bilcode.svg", import.meta.url),
  "utf8",
);
const d = source.match(/<path d="([^"]+)"/)?.[1];
if (!d) throw new Error("Bilcode glyph path not found in Bilcode.svg");
const glyph = (fill, x, y, width) =>
  `<svg x="${x}" y="${y}" width="${width}" height="${(width * 129) / 152}" viewBox="-2 -2 152 129"><path d="${d}" fill="${fill}"/></svg>`;

const emerald = "#047857";
const outputs = [
  // name, background, glyph colour, glyph width (centred on 1024)
  [
    "app-icon",
    `<rect width="1024" height="1024" fill="${emerald}"/>`,
    "#FFFFFF",
    560,
  ],
  ["adaptive-icon", "", "#FFFFFF", 440],
  ["splash-icon", "", emerald, 760],
  ["splash-icon-dark", "", "#34D399", 760],
];
const directory = new URL("../apps/mobile/assets/brand/", import.meta.url);
for (const [name, background, fill, width] of outputs) {
  const height = (width * 129) / 152;
  const vector = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${background}${glyph(fill, (1024 - width) / 2, (1024 - height) / 2, width)}</svg>`;
  await sharp(Buffer.from(vector))
    .withMetadata({
      comments: [
        "Official Bilcode SVG https://bilcode.id/Bilcode.svg; glyph path only, recoloured.",
      ],
    })
    .png()
    .toFile(fileURLToPath(new URL(`${name}.png`, directory)));
  await writeFile(
    new URL(`${name}.png.source.md`, directory),
    `# Bilcode glyph (${name})\n\nSource: <https://bilcode.id/Bilcode.svg>, supplied by the user.\n\nDeterministic rasterization by scripts/mobile-icons.mjs: only the glyph path of the official artwork, recoloured ${fill}${background ? ` on ${emerald}` : " on a transparent background"}, centred on a 1024 px canvas. No generated illustration.\n`,
  );
}
