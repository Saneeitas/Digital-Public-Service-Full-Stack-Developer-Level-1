// Day 19-20 - picks a random 10-20 line block from your repository, the way
// the jury will, so you can practise explaining code you did not choose.
//   node pick-block.js                  any file in the repository
//   node pick-block.js "Ana Musa"       a block mostly written by that author
const { execFileSync } = require("child_process");
const fs = require("fs");

const author = process.argv[2];
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "ignore"],
  });

let tracked;
try {
  tracked = git("ls-files");
} catch {
  console.error("This folder is not a Git repository. cd into your repository first.");
  process.exit(2);
}
const files = tracked
  .split("\n")
  .filter((f) => /\.(js|html|css|sql|ya?ml|sh)$/.test(f) && !/package-lock/.test(f));
if (files.length === 0) {
  console.error("No code files found. Run this inside your repository folder.");
  process.exit(2);
}

function authorsOf(file) {
  return git("blame", "-w", "--line-porcelain", "--", file)
    .split("\n")
    .filter((line) => line.startsWith("author "))
    .map((line) => line.slice(7));
}

const random = (n) => Math.floor(Math.random() * n);

for (let attempt = 0; attempt < 500; attempt += 1) {
  const file = files[random(files.length)];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const length = 10 + random(11);
  if (lines.length < length) continue;
  const start = random(lines.length - length + 1);
  const block = lines.slice(start, start + length);
  if (block.filter((line) => line.trim() !== "").length < 7) continue;
  if (author) {
    const mine = authorsOf(file).slice(start, start + length);
    if (mine.filter((name) => name === author).length < length / 2) continue;
  }
  console.log(`${file}, lines ${start + 1} to ${start + length} (${length} lines)\n`);
  block.forEach((line, i) => console.log(`${String(start + i + 1).padStart(4)}  ${line}`));
  process.exit(0);
}
console.error(author ? `No block mostly written by ${author} was found.` : "No block found.");
process.exit(1);
