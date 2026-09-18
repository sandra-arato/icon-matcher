import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { mkdirSync, writeFileSync } from "node:fs";
import { getIconGlyph } from "./icons";

export function renderIconToFile(iconName: string, title: string): string {
  const glyph = getIconGlyph(iconName);
  if (!glyph) throw new Error(`Unknown icon export: ${iconName}`);

  const svg = renderToStaticMarkup(
    createElement(HugeiconsIcon, { icon: glyph, size: 64, color: "#111111" }),
  );

  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  mkdirSync("output", { recursive: true });
  const path = `output/${slug || "icon"}.svg`;
  writeFileSync(path, svg, "utf8");
  return path;
}
