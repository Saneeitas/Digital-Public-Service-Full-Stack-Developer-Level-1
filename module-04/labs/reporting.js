// Lab 4.3 - Request reporting (synthetic data)
// prettier-ignore
const requests = [
  { requestId: "REQ-001", citizenId: "CIT-10000001",
    status: "SUBMITTED", submittedOn: "2026-10-01" },
  { requestId: "REQ-002", citizenId: "CIT-10000002",
    status: "APPROVED", submittedOn: "2026-10-01" },
  { requestId: "REQ-003", citizenId: "CIT-10000003",
    status: "IN_REVIEW", submittedOn: "2026-10-02" },
  { requestId: "REQ-004", citizenId: "CIT-10000004",
    status: "REJECTED", submittedOn: "2026-10-02" },
  { requestId: "REQ-005", citizenId: "CIT-10000005",
    status: "APPROVED", submittedOn: "2026-10-03" },
  { requestId: "REQ-006", citizenId: "CIT-10000006",
    status: "SUBMITTED", submittedOn: "2026-10-03" },
  { requestId: "REQ-007", citizenId: "CIT-10000007",
    status: "APPROVED", submittedOn: "2026-10-04" },
  { requestId: "REQ-008", citizenId: "CIT-10000008",
    status: "IN_REVIEW", submittedOn: "2026-10-05" },
  { requestId: "REQ-009", citizenId: "CIT-10000009",
    status: "SUBMITTED", submittedOn: "2026-10-05" },
  { requestId: "REQ-010", citizenId: "CIT-10000010",
    status: "REJECTED", submittedOn: "2026-10-06" },
];

console.log("Total requests:", requests.length);
console.log("First request:", requests[0].requestId);
console.log("Last request:", requests[requests.length - 1].requestId);

// Count one status with a loop
let approved = 0;
for (let i = 0; i < requests.length; i++) {
  if (requests[i].status === "APPROVED") {
    approved++;
  }
}
console.log("Approved:", approved);

// Count every status with for...of
const counts = { SUBMITTED: 0, IN_REVIEW: 0, APPROVED: 0, REJECTED: 0 };
for (const request of requests) {
  counts[request.status]++;
}
console.log(counts);

// Filter: collect the citizen IDs of approved requests
const approvedIds = [];
for (const request of requests) {
  if (request.status === "APPROVED") {
    approvedIds.push(request.citizenId);
  }
}
console.log(approvedIds);

// Add a new request
requests.push({
  requestId: "REQ-011",
  citizenId: "CIT-10000011",
  status: "SUBMITTED",
  submittedOn: "2026-10-07",
});
console.log("Total requests after push:", requests.length);
