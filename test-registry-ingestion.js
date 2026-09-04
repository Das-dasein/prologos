"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { zodResponseFormat } = require("openai/helpers/zod");
const {
  ACTIVE_ONTOLOGY,
  MEMORY_PREDICATES,
  RESERVED_PREDICATES,
  loadOntologyProfile,
  printRegistry,
} = require("./ontology-registry");
const {
  Extraction,
  EXTRACTION_INSTRUCTIONS,
  createExtractionSchema,
  createMemoryExtractionJsonSchema,
} = require("./llm-schema");
const { MemoryStore, validateExtraction, validateOntologyCandidate } = require("./memory-store");

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function type(name, parent = null) {
  return { name, parent, meaning: `${name} type` };
}

function predicate(name, argumentTypes, kind = "base") {
  return {
    name,
    arity: argumentTypes.length,
    kind,
    argument_types: argumentTypes,
    meaning: `${name} predicate`,
  };
}

function layer(name, types, predicates) {
  return {
    schema_version: "ontology-layer-v1",
    identity: { name, version: "1.0.0" },
    description: `${name} registry`,
    types,
    predicates,
  };
}

function profile(name = "test_profile") {
  return {
    schema_version: "ontology-profile-v1",
    identity: { name, version: "1.0.0" },
    layers: [
      { role: "core", file: "registries/core.json" },
      { role: "domain", file: "registries/domain.json" },
    ],
  };
}

function writeProfile(root, {
  profileDocument = profile(),
  core = layer("test_core", [type("entity"), type("value", "entity")], [predicate("has_label", ["entity", "value"])]),
  domain = layer("test_domain", [type("activity", "entity")], [predicate("practices", ["entity", "activity"])]),
} = {}) {
  const file = path.join(root, "active.json");
  writeJson(file, profileDocument);
  writeJson(path.join(root, "registries", "core.json"), core);
  writeJson(path.join(root, "registries", "domain.json"), domain);
  return file;
}

const activeProjection = printRegistry();
assert.match(activeProjection, /\[core\]/);
assert.match(activeProjection, /\[domain\]/);
assert.equal(ACTIVE_ONTOLOGY.predicates.instance_of.layer, "core");
assert.equal(ACTIVE_ONTOLOGY.predicates.likes.layer, "domain");
assert.equal(MEMORY_PREDICATES, require("./memory-store").RELATION_SIGNATURES);
assert.match(EXTRACTION_INSTRUCTIONS, new RegExp(ACTIVE_ONTOLOGY.identity.sha256));
assert.match(EXTRACTION_INSTRUCTIONS, /\[core: universal_core@1\.0\.0\]/);
assert.match(EXTRACTION_INSTRUCTIONS, /\[domain: conversation_profile@1\.0\.0\]/);
assert.doesNotMatch(fs.readFileSync("llm-schema.js", "utf8"), /likes\(Person, Thing\)/);
assert.equal(zodResponseFormat(Extraction, "memory_extraction").json_schema.strict, true);

const checkedInSchema = JSON.parse(fs.readFileSync("schemas/memory-extraction.schema.json", "utf8"));
assert.deepEqual(checkedInSchema, createMemoryExtractionJsonSchema());

const assertion = {
  polarity: "positive",
  relation: "lives_in",
  arguments: ["user", "samara"],
  valid_from: null,
  valid_to: null,
  confidence: 0.9,
};
const envelope = (assertions = [], ontologyCandidates = [], identity = ACTIVE_ONTOLOGY.identity) => ({
  schema_version: "memory-extraction-v2",
  registry_identity: identity,
  assertions,
  ontology_candidates: ontologyCandidates,
});
const candidate = {
  name: "teaches",
  arity: 2,
  argument_types: ["person", "activity"],
  meaning: "a person teaches an activity",
  evidence_span: "Я преподаю информатику",
};

assert.equal(Extraction.parse(envelope([assertion])).assertions[0].relation, "lives_in");
assert.throws(() => Extraction.parse(envelope([{ ...assertion, arguments: ["user"] }])));
assert.throws(() => validateExtraction(envelope([{ ...assertion, relation: "flies_to" }])), /Relation not allowed/);
assert.throws(() => validateExtraction(envelope([assertion], [], {
  ...ACTIVE_ONTOLOGY.identity,
  sha256: "0".repeat(64),
})), /does not match/);
assert.throws(() => validateExtraction(envelope([assertion], [], {
  ...ACTIVE_ONTOLOGY.identity,
  unexpected: true,
})), /unknown or missing keys/);
assert.equal(Extraction.parse(envelope([], [candidate])).ontology_candidates[0].name, "teaches");
assert.throws(() => Extraction.parse(envelope([], [{ ...candidate, name: "likes" }])));
for (const name of RESERVED_PREDICATES) {
  const reservedCandidate = {
    ...candidate,
    name,
    arity: 1,
    argument_types: ["entity"],
  };
  assert.throws(() => validateOntologyCandidate(reservedCandidate), /unsafe predicate/);
  assert.throws(() => Extraction.parse(envelope([], [reservedCandidate])), /unsafe predicate/);
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prologos-registry-"));
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prologos-registry-outside-"));
  try {
    const profileFile = writeProfile(root);
    const loaded = loadOntologyProfile(profileFile);
    assert.equal(loaded.predicates.has_label.layer, "core");
    assert.equal(loaded.predicates.practices.layer, "domain");
    assert.match(loaded.identity.sha256, /^[a-f0-9]{64}$/);

    const customSchema = createMemoryExtractionJsonSchema(loaded);
    assert.deepEqual(customSchema.properties.assertions.items.properties.relation.enum, ["has_label", "practices"]);
    const customValidator = createExtractionSchema(loaded);
    assert.equal(customValidator.parse({
      schema_version: "memory-extraction-v2",
      registry_identity: loaded.identity,
      assertions: [{
        polarity: "positive", relation: "has_label", arguments: ["item", "label"],
        valid_from: null, valid_to: null, confidence: 1,
      }],
      ontology_candidates: [],
    }).assertions.length, 1);

    writeProfile(root, {
      domain: layer("test_domain", [type("activity", "entity")], [predicate("derived_activity", ["entity"], "derived")]),
    });
    const derivedRegistry = loadOntologyProfile(profileFile);
    const derivedCandidate = {
      ...candidate,
      name: "derived_activity",
      arity: 1,
      argument_types: ["entity"],
    };
    assert.throws(
      () => validateOntologyCandidate(derivedCandidate, derivedRegistry),
      /already registered/,
    );
    assert.throws(() => createExtractionSchema(derivedRegistry).parse({
      schema_version: "memory-extraction-v2",
      registry_identity: derivedRegistry.identity,
      assertions: [],
      ontology_candidates: [derivedCandidate],
    }), /already registered/);

    const firstHash = derivedRegistry.identity.sha256;
    writeJson(path.join(root, "registries", "core.json"), layer(
      "test_core",
      [type("entity"), type("value", "entity")],
      [{ ...predicate("has_label", ["entity", "value"]), meaning: "changed declaration" }],
    ));
    assert.notEqual(loadOntologyProfile(profileFile).identity.sha256, firstHash);

    writeProfile(root, { profileDocument: { ...profile(), unexpected: true } });
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_SCHEMA");

    writeProfile(root, {
      domain: layer("test_domain", [type("entity")], [predicate("practices", ["entity", "entity"])]),
    });
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_DUPLICATE");

    writeProfile(root, {
      core: layer("test_core", [type("entity"), type("first", "second"), type("second", "first")], []),
      domain: layer("test_domain", [], []),
    });
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_TYPE_CYCLE");

    writeProfile(root, {
      core: layer("test_core", [type("entity")], [predicate("unknown_typed", ["missing_type"])]),
      domain: layer("test_domain", [], []),
    });
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_TYPE");

    writeProfile(root, {
      profileDocument: {
        ...profile(),
        layers: [{ role: "core", file: "../outside.json" }],
      },
    });
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_PATH");

    const externalLayer = path.join(externalRoot, "outside.json");
    writeJson(externalLayer, layer("outside", [type("entity")], []));
    writeProfile(root, {
      profileDocument: {
        ...profile(),
        layers: [{ role: "core", file: "registries/link.json" }],
      },
    });
    fs.symlinkSync(externalLayer, path.join(root, "registries", "link.json"));
    assert.throws(() => loadOntologyProfile(profileFile), error => error.code === "REGISTRY_PATH");

    const memoryPath = path.join(root, "memory.pl");
    const store = new MemoryStore(memoryPath);
    const before = store.read();
    const candidateOnly = await store.add(envelope([], [candidate]), "m_candidate");
    assert.deepEqual(candidateOnly.facts, []);
    assert.deepEqual(candidateOnly.ontology_candidates, [candidate]);
    assert.equal(store.read(), before);

    await assert.rejects(
      store.add(envelope([assertion], [], { ...ACTIVE_ONTOLOGY.identity, sha256: "0".repeat(64) }), "m_stale"),
      /does not match/,
    );
    assert.equal(store.read(), before);
    await assert.rejects(
      store.add(envelope([{ ...assertion, arguments: ["user"] }]), "m_arity"),
      /Bad arity/,
    );
    assert.equal(store.read(), before);

    console.log("registry-ingestion ok");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(externalRoot, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
