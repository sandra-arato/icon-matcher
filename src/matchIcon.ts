import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { getAllCandidates } from "./providers/index";

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Every icon across every registered provider gets a real Choice judgment from the model —
 * the combined list is only split into ≤255-option shards because that's the Choice
 * primitive's hard cap, not because anything was pre-filtered by keyword/lexical matching.
 * A shard can freely mix icons from different families; the model just sees more options.
 */
async function shardedFanOut(title: string): Promise<Candidate[]> {
  const icons = getAllCandidates();
  const shards = chunk(icons, CHUNK_SIZE);

  const questions = Object.fromEntries(
    shards.map((shard, i) => [
      `shard_${i}`,
      choice(`Which icon best represents a UI section titled '${title}'?`, {
        ...Object.fromEntries(shard.map((icon) => [icon.qualifiedName, icon.description])),
        [NONE_LABEL]: "No icon in this list fits well",
      }),
    ]),
  );

  const response = await client.systemOne({ state: { title }, questions });

  const byName = new Map(icons.map((i) => [i.qualifiedName, i.description]));
  const candidates: Candidate[] = [];
  for (const answer of Object.values(response.answers)) {
    if (answer.choice === NONE_LABEL) continue;
    candidates.push({
      icon: answer.choice,
      description: byName.get(answer.choice) ?? answer.choice,
      confidence: answer.confidence,
    });
  }
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

export async function matchIcon(title: string): Promise<MatchResult> {
  const candidates = await shardedFanOut(title);

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
