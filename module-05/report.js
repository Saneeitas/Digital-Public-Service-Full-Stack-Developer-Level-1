const fs = require("fs");
const raw = fs.readFileSync("data/requests.csv", "utf-8");
const lines = raw.trim().split(/\r?\n/);

const counts = { SUBMITTED: 0, IN_REVIEW: 0, APPROVED: 0, REJECTED: 0 };
for (const line of lines.slice(1)) {
  const status = line.split(",")[3];
  if (status in counts) counts[status]++;
}
console.log(counts);
