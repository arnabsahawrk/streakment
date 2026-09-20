// Regenerates every app icon from the two SVG sources in public/icons/.
// Edit icon.svg / icon-maskable.svg, then: node scripts/make-icons.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const icons = path.join(root, "public", "icons");
const src = (name) => path.join(icons, name);

async function main() {
  await sharp(src("icon.svg")).resize(192, 192).png().toFile(src("icon-192.png"));
  await sharp(src("icon.svg")).resize(512, 512).png().toFile(src("icon-512.png"));
  await sharp(src("icon-maskable.svg")).resize(512, 512).png().toFile(src("icon-maskable-512.png"));
  await sharp(src("icon.svg")).resize(180, 180).png().toFile(src("apple-touch-icon.png"));

  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map((s) => sharp(src("icon.svg")).resize(s, s).png().toBuffer())
  );
  await writeFile(path.join(root, "src", "app", "favicon.ico"), await pngToIco(buffers));

  console.log("Icons regenerated.");
}
main().catch((e) => { console.error(e); process.exit(1); });
