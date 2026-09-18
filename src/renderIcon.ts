import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderQualified } from "./providers/index";

export function renderIconToFile(qualifiedName: string, title: string): string {
  const element = renderQualified(qualifiedName, { size: 64, color: "#111111" });
  const svg = renderToStaticMarkup(element);

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
