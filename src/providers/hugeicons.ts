import { createElement } from "react";
import * as HugeIcons from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { IconOption, IconProvider } from "./types";

function humanize(exportName: string): string {
  return exportName
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

let cached: IconOption[] | null = null;

/**
 * Ships against the free tier (`@hugeicons/core-free-icons`, ~6,700 icons, one style) since
 * that's public on npm. To use your licensed Pro packages, swap the import above for your
 * installed Pro style package (e.g. `@hugeicons/pro-stroke-rounded`) — nothing else here
 * needs to change, since the rest of the app only depends on the `IconProvider` shape.
 */
export const hugeiconsProvider: IconProvider = {
  id: "hugeicons",

  listIcons() {
    if (!cached) {
      cached = Object.keys(HugeIcons)
        .filter((key) => key.endsWith("Icon") && !key.endsWith("FreeIcons"))
        .map((name) => ({ name, description: humanize(name) }));
    }
    return cached;
  },

  renderElement(name, { size, color }) {
    const glyph = (HugeIcons as Record<string, IconSvgElement>)[name];
    if (!glyph) throw new Error(`Unknown hugeicons icon: ${name}`);
    return createElement(HugeiconsIcon, { icon: glyph, size, color });
  },
};
