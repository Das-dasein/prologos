"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const server = http.createServer((req, res) => {
  const clean = (req.url || "/").split("?")[0];
  const file = clean === "/data/memory.pl" ? path.join(root, "data/memory.pl") : path.join(root, "ontology.html");
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); return res.end("not found"); } res.setHeader("Content-Type", file.endsWith(".pl") ? "text/plain; charset=utf-8" : "text/html; charset=utf-8"); res.end(body); });
});
server.listen(8080, "127.0.0.1", () => console.log("Ontology viewer: http://127.0.0.1:8080/ontology.html"));
