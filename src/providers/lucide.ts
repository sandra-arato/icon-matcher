import { createElement, type ComponentType } from "react";
import * as Lucide from "lucide-react";
import type { IconOption, IconProvider } from "./types";

function humanize(exportName: string): string {
  return exportName
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}

let cached: IconOption[] | null = null;

export const lucideProvider: IconProvider = {
  id: "lucide",

  listIcons() {
    if (!cached) {
      cached = Object.keys(Lucide)
        // Every icon is exported twice (e.g. "House" and "HouseIcon"); keep only the
        // "Icon"-suffixed alias, same convention as the hugeicons provider. Excludes the
        // non-icon "Icon" base component and the "createLucideIcon" factory function.
        .filter((key) => key.endsWith("Icon") && key !== "Icon" && typeof (Lucide as Record<string, unknown>)[key] === "object")
        .map((name) => ({ name, description: humanize(name) }));
    }
    return cached;
  },

  renderElement(name, { size, color }) {
    const Component = (Lucide as unknown as Record<string, ComponentType<{ size?: number; color?: string }>>)[name];
    if (!Component) throw new Error(`Unknown lucide icon: ${name}`);
    return createElement(Component, { size, color });
  },
};
