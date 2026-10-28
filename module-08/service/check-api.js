// Lab 6.3 - repeatable checks for the API. Run with the server already started.
const BASE = process.env.BASE_URL || "http://localhost:3000/v1";

let failures = 0;

async function call(method, path, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    // the body was not JSON; json stays null
  }
  return { status: response.status, json, text };
}

function check(name, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) failures++;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

async function main() {
  let r = await call("GET", "/records");
  check("list returns 200", r.status, 200);
  check("list is an array", Array.isArray(r.json), true);

  r = await call("POST", "/records", {
    citizenId: "CIT-90000001",
    status: "SUBMITTED",
  });
  check("create returns 201", r.status, 201);
  check(
    "create returns the record",
    [r.json.citizenId, r.json.status],
    ["CIT-90000001", "SUBMITTED"],
  );
  const id = r.json.id;
  check("create returns a numeric id", typeof id, "number");

  r = await call("GET", `/records/${id}`);
  check("get by id returns 200", r.status, 200);
  check("get by id returns the same record", r.json.citizenId, "CIT-90000001");

  r = await call("PUT", `/records/${id}`, {
    citizenId: "CIT-90000001",
    status: "APPROVED",
  });
  check("update returns 200", r.status, 200);
  check("update changes the status", r.json.status, "APPROVED");

  r = await call("POST", "/records", { citizenId: "bad", status: "DONE" });
  check("invalid body returns 400", r.status, 400);
  check("invalid body names both fields", r.json.error.fields.length, 2);

  r = await call("POST", "/records", "{ not json");
  check("malformed JSON returns 400", r.status, 400);

  r = await call("GET", "/records/abc");
  check("non-numeric id returns 404", r.status, 404);
  r = await call("GET", "/records/99999999999");
  check("huge id returns 404", r.status, 404);
  r = await call("GET", "/records/0");
  check("id 0 returns 404", r.status, 404);
  r = await call("PUT", "/records/99999", {
    citizenId: "CIT-90000001",
    status: "APPROVED",
  });
  check("update of a missing record returns 404", r.status, 404);
  r = await call("DELETE", "/records/99999");
  check("delete of a missing record returns 404", r.status, 404);

  r = await call("DELETE", `/records/${id}`);
  check("delete returns 200", r.status, 200);
  r = await call("GET", `/records/${id}`);
  check("deleted record is gone", r.status, 404);

  r = await call("GET", "/nothing-here");
  check("unknown route returns 404", r.status, 404);

  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("Could not run the checks:", error.message);
  process.exitCode = 1;
});
