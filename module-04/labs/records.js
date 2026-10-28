// Lab 4.5 - Records, nested objects and JSON
const record = {
  requestId: "REQ-001",
  citizen: {
    citizenId: "CIT-10000001",
    fullName: "Test Citizen",
  },
  status: "SUBMITTED",
  documents: ["application-form", "id-photo"],
};

console.log(record.requestId);
console.log(record.citizen.citizenId);
console.log(record.documents[1]);
console.log(record.documents.length);

record.status = "IN_REVIEW";
record.documents.push("proof-of-address");
console.log(record.status, record.documents.length);

// Round trip through JSON text
const json = JSON.stringify(record, null, 2);
console.log(json);

const copy = JSON.parse(json);
console.log(copy.citizen.citizenId);
console.log(copy === record);
console.log(JSON.stringify(copy) === JSON.stringify(record));

// What JSON cannot carry
const withExtras = {
  name: "Test",
  missing: undefined,
  when: new Date("2026-10-08"),
};
console.log(JSON.stringify(withExtras));

// Copying and changing without touching the original (spread)
const updated = { ...record, status: "APPROVED" };
console.log(record.status, updated.status);

// Destructuring
const { requestId, status } = record;
console.log(requestId, status);

// A list of records
const all = [record, updated];
const allJson = JSON.stringify(all);
console.log(JSON.parse(allJson).length);

// Bad JSON text
try {
  JSON.parse("{ citizenId: 'CIT-10000001' }");
} catch (error) {
  console.log(error.name);
}
