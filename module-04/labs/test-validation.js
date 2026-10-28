// Practice set: 6 valid and 6 invalid whole-form entries (synthetic data)
const { validateForm } = require("./validation.js");

const today = new Date("2026-10-18");

const base = {
  fullName: "Test Citizen",
  citizenId: "CIT-12345678",
  dateOfBirth: "1990-03-15",
  preferredContact: "email",
  details: "",
};

const entries = [
  { label: "valid: typical entry", values: { ...base }, invalidFields: [] },
  {
    label: "valid: spaces around name are ignored",
    values: { ...base, fullName: "  Test Citizen  " },
    invalidFields: [],
  },
  {
    label: "valid: born today",
    values: { ...base, dateOfBirth: "2026-10-18" },
    invalidFields: [],
  },
  {
    label: "valid: 100-character name",
    values: { ...base, fullName: "A".repeat(100) },
    invalidFields: [],
  },
  {
    label: "valid: 500-character details",
    values: { ...base, details: "x".repeat(500) },
    invalidFields: [],
  },
  {
    label: "valid: representative named",
    values: { ...base, onBehalf: "on", repName: "Test Representative" },
    invalidFields: [],
  },

  {
    label: "invalid: empty name",
    values: { ...base, fullName: "" },
    invalidFields: ["fullName"],
  },
  {
    label: "invalid: lower-case citizen ID",
    values: { ...base, citizenId: "cit-12345678" },
    invalidFields: ["citizenId"],
  },
  {
    label: "invalid: seven digits",
    values: { ...base, citizenId: "CIT-1234567" },
    invalidFields: ["citizenId"],
  },
  {
    label: "invalid: impossible date",
    values: { ...base, dateOfBirth: "2026-02-30" },
    invalidFields: ["dateOfBirth"],
  },
  {
    label: "invalid: future date and no contact",
    values: { ...base, dateOfBirth: "2026-12-01", preferredContact: undefined },
    invalidFields: ["dateOfBirth", "preferredContact"],
  },
  {
    label: "invalid: representative ticked, name empty",
    values: { ...base, onBehalf: "on", repName: "" },
    invalidFields: ["repName"],
  },
];

let passed = 0;
for (const entry of entries) {
  const errors = validateForm(entry.values, today);
  const actual = Object.keys(errors).sort().join(",");
  const expected = [...entry.invalidFields].sort().join(",");
  const ok = actual === expected;
  if (ok) passed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${entry.label}`);
  if (!ok) {
    console.log(`      expected invalid fields: [${expected}]`);
    console.log(`      actual invalid fields:   [${actual}]`);
  }
}
console.log(`\n${passed} of ${entries.length} entries behaved as expected`);
