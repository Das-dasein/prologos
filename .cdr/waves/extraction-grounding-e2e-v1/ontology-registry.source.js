"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ATOM = /^[a-z][a-z0-9_]*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const RESERVED_PREDICATES = new Set([
  "assertion", "assertion_polarity", "assertion_modality", "assertion_time",
  "assertion_source", "assertion_confidence", "assertion_status",
  "assertion_status_event", "assertion_revision", "active_assertion",
  "active_assertion_record", "safe_assertion", "conflict", "conflict_explanation",
  "consult", "include", "use_module", "ensure_loaded", "load_files", "module",
  "initialization", "assert", "asserta", "assertz", "retract", "abolish",
  "clause", "call", "once", "catch", "throw", "open", "close", "read",
  "write", "writeln", "format", "shell", "process_create", "halt", "true", "fail"
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exact(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("REGISTRY_SCHEMA", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    fail("REGISTRY_SCHEMA", `${label} has unknown or missing keys`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateIdentity(identity, label) {
  exact(identity, ["name", "version"], label);
  if (!ATOM.test(identity.name) || !VERSION.test(identity.version)) fail("REGISTRY_IDENTITY", `invalid ${label}`);
}

function validatePredicateName(name) {
  if (!ATOM.test(name) || RESERVED_PREDICATES.has(name))
    fail("REGISTRY_PREDICATE", `unsafe predicate ${name}`);
  return name;
}

function validateOntologyCandidateName(name, registry) {
  validatePredicateName(name);
  if (!registry || !registry.predicates || typeof registry.predicates !== "object")
    fail("REGISTRY_SCHEMA", "ontology candidate registry is required");
  if (registry.predicates[name])
    fail("REGISTRY_DUPLICATE", `ontology candidate is already registered: ${name}`);
  return name;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail("REGISTRY_READ", `cannot read registry JSON: ${error.message}`); }
}

function realPath(file) {
  try { return fs.realpathSync(file); }
  catch (error) { fail("REGISTRY_READ", `cannot resolve registry path: ${error.message}`); }
}

function validateLayer(layer, role) {
  exact(layer, ["schema_version", "identity", "description", "types", "predicates"], `${role} layer`);
  if (layer.schema_version !== "ontology-layer-v1") fail("REGISTRY_VERSION", `unsupported ${role} layer schema`);
  validateIdentity(layer.identity, `${role} layer identity`);
  if (typeof layer.description !== "string" || !layer.description.trim()) fail("REGISTRY_SCHEMA", `${role} description is required`);
  if (!Array.isArray(layer.types) || !Array.isArray(layer.predicates)) fail("REGISTRY_SCHEMA", `${role} collections must be arrays`);
  if (layer.types.length > 100 || layer.predicates.length > 100) fail("REGISTRY_LIMIT", `${role} layer exceeds collection limits`);

  for (const [index, type] of layer.types.entries()) {
    exact(type, ["name", "parent", "meaning"], `${role}.types[${index}]`);
    if (!ATOM.test(type.name) || (type.parent !== null && !ATOM.test(type.parent)) || typeof type.meaning !== "string" || !type.meaning.trim())
      fail("REGISTRY_TYPE", `invalid type declaration ${role}.types[${index}]`);
  }
  for (const [index, predicate] of layer.predicates.entries()) {
    exact(predicate, ["name", "arity", "kind", "argument_types", "meaning"], `${role}.predicates[${index}]`);
    validatePredicateName(predicate.name);
    if (!Number.isInteger(predicate.arity) || predicate.arity < 1 || predicate.arity > 4 || !["base", "derived"].includes(predicate.kind))
      fail("REGISTRY_PREDICATE", `invalid signature for ${predicate.name}`);
    if (!Array.isArray(predicate.argument_types) || predicate.argument_types.length !== predicate.arity || predicate.argument_types.some(type => !ATOM.test(type)))
      fail("REGISTRY_PREDICATE", `invalid argument types for ${predicate.name}`);
    if (typeof predicate.meaning !== "string" || !predicate.meaning.trim()) fail("REGISTRY_PREDICATE", `missing meaning for ${predicate.name}`);
  }
  return layer;
}

function loadOntologyProfile(profileFile = path.join(__dirname, "ontology", "active-profile-v1.json")) {
  const resolvedProfile = realPath(path.resolve(profileFile));
  const profileRoot = path.dirname(resolvedProfile);
  const profile = readJson(resolvedProfile);
  exact(profile, ["schema_version", "identity", "layers"], "ontology profile");
  if (profile.schema_version !== "ontology-profile-v1") fail("REGISTRY_VERSION", "unsupported ontology profile schema");
  validateIdentity(profile.identity, "ontology profile identity");
  if (!Array.isArray(profile.layers) || profile.layers.length === 0 || profile.layers.length > 20) fail("REGISTRY_LIMIT", "invalid ontology layer count");

  const types = {};
  const predicates = {};
  const layers = profile.layers.map((entry, index) => {
    exact(entry, ["role", "file"], `ontology profile layer ${index}`);
    if (!["core", "domain"].includes(entry.role) || typeof entry.file !== "string") fail("REGISTRY_SCHEMA", `invalid ontology profile layer ${index}`);
    const requestedFile = path.resolve(profileRoot, entry.file);
    const requestedRelative = path.relative(profileRoot, requestedFile);
    if (requestedRelative.startsWith("..") || path.isAbsolute(requestedRelative)) fail("REGISTRY_PATH", "ontology layer escapes profile directory");
    const file = realPath(requestedFile);
    const relative = path.relative(profileRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) fail("REGISTRY_PATH", "ontology layer escapes profile directory");
    const layer = validateLayer(readJson(file), entry.role);
    for (const declaration of layer.types) {
      if (types[declaration.name]) fail("REGISTRY_DUPLICATE", `duplicate type ${declaration.name}`);
      types[declaration.name] = { ...declaration, layer: entry.role, registry: layer.identity.name };
    }
    for (const declaration of layer.predicates) {
      if (predicates[declaration.name]) fail("REGISTRY_DUPLICATE", `duplicate predicate ${declaration.name}`);
      predicates[declaration.name] = { ...declaration, layer: entry.role, registry: layer.identity.name };
    }
    return { role: entry.role, registry: layer };
  });

  for (const type of Object.values(types)) {
    if (type.parent !== null && !types[type.parent]) fail("REGISTRY_TYPE", `unknown parent type ${type.parent}`);
    const visited = new Set([type.name]);
    let parent = type.parent;
    while (parent !== null) {
      if (visited.has(parent)) fail("REGISTRY_TYPE_CYCLE", `type cycle at ${parent}`);
      visited.add(parent);
      parent = types[parent].parent;
    }
  }
  for (const predicate of Object.values(predicates)) {
    for (const type of predicate.argument_types) if (!types[type]) fail("REGISTRY_TYPE", `${predicate.name} uses unknown type ${type}`);
  }

  const snapshot = { schema_version: profile.schema_version, identity: profile.identity, layers };
  const identity = Object.freeze({ ...profile.identity, sha256: sha256(canonicalJson(snapshot)) });
  return Object.freeze({
    schema_version: profile.schema_version,
    identity,
    types: Object.freeze(types),
    predicates: Object.freeze(predicates),
    layers: Object.freeze(layers),
  });
}

const ACTIVE_ONTOLOGY = loadOntologyProfile();
const MEMORY_PREDICATES = Object.freeze(Object.fromEntries(
  Object.entries(ACTIVE_ONTOLOGY.predicates).filter(([, declaration]) => declaration.kind === "base"),
));

function validateRegistryIdentity(identity, expected = ACTIVE_ONTOLOGY.identity) {
  if (!identity || identity.name !== expected.name || identity.version !== expected.version || identity.sha256 !== expected.sha256)
    fail("REGISTRY_IDENTITY", "extraction registry identity does not match the active ontology profile");
  return identity;
}

function printRegistry(registry = ACTIVE_ONTOLOGY) {
  const lines = [`${registry.identity.name}@${registry.identity.version} sha256:${registry.identity.sha256}`];
  for (const role of ["core", "domain"]) {
    lines.push(`\n[${role}]`);
    for (const [name, declaration] of Object.entries(registry.predicates).filter(([, item]) => item.layer === role))
      lines.push(`${name}/${declaration.arity} (${declaration.argument_types.join(", ")}): ${declaration.meaning}`);
  }
  return lines.join("\n");
}

if (require.main === module) process.stdout.write(`${printRegistry()}\n`);

module.exports = {
  ACTIVE_ONTOLOGY,
  MEMORY_PREDICATES,
  RESERVED_PREDICATES,
  canonicalJson,
  loadOntologyProfile,
  printRegistry,
  validateOntologyCandidateName,
  validatePredicateName,
  validateRegistryIdentity,
};
