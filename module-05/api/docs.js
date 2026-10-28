// Stand-in for the cohort's "npm run docs" step: shows openapi.yaml in
// Swagger UI at http://localhost:3001. Start the API (npm start) first.
// Requests sent from the page go to this server, which passes /v1 calls on to
// the API on port 3000, so the browser sees one address and nothing is blocked.
const express = require("express");
const path = require("path");
const swaggerDist = require("swagger-ui-dist").getAbsoluteFSPath();

const API = process.env.API_URL || "http://localhost:3000";
const PORT = Number(process.env.DOCS_PORT) || 3001;
const app = express();

app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.yaml"));
});

app.use("/ui", express.static(swaggerDist));

app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Records API</title>
  <link rel="stylesheet" href="/ui/swagger-ui.css">
</head>
<body>
  <div id="ui"></div>
  <script src="/ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#ui" });
  </script>
</body>
</html>`);
});

app.use("/v1", express.text({ type: "*/*" }), async (req, res) => {
  try {
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const reply = await fetch(API + req.originalUrl, {
      method: req.method,
      headers: { "Content-Type": req.get("Content-Type") || "application/json" },
      body: hasBody ? req.body : undefined,
    });
    res.status(reply.status).type("json").send(await reply.text());
  } catch {
    res.status(502).json({ error: { message: "The API is not running on " + API } });
  }
});

app.listen(PORT, () => console.log(`Swagger UI at http://localhost:${PORT}`));
