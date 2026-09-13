'use strict';

function mentionsInteger(text, value) {
  if (!Number.isSafeInteger(value) || typeof text !== 'string') return false;
  return new RegExp(`(^|[^0-9])${String(value).replace('-', '\\-')}([^0-9]|$)`).test(text);
}

function validateQualifiers(caseRecord, candidates) {
  const diagnostics = [];
  const sources = new Map([...caseRecord.old_dialogue, ...caseRecord.current_dialogue].map(value => [value.id, value]));
  const items = new Map();
  for (const item of candidates) {
    if (items.has(item.id)) diagnostics.push({ candidate_id: item.id, field: 'id', code: 'duplicate_id', message: 'Candidate IDs must be unique.' });
    items.set(item.id, item);
    const source = sources.get(item.source);
    if (!source) {
      diagnostics.push({ candidate_id: item.id, field: 'source', code: 'unknown_source', message: `Source ${item.source} is not a supplied dialogue message.` });
      continue;
    }
    if (item.observedAt !== source.at) diagnostics.push({ candidate_id: item.id, field: 'observedAt', code: 'source_time_mismatch', message: `observedAt must equal cited source time ${source.at}.` });
    if (item.validFrom !== source.at && !mentionsInteger(source.text, item.validFrom)) diagnostics.push({ candidate_id: item.id, field: 'validFrom', code: 'unsupported_start', message: `validFrom ${item.validFrom} is neither the source time nor an endpoint stated in source ${item.source}.` });
    if (item.validTo !== null && !mentionsInteger(source.text, item.validTo)) diagnostics.push({ candidate_id: item.id, field: 'validTo', code: 'unsupported_end', message: `validTo ${item.validTo} is not stated in source ${item.source}. Do not infer an endpoint from a later replacement; the replaces link retires the old item.` });
    if (item.validTo !== null && item.validTo < item.validFrom) diagnostics.push({ candidate_id: item.id, field: 'validTo', code: 'reversed_interval', message: 'validTo must be greater than or equal to validFrom.' });
  }
  for (const item of candidates) if (item.replaces !== null) {
    const target = items.get(item.replaces);
    if (!target) diagnostics.push({ candidate_id: item.id, field: 'replaces', code: 'unknown_replacement_target', message: `Replacement target ${item.replaces} is absent from this candidate set.` });
    else if (target.id === item.id) diagnostics.push({ candidate_id: item.id, field: 'replaces', code: 'self_replacement', message: 'A candidate cannot replace itself.' });
    else if (target.observedAt > item.observedAt) diagnostics.push({ candidate_id: item.id, field: 'replaces', code: 'replacement_time_order', message: 'A replacement cannot target a later observation.' });
  }
  return Object.freeze(diagnostics);
}

module.exports = { mentionsInteger, validateQualifiers };

