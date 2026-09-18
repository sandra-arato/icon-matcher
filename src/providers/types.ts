import type { ReactElement } from "react";

export interface IconOption {
  /** Name within this provider only — combine with the provider's `id` to get a globally unique key. */
  name: string;
  /** Human-readable spaced-out form shown to the model as the option's description. */
  description: string;
}

export interface RenderOptions {
  size: number;
  color: string;
}

export interface IconProvider {
  /** Short unique key, e.g. "hugeicons", "lucide". Used as a prefix so icon names never collide across providers. */
  id: string;
  listIcons(): IconOption[];
  renderElement(name: string, opts: RenderOptions): ReactElement;
}
