import * as HugeIcons from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface IconEntry {
  /** Export name from the icon package, e.g. "AccountRecoveryIcon" — also the lookup key for rendering. */
  name: string;
  /** Human-readable spaced-out form, e.g. "Account Recovery" — shown to the model as the option description. */
  description: string;
}

function humanize(exportName: string): string {
  return exportName
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

let allIcons: IconEntry[] | null = null;

/** The full flat list of icon concepts available in the installed package. No categorization, no filtering. */
export function getAllIcons(): IconEntry[] {
  if (!allIcons) {
    allIcons = Object.keys(HugeIcons)
      .filter((key) => key.endsWith("Icon") && !key.endsWith("FreeIcons"))
      .map((name) => ({ name, description: humanize(name) }));
  }
  return allIcons;
}

export function getIconGlyph(name: string): IconSvgElement | undefined {
  return (HugeIcons as Record<string, IconSvgElement>)[name];
}
