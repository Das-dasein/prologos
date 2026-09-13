// Hand-authored appendix to the paper analysis; reuses the existing checker.
// No LLM, extraction, new solver, alternative policy, or empirical scoring.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { check, hash } = require('../../world/checker');

const root = path.resolve(__dirname, '../..');
const ideas = { version: 'paper-counterexample-v1', predicates:
  ['p', 'q', 'r'].map(name => ({ name, arity: 0 })) };
const item = (id, program, source) => ({ id, program, source });
const p = item('a_p', 'p.', 'source_a');
const np = item('c_not_p', 'neg(p).', 'source_c');
const q = item('b_q', 'q.', 'source_b');
const pr = item('p_to_r', 'r :- p.', 'rule_author');
const qr = item('q_to_r', 'r :- q.', 'rule_author');
const pq = item('p_to_q', 'q :- p.', 'rule_author');
const cases = [
  { id: 'independent', items: [p, np, q, pr, qr], predicted: ['entailed', 'entailed'] },
  { id: 'contested_attack', items: [p, np, q, pr, qr,
    item('p_to_not_r', 'neg(r) :- p.', 'rule_author')], predicted: ['conflict', 'unknown'] },
  { id: 'direct_opposition', items: [p, np, q, pr, qr,
    item('d_not_r', 'neg(r).', 'source_d')], predicted: ['conflict', 'unknown'] },
  { id: 'dependent_only', items: [p, np, pq, pr, qr], predicted: ['entailed', 'unknown'] },
  { id: 'dependent_flattened', items: [p, np, pq, q, pr, qr], predicted: ['entailed', 'entailed'] },
  { id: 'dependent_origin_note', items: [p, np, pq,
    { ...q, origin: { note: 'B has no observation of q: its only support is a_p via p_to_q.' } },
    pr, qr], predicted: ['entailed', 'entailed'] },
];

(async () => {
  const records = [];
  for (const c of cases) {
    const snapshot = { ideas, items: c.items };
    const result = await check({ snapshot, query: 'r.' });
    records.push({ case_id: c.id, query: 'r.', snapshot,
      predicted_current_policy: { raw: c.predicted[0], safe: c.predicted[1] },
      prediction_matches: result.status === 'ok' && result.raw_status === c.predicted[0]
        && result.safe_status === c.predicted[1], result });
  }
  const sourceFiles = ['world/checker.js', 'world/checker.pl', 'world/agent.js',
    'world/journal.js', '.cdd/agent-epistemology-v0.md',
    '.cdd/waves/agent-world-poc-v0/contract.md',
    'reports/epistemic-theory-counterexample-v1/probe.cjs'];
  const receipt = {
    scope: 'Deterministic appendix: predictions of existing policy, not an independently validated theory oracle. No agent actions executed.',
    created_at: new Date().toISOString(),
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    worktree_status: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
    source_hash_convention: 'SHA256 of canonical JSON string value of UTF-8 source, using existing checker.hash; not raw file bytes.',
    source_hashes: Object.fromEntries(sourceFiles.map(f => [f, hash(fs.readFileSync(path.join(root, f), 'utf8'))])),
    versions: { node: process.version,
      prolog: execFileSync(process.env.SWIPL_BIN || 'swipl', ['--version'], { encoding: 'utf8' }).trim() },
    metadata_pair_same_checker_input: records[4].result.evidence.input_sha256 === records[5].result.evidence.input_sha256,
    records,
  };
  fs.writeFileSync(path.join(__dirname, 'observations.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ results: records.map(r => ({ case_id: r.case_id,
    raw: r.result.raw_status, safe: r.result.safe_status, prediction_matches: r.prediction_matches })),
    metadata_pair_same_checker_input: receipt.metadata_pair_same_checker_input }, null, 2));
  if (records.some(r => !r.prediction_matches)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
