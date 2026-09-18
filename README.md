# icon-matcher

Type a UI section title, get back the icon that best represents it — searched across
multiple icon families ([Hugeicons](https://hugeicons.com), [Lucide](https://lucide.dev))
at once, matched by [TypeSafe.ai](https://docs.typesafe.ai)'s `Choice` primitive, not by
keyword/lexical search.

```
$ npm run match -- "audience"
Matching icon for: "audience"...
-> <a users/people icon, from whichever family fit best>  (confidence: 0.78, high)
Saved SVG to output/audience.svg
```
(illustrative — the actual icon name/confidence depends on the model's response)

## Why not just search?

The mapping is often a conceptual leap with zero shared words: "channels" → a mobile-phone
icon, "brief" → a document icon, "audience" → a multiple-users icon. No fuzzy or keyword
search finds those pairs, because the words don't overlap at all. This needs real semantic
judgment at every step — across every icon family being searched, not just one.

## How it works

TypeSafe's `Choice` primitive caps out at 255 options per question, but the combined icon
set (Hugeicons free tier + Lucide) is ~8,800 concepts. So the combined list is split into
~37 shards of 240 (plus a `none_of_these` option each). Sending all of them as parallel
questions in a single call sounds free — TypeSafe's docs say extra questions in one call
don't add latency — but in practice a request that large gets rejected with a "max tokens
exceeded" error well before the documented ~32k input-token budget is reached (observed
failure: 718 input tokens). The real constraint seems to be output size — a probability per
option, across every option in the request — which scales with option *count*, not
description length.

Since there's no documented threshold for this, `matchIcon.ts` discovers it at runtime:
shards are grouped into "waves" (one API call each, run in parallel), and a wave that hits
this error gets split in half and retried, recursively, until it fits. The safe size is
cached after the first discovery, so later matches skip straight to it instead of
rediscovering it every time. Every icon from every family still gets a real model judgment
either way — nothing is pre-filtered by string matching, and shards freely mix families.

Each shard returns a confidence score (how peaked vs. flat its probability distribution is).
The highest-confidence shard's pick wins — regardless of which family it came from — and if
the top two are close, one small tie-break `Choice` call directly compares them, even across
families. See `src/matchIcon.ts`.

None of this needs scraping or an offline build step — each family's icon list is read
straight from its npm package's exports at startup.

### Adding another icon family

Icon families are pluggable. Each one implements the small `IconProvider` interface in
`src/providers/types.ts`:

```ts
interface IconProvider {
  id: string; // short unique key, e.g. "lucide" — prefixes every icon name so families never collide
  listIcons(): { name: string; description: string }[];
  renderElement(name: string, opts: { size: number; color: string }): ReactElement;
}
```

`src/providers/hugeicons.ts` and `src/providers/lucide.ts` are the two reference
implementations — both just read `Object.keys(iconPackage)` at startup, no metadata files
involved. To add a family (Heroicons, Tabler, your own icon set, ...), write a new file in
`src/providers/` implementing that interface and add it to the `providers` array in
`src/providers/index.ts`. Everything else — sharding, matching, rendering, the CLI — is
already family-agnostic.

## Setup

Requires Node.js 20.6+ (uses `node --env-file`) and a [TypeSafe.ai](https://typesafe.ai) API key.

```bash
npm install
cp .env.example .env   # then fill in TYPESAFE_API_KEY
```

## Usage

```bash
npm run match -- "channels"
npm run match -- "brief"
npm run match -- "audience"
```

Prints the matched icon (as `<family>:<name>`), its confidence, and (when confidence is
only medium) the runner-up candidates. Also writes the rendered icon to `output/<slug>.svg`.

## Using the licensed Hugeicons Pro set

This demo ships against Hugeicons' free tier (`@hugeicons/core-free-icons`, ~6,700 icons,
one style) since that's public on npm. To use your company's licensed Pro packages (60,000
icons, 10 styles):

1. Install the Pro style package(s) from your Hugeicons registry, e.g. `@hugeicons/pro-stroke-rounded`.
2. In `src/providers/hugeicons.ts`, change the `import * as HugeIcons from "@hugeicons/core-free-icons"`
   line to import from your installed Pro package instead — nothing else needs to change,
   since the rest of the app only depends on the `IconProvider` shape.

## License

[MIT](LICENSE) — icons themselves remain under each family's own license
([Hugeicons](https://hugeicons.com/license), [Lucide](https://lucide.dev/license) — ISC).
