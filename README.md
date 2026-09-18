# icon-matcher

Type a UI section title, get back the [Hugeicons](https://hugeicons.com) icon that best
represents it — matched by [TypeSafe.ai](https://docs.typesafe.ai)'s `Choice` primitive,
not by keyword/lexical search.

```
$ npm run match -- "audience"
Matching icon for: "audience"...
-> <a users/people icon>  (confidence: 0.78, high)
Saved SVG to output/audience.svg
```
(illustrative — the actual icon name/confidence depends on the model's response)

## Why not just search?

The mapping is often a conceptual leap with zero shared words: "channels" → a mobile-phone
icon, "brief" → a document icon, "audience" → a multiple-users icon. No fuzzy or keyword
search finds those pairs, because the words don't overlap at all. This needs real semantic
judgment at every step.

## How it works

TypeSafe's `Choice` primitive caps out at 255 options per question, but the icon pack has
~6,700 concepts. So the ~6,700 icons are split into ~28 shards of 240 (plus a `none_of_these`
option each), and **all shards are sent as parallel `Choice` questions in a single API call**
— extra questions in one call don't add latency, so this is one round trip, and every icon
gets a real model judgment (nothing is pre-filtered by string matching).

Each shard returns a confidence score (how peaked vs. flat its probability distribution is).
The highest-confidence shard's pick wins; if the top two are close, one small tie-break
`Choice` call directly compares them. See `src/matchIcon.ts`.

The icon list itself needs no scraping or offline build step — it's read straight from the
installed `@hugeicons/core-free-icons` package's exports at startup (`src/icons.ts`).

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

Prints the matched icon name, its confidence, and (when confidence is only medium) the
runner-up candidates. Also writes the rendered icon to `output/<slug>.svg`.

## Using the licensed Pro icon set

This demo ships against the free tier (`@hugeicons/core-free-icons`, ~6,700 icons, one
style) since that's public on npm. To use your company's licensed Pro packages (60,000
icons, 10 styles):

1. Install the Pro style package(s) from your Hugeicons registry, e.g. `@hugeicons/pro-stroke-rounded`.
2. In `src/icons.ts`, change the `import * as HugeIcons from "@hugeicons/core-free-icons"`
   line to import from your installed Pro package instead — everything downstream
   (`matchIcon.ts`, `renderIcon.ts`, `cli.ts`) is unchanged, since they only depend on the
   `{ name, description }` shape `getAllIcons()` returns.

## License

[MIT](LICENSE) — icons themselves remain under [Hugeicons' own license](https://hugeicons.com/license).
