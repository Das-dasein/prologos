const fs = require("node:fs");
const { consult, query } = require("./prolog-engine");

async function main() {
  const program = fs.readFileSync("memory.pl", "utf8") + "\n" +
    fs.readFileSync(process.argv[2] || "demo.pl", "utf8");
  const session = await consult(program);
  const goal = process.argv.slice(3).join(" ") ||
    "conflict_explanation(Type, Id1, Id2, Explanation).";
  const answers = await query(session, goal);
  if (!answers.length) console.log("false.");
  else answers.forEach(answer => console.log(answer + "."));
}

main().catch(error => {
  console.error(String(error));
  process.exitCode = 1;
});
