// A tiny web server for the Module 4 form. No packages needed.
//   node serve.js            then open http://localhost:8080/form.html
// Why: the form loads schools.json with fetch, and browsers do not allow
// that from a file opened by double-clicking.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "site");
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

http
  .createServer((req, res) => {
    const name = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
    const file = path.normalize(path.join(ROOT, name));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "text/plain" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Open http://localhost:${PORT}/form.html`));
