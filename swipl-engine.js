const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RUNNER = path.join(__dirname, "swipl-runner.pl");
const BINARY = process.env.SWIPL_BIN || "swipl";

function consult(program) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-swipl-"));
  const file = path.join(dir, "program.pl");
  fs.writeFileSync(file, program, "utf8");
  return { file, dir };
}

function query(session, goal, timeout = 5000) {
  return new Promise((resolve, reject) => {
    execFile(BINARY, ["-q", "-s", RUNNER, "--", session.file, goal],
      { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          return reject(new Error(`SWI-Prolog query failed: ${detail}`));
        }
        try {
          resolve(JSON.parse(stdout).answers);
        } catch (parseError) {
          reject(new Error(`SWI-Prolog returned invalid JSON: ${parseError.message}`));
        }
      });
  });
}

module.exports = { consult, query };
