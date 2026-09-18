import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { getAllCandidates, type QualifiedIcon } from "./providers/index";

const CHUNK_SIZE = 240; // + 1 "none_of_these" option per chunk, stays under the 255-option Choice cap
const NONE_LABEL = "none_of_these";
const TIE_BREAK_MARGIN = 0.15; // if the top two shard confidences are this close, run a direct tie-break
const HIGH_CONFIDENCE = 0.5;
const DEFAULT_FALLBACK_ICON = "hugeicons:HelpCircleIcon";

const client = new TypeSafeClient();

export interface Candidate {
  icon: string; // qualified name, e.g. "lucide:House"
  description: string;
  confidence: number;
}

export interface MatchResult {
  icon: string;
  confidence: number;
  band: "high" | "medium" | "none";
  alternatives: Candidate[];
}

export type Logger = (message: string) => void;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * TypeSafe rejects a request as too large well before the documented ~32k input-token
 * budget is reached (observed failure: only 718 input tokens). The actual constraint seems
 * to be the OUTPUT side — a probability per option, across every option in the request — so
 * it scales with total option *count*, not description length. There's no documented
 * threshold for this, so rather than guess a number, this detects the rejection and halves
 * the batch until it fits.
 */
function isTooManyOptionsError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return message.includes("token") || message.includes("too many") || message.includes("too large");
}

/** Largest number of shards known to fit in one call — discovered once, reused after that. */
let maxShardsPerCall: number | null = null;

async function runWave(shards: QualifiedIcon[][], title: string, log: Logger): Promise<Candidate[]> {
  const byName = new Map(shards.flat().map((i) => [i.qualifiedName, i.description]));
  const questions = Object.fromEntries(
    shards.map((shard, i) => [
      `shard_${i}`,
      choice(`Which icon best represents a UI section titled '${title}'?`, {
        ...Object.fromEntries(shard.map((icon) => [icon.qualifiedName, icon.description])),
        [NONE_LABEL]: "No icon in this list fits well",
      }),
    ]),
  );

  try {
    const response = await client.systemOne({ state: { title }, questions });
    maxShardsPerCall = Math.max(maxShardsPerCall ?? 0, shards.length);

    const candidates: Candidate[] = [];
    for (const answer of Object.values(response.answers)) {
      if (answer.choice === NONE_LABEL) continue;
      candidates.push({ icon: answer.choice, description: byName.get(answer.choice) ?? answer.choice, confidence: answer.confidence });
    }
    return candidates;
  } catch (err) {
    if (shards.length > 1 && isTooManyOptionsError(err)) {
      const mid = Math.ceil(shards.length / 2);
      log(`${shards.length} shards (${shards.flat().length} options) in one call hit TypeSafe's size limit — splitting into ${mid} + ${shards.length - mid} and retrying...`);
      maxShardsPerCall = maxShardsPerCall ? Math.min(maxShardsPerCall, mid) : mid;
      const [a, b] = await Promise.all([
        runWave(shards.slice(0, mid), title, log),
        runWave(shards.slice(mid), title, log),
      ]);
      return [...a, ...b];
    }
    throw err;
  }
}

/**
 * Every icon across every registered provider gets a real Choice judgment from the model —
 * the combined list is only split into ≤255-option shards because that's the Choice
 * primitive's per-question cap, and shards are grouped into ≤N-shard "waves" (one API call
 * each, run in parallel) because of the size limit above. Nothing is pre-filtered by
 * keyword/lexical matching either way — every icon gets considered.
 */
async function shardedFanOut(title: string, log: Logger): Promise<Candidate[]> {
  const icons = getAllCandidates();
  const shards = chunk(icons, CHUNK_SIZE);
  const waveSize = maxShardsPerCall ?? shards.length;
  const waves = chunk(shards, waveSize);

  log(`Sharding ${icons.length} icons into ${shards.length} Choice questions across ${waves.length} call(s)...`);

  const results = await Promise.all(waves.map((wave) => runWave(wave, title, log)));
  const candidates = results.flat();
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

/** Cheap head-to-head second opinion when the top two shard winners are close — can compare across families. */
async function tieBreak(title: string, a: Candidate, b: Candidate): Promise<Candidate> {
  const response = await client.systemOne({
    state: { title },
    questions: {
      winner: choice(`Which icon better represents a UI section titled '${title}'?`, {
        [a.icon]: a.description,
        [b.icon]: b.description,
      }),
    },
  });
  const pick = response.answers.winner.choice === a.icon ? a : b;
  return { ...pick, confidence: response.answers.winner.confidence };
}

export async function matchIcon(title: string, log: Logger = () => {}): Promise<MatchResult> {
  const candidates = await shardedFanOut(title, log);

  if (candidates.length === 0) {
    return { icon: DEFAULT_FALLBACK_ICON, confidence: 0, band: "none", alternatives: [] };
  }

  let top = candidates[0];
  const second = candidates[1];
  if (second && top.confidence - second.confidence < TIE_BREAK_MARGIN) {
    top = await tieBreak(title, top, second);
  }

  return {
    icon: top.icon,
    confidence: top.confidence,
    band: top.confidence >= HIGH_CONFIDENCE ? "high" : "medium",
    alternatives: candidates.slice(0, 3),
  };
}
