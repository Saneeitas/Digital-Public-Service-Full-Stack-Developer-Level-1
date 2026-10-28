// Shows what happens when a dependency is too slow. Start slow-server.js in
// another terminal first, then run:  node try-slow.js
const { getStatusFrom } = require("./dependency");

const started = Date.now();
getStatusFrom("a", "CIT-10000001", {
  baseUrl: "http://localhost:4010",
  timeoutMs: 2000,
}).then((result) => {
  console.log(result);
  console.log(`Gave up after ${Date.now() - started} ms`);
});
