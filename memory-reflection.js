"use strict";

const fs = require("node:fs");
const { consult, query } = require("./prolog-engine");

async function reflect(memoryFile = process.env.MEMORY_FILE || "data/memory.pl") {
  const program = ["memory.pl", "domain-rules.pl", "memory-reflection.pl", memoryFile]
    .map(file => fs.readFileSync(file, "utf8")).join("\n");
  const session = await consult(program);
  try {
    const [duplicates, unknownTime, identity] = await Promise.all([
      query(session, "reflection_duplicate(A, B, Proposition)."),
      query(session, "reflection_unknown_time(Id)."),
      query(session, "reflection_identity_review(Id, From, To)."),
    ]);
    return { duplicates, unknown_time: unknownTime, identity_review: identity };
  } finally {
    if (session.dir) fs.rmSync(session.dir, { recursive: true, force: true });
  }
}

if (require.main === module) reflect().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(String(error));
  process.exitCode = 1;
});

module.exports = { reflect };
