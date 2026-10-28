#!/usr/bin/env node
// TRAINING TOOL — jury arithmetic for the source's 100-point system.
//   node score.js scores.json
// It adds up points, assigns the bands and applies the PROPOSED completion
// rule. The rule is not approved until the Ministry validates it.
const fs = require("fs");

const DIMENSIONS = [
  ["interoperability", "Interoperability", 25, "team"],
  ["defence", "Individual defence", 25, "member"],
  ["security", "Security", 15, "team"],
  ["dataIntegrity", "Data integrity", 10, "team"],
  ["accessibility", "Accessibility and UX", 10, "team"],
  ["codeApi", "Code and API quality", 10, "team"],
  ["deployment", "Deployment", 5, "team"],
];

// Bands from the source: Not yet below 70%, Competent 70-89%, Excellent 90-100%.
function band(points, max) {
  if (points * 100 >= 90 * max) return "Excellent";
  if (points * 100 >= 70 * max) return "Competent";
  return "Not yet";
}

function checkPoints(label, value, max) {
  if (typeof value !== "number" || value < 0 || value > max || value * 2 !== Math.round(value * 2)) {
    throw new Error(`${label}: ${value} is not a score from 0 to ${max} in steps of 0.5`);
  }
}

let input;
try {
  input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
} catch {
  console.error("Usage: node score.js scores.json  (a valid JSON file)");
  process.exit(2);
}
console.log(`Team ${input.team}  (completion rule: PROPOSED, pending Ministry validation)\n`);

try {
for (const [member, defence] of Object.entries(input.members)) {
  const scores = { ...input.teamScores, defence };
  let total = 0;
  const notYet = [];
  console.log(member);
  for (const [key, name, max] of DIMENSIONS) {
    checkPoints(`${member} / ${name}`, scores[key], max);
    const b = band(scores[key], max);
    total += scores[key];
    if (b === "Not yet") notYet.push(name);
    console.log(`  ${name.padEnd(22)} ${String(scores[key]).padStart(5)} / ${String(max).padEnd(3)} ${b}`);
  }
  const yes = (ok) => (ok ? "yes" : "NO");
  const totalOk = total >= 70;
  const dimsOk = notYet.length === 0;
  const defenceOk = band(scores.defence, 25) !== "Not yet";
  console.log(`  ${"Total".padEnd(22)} ${String(total).padStart(5)} / 100`);
  console.log(`  At least 70 overall:             ${yes(totalOk)}`);
  console.log(`  No dimension at Not yet:         ${yes(dimsOk)}` +
    (dimsOk ? "" : `  (${notYet.join(", ")})`));
  console.log(`  Defence at least Competent:      ${yes(defenceOk)}`);
  console.log(`  Proposed rule: ${totalOk && dimsOk && defenceOk ? "met" : "NOT MET"}\n`);
}
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
