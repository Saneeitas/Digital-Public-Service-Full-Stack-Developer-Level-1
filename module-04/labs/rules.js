// Lab 4.4 - Reusable functions with checks
const MIN_AGE = 5;
const MAX_AGE = 12;

function calculateFee(pages) {
  const baseFee = 1500;
  const feePerPage = 250;
  return baseFee + feePerPage * pages;
}

function decideEnrolment(age, guardianConfirmed) {
  if (!guardianConfirmed) {
    return "NOT ELIGIBLE: guardian confirmation missing";
  }
  if (age < MIN_AGE) {
    return "NOT ELIGIBLE: child is under " + MIN_AGE;
  }
  if (age > MAX_AGE) {
    return "NOT ELIGIBLE: child is over " + MAX_AGE;
  }
  return "ELIGIBLE";
}

function countByStatus(requests, status) {
  let count = 0;
  for (const request of requests) {
    if (request.status === status) {
      count++;
    }
  }
  return count;
}

function filterByStatus(requests, status) {
  const matches = [];
  for (const request of requests) {
    if (request.status === status) {
      matches.push(request);
    }
  }
  return matches;
}

// --- Checks -----------------------------------------------------------
function check(name, actual, expected) {
  const passed = actual === expected;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) {
    console.log(`      expected: ${expected}`);
    console.log(`      actual:   ${actual}`);
  }
}

check("fee for 4 pages", calculateFee(4), 2500);
check("fee for 0 pages", calculateFee(0), 1500);
check("age 7, confirmed", decideEnrolment(7, true), "ELIGIBLE");
check("age 5, confirmed (lower limit)", decideEnrolment(5, true), "ELIGIBLE");
check("age 12, confirmed (upper limit)", decideEnrolment(12, true), "ELIGIBLE");
check(
  "age 4, confirmed",
  decideEnrolment(4, true),
  "NOT ELIGIBLE: child is under 5",
);
check(
  "age 13, confirmed",
  decideEnrolment(13, true),
  "NOT ELIGIBLE: child is over 12",
);
check(
  "age 7, not confirmed",
  decideEnrolment(7, false),
  "NOT ELIGIBLE: guardian confirmation missing",
);

const sample = [
  { requestId: "REQ-001", status: "SUBMITTED" },
  { requestId: "REQ-002", status: "APPROVED" },
  { requestId: "REQ-003", status: "APPROVED" },
];
check("count APPROVED", countByStatus(sample, "APPROVED"), 2);
check("count REJECTED", countByStatus(sample, "REJECTED"), 0);
check("filter APPROVED length", filterByStatus(sample, "APPROVED").length, 2);

// --- Shorter versions (arrow functions and array methods) -------------
const countByStatusShort = (requests, status) =>
  requests.filter((request) => request.status === status).length;
check("short count APPROVED", countByStatusShort(sample, "APPROVED"), 2);

const firstApproved = sample.find((request) => request.status === "APPROVED");
check("find first APPROVED", firstApproved.requestId, "REQ-002");

const ids = sample.map((request) => request.requestId);
check("map to IDs", ids.join(","), "REQ-001,REQ-002,REQ-003");
