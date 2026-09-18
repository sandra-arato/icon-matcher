import { matchIcon } from "./matchIcon";
import { renderIconToFile } from "./renderIcon";

async function main() {
  const title = process.argv.slice(2).join(" ").trim();
  if (!title) {
    console.error('Usage: pnpm match "<UI section title>"');
    process.exit(1);
  }

  console.log(`Matching icon for: "${title}"...`);
  const result = await matchIcon(title, (msg) => console.log(`   ${msg}`));

  if (result.band === "none") {
    console.log(`No confident match — falling back to default icon: ${result.icon}`);
  } else {
    console.log(`-> ${result.icon}  (confidence: ${result.confidence.toFixed(2)}, ${result.band})`);
  }

  if (result.band !== "high" && result.alternatives.length > 1) {
    console.log("Other candidates considered:");
    for (const alt of result.alternatives) {
      console.log(`   ${alt.icon}  (${alt.confidence.toFixed(2)}) — ${alt.description}`);
    }
  }

  const path = renderIconToFile(result.icon, title);
  console.log(`Saved SVG to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
