import type { ReactElement } from "react";
import { hugeiconsProvider } from "./hugeicons";
import { lucideProvider } from "./lucide";
import type { IconProvider, RenderOptions } from "./types";

/** Add a new icon family by implementing IconProvider and listing it here — nothing else changes. */
export const providers: IconProvider[] = [hugeiconsProvider, lucideProvider];

export interface QualifiedIcon {
  /** `${providerId}:${name}` — globally unique across every registered family. */
  qualifiedName: string;
  description: string;
}

/** The full flat list of icon concepts across every registered provider. No categorization, no filtering. */
export function getAllCandidates(): QualifiedIcon[] {
  return providers.flatMap((provider) =>
    provider.listIcons().map((icon) => ({
      qualifiedName: `${provider.id}:${icon.name}`,
      description: `${icon.description} (${provider.id})`,
    })),
  );
}

export function renderQualified(qualifiedName: string, opts: RenderOptions): ReactElement {
  const [providerId, ...rest] = qualifiedName.split(":");
  const name = rest.join(":");
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown icon provider: ${providerId}`);
  return provider.renderElement(name, opts);
}
