"use strict";

// Materializes the finite P2-multicall catalog into separate sealed scripts.
// The model may choose a script, but it never chooses a query or shell args.
const fs = require("node:fs");
const path = require("node:path");

function exclusive(file, text, mode) { fs.writeFileSync(file, text, { encoding: "utf8", flag: "wx", mode }); return file; }
function createMulticallBrokers({ run, item, broker, swiplPath, maxCalls = 3 }) {
  if (!run || !item || !broker || typeof broker.predeclaredGoals !== "function" || typeof broker.compiledProgram !== "function") throw new Error("run, case, and deterministic broker are required");
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 3) throw new Error("maxCalls must be an integer from 1 to 3");
  if (typeof swiplPath !== "string" || !path.isAbsolute(swiplPath)) throw new Error("swiplPath must be absolute");
  const selected = broker.predeclaredGoals(item.case_id, maxCalls), compiled = broker.compiledProgram(item.case_id);
  return Object.freeze(selected.map(goal => {
    const suffix = goal.goal_id.replace(/[^A-Za-z0-9_-]/g, "_");
    const programFile = path.join(run.state_dir, `sealed-program-${suffix}.pl`), receiptFile = path.join(run.workspace_dir, `broker-receipt-${suffix}.txt`), brokerFile = path.join(run.state_dir, `query-broker-${suffix}.sh`);
    const program = `${compiled}\n:- initialization(main).\nmain :- catch(((${goal.goal}) -> Result = entailed ; Result = unknown), error(existence_error(procedure, _), _), Result = unknown), format('BROKER_RESULT: ~w~n', [Result]), halt.\n`;
    exclusive(programFile, program, 0o400);
    const script = `#!/bin/sh\nif [ "$#" -ne 0 ]; then exit 64; fi\nif ${JSON.stringify(swiplPath)} --quiet --nosignals -s ${JSON.stringify(programFile)} > ${JSON.stringify(receiptFile)} 2>/dev/null; then cat ${JSON.stringify(receiptFile)}; else exit $?; fi\n`;
    exclusive(brokerFile, script, 0o700); fs.chmodSync(brokerFile, 0o700);
    return Object.freeze({ ...goal, brokerFile, programFile, receiptFile });
  }));
}
module.exports = { createMulticallBrokers };
