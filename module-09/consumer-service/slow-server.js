// A deliberately slow service for testing timeouts: it answers after 10 seconds.
// Run it with:  node slow-server.js   (it listens on port 4010)
const http = require("http");

http
  .createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "APPROVED", submittedOn: "2026-10-01" }));
    }, 10000);
  })
  .listen(4010, () => console.log("Slow service on port 4010"));
