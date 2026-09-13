"""Finite mathematical appendix, not a new memory engine or CDR benefit run.

The mapping from proof nodes to attacks is explicitly authored for this example.
Dung's definitions evaluate the graph; they do not prescribe this mapping.
"""
import hashlib
import itertools
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ARGUMENTS = {
    "A": {"conclusion": "p", "subconclusions": ["p"], "roots": ["a"]},
    "N": {"conclusion": "neg(p)", "subconclusions": ["neg(p)"], "roots": ["c"]},
    "Q": {"conclusion": "q", "subconclusions": ["q"], "roots": ["b"]},
    "U": {"conclusion": "r", "subconclusions": ["p", "r"], "roots": ["a"], "rules": ["p_to_r"]},
    "V": {"conclusion": "r", "subconclusions": ["q", "r"], "roots": ["b"], "rules": ["q_to_r"]},
    "W": {"conclusion": "neg(r)", "subconclusions": ["p", "neg(r)"], "roots": ["a"], "rules": ["p_to_not_r"]},
}


def opposite(literal):
    return literal[4:-1] if literal.startswith("neg(") else f"neg({literal})"


def evaluate(arguments):
    attacks = {(a, b) for a in arguments for b in arguments
               if opposite(arguments[a]["conclusion"]) in arguments[b]["subconclusions"]}

    def defended(a, accepted):
        return all(any((c, b) in attacks for c in accepted)
                   for b in arguments if (b, a) in attacks)

    def characteristic(accepted):
        return {a for a in arguments if defended(a, accepted)}

    trace, accepted = [[]], set()
    for _ in range(len(arguments) + 1):
        after = characteristic(accepted)
        trace.append(sorted(after))
        if after == accepted:
            break
        accepted = after
    else:
        raise RuntimeError("finite grounded iteration failed to stabilize")

    admissible = []
    names = sorted(arguments)
    for size in range(len(names) + 1):
        for subset in itertools.combinations(names, size):
            s = set(subset)
            if not any(a in s and b in s for a, b in attacks) and all(defended(a, s) for a in s):
                admissible.append(s)
    preferred = [s for s in admissible if not any(s < t for t in admissible)]
    return {"arguments": arguments, "attacks": [list(x) for x in sorted(attacks)],
            "grounded_iteration": trace, "grounded": sorted(accepted),
            "admissible": [sorted(s) for s in admissible],
            "preferred": [sorted(s) for s in preferred],
            "grounded_conclusions": sorted({arguments[a]["conclusion"] for a in accepted})}


if __name__ == "__main__":
    cases = {"independent": evaluate({a: d for a, d in ARGUMENTS.items() if a != "W"}),
             "contested_attack": evaluate(ARGUMENTS)}
    assert cases["independent"]["grounded"] == ["Q", "V"]
    assert cases["contested_attack"]["grounded"] == ["Q"]
    expected_preferred = [{"A", "Q", "U", "V"}, {"N", "Q", "V"}, {"A", "Q", "W"}]
    assert {frozenset(s) for s in cases["contested_attack"]["preferred"]} == {
        frozenset(s) for s in expected_preferred}
    output = {"scope": "authored finite graph; local calculation; no independent review or empirical benefit claim",
              "attack_mapping": "an argument attacks every argument having an opposite subconclusion; no priorities; authored for this example, not mandated by Dung",
              "source": "Dung 1995, definitions 6, 7, 16, 20",
              "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "cases": cases}
    (HERE / "argumentation-observations.json").write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({k: {"grounded": v["grounded"], "preferred": v["preferred"]}
                      for k, v in cases.items()}, indent=2))
