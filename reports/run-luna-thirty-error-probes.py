#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Post-hoc, offline probes. Never changes or rescores the frozen model run."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
WAVE = ROOT / '.cdr/waves/luna-thirty-paired-v1'
OUT = ROOT / 'reports/luna-thirty-error-probes'
OUT.mkdir(exist_ok=True)
IDS = [25,73,105,128,155,198,263,298,375,378,404,406,419]
SOURCE_SHA = '79428ef614d43729ce82e4d065055fdc6a39abad0f20cb226c5288fc315468e4'
source = Path('/private/tmp/prologos-proverqa-hard-90d53cc.json')
if source.exists():
    data = source.read_bytes()
    assert hashlib.sha256(data).hexdigest() == SOURCE_SHA
    records = json.loads(data)
    (OUT/'source-excerpts.json').write_text(json.dumps({'source_sha256':SOURCE_SHA,'purpose':'Scorer-only source fields inspected AFTER the frozen experiment; never model input.','records':[x for x in records if x['id'] in IDS]},ensure_ascii=False,indent=2)+'\n')

def replace(program, old, new):
    assert old in program, old
    return program.replace(old,new)

def xor_axiom(program, label, fragment):
    lines = program.splitlines()
    found = 0
    for i,line in enumerate(lines):
        if line.startswith('axiom('+label+','):
            assert fragment in line
            lines[i] = line.replace(fragment,fragment.replace('or(','xor(',1),1)
            found += 1
    assert found == 1
    return '\n'.join(lines)

all_results=[]
for i in IDS:
    record=json.loads((WAVE/f'raw-r1-verdicts/case-{i}/record.json').read_text())
    formal=record['formalization']['output']; p=formal['program']; q=formal['query']
    variants=[('baseline',p,q,'Frozen program and original submitted query, unchanged.')]
    def add(name,program,query=q,note='Counterfactual program; not a model answer or rerun of M2.'):
        variants.append((name,program,query,note))
    if i==25:
        add('source-xor',xor_axiom(p,'s10','or(develops_new_openings'),note='Source nl2fol has XOR; visible NL says not necessarily both.')
    if i==73:
        add('source-xor',xor_axiom(p,'s8','or(supports_human_rights'),note='Source nl2fol has XOR; visible NL says no one necessarily does both.')
    if i==105:
        typed=p+'\naxiom(probe_type,farmer(ronan)).\n'
        add('type-only',typed)
        xp=xor_axiom(p,'s4','or(diversifies_farm')
        add('source-xor-only',xp)
        add('type-and-source-xor',xp+'\naxiom(probe_type,farmer(ronan)).\n')
    if i==128:
        xp=xor_axiom(p,'s9','or(timid')
        add('source-xor-s9',xp)
        xp2=xor_axiom(p,'s20','or(adventurous')
        add('source-xor-s20',xp2)
        add('source-two-xors',xor_axiom(xp,'s20','or(adventurous'))
    if i==155:
        n=replace(p,'can_overcome_fear(','overcomes_fear(')
        add('normalize-fear',n)
        add('restore-negative',p+'\naxiom(probe_missing,not(performs_well(elina))).\n')
        add('normalize-and-restore',n+'\naxiom(probe_missing,not(performs_well(elina))).\n')
    if i==198:
        a=replace(p,'has_proper_training(','has_training(')
        b=replace(p,'responds_to_emergencies_effectively(','responds_to_emergencies(')
        add('normalize-training',a)
        add('normalize-response',b)
        add('normalize-both',replace(a,'responds_to_emergencies_effectively(','responds_to_emergencies('))
    if i==263:
        add('source-xor',xor_axiom(p,'s10','or(adapts_to_host'))
    if i==298:
        add('type-robot',p+'\naxiom(probe_type,robot(muppet)).\n',note='Add the domain membership implicitly used in source nl2fol. It is not explicitly stated in visible NL.')
    if i==375:
        add('source-xor',xor_axiom(p,'s10','or(enjoys_city_life'),note='Source nl2fol XOR contradicts the visible words not mutually exclusive.')
    if i==378:
        qq=q.replace('receives_accolades(','receive_accolades(')
        add('query-only',p,qq)
        n=replace(p,'develop_new_techniques(','develops_new_techniques(')
        n=replace(n,'improves_existing_processes(','improve_existing_processes(')
        n=replace(n,'advances_his_field(','advance_field(')
        n=replace(n,'advances_their_field(','advance_field(')
        add('normalize-names',n,qq)
        add('normalize-and-type',n+'\naxiom(probe_type,scientist(clark)).\n',qq)
    if i==404:
        n=replace(p,'[or(organized(julian),creates_new_opportunities(julian))]','or(organized(julian),creates_new_opportunities(julian))')
        add('valid-head-only',n)
        add('head-and-type',n+'\naxiom(probe_type,human(julian)).\n')
        nn=replace(n,'keeps_things_tidy(','organized(')
        add('head-and-name',nn)
        add('head-name-type',nn+'\naxiom(probe_type,human(julian)).\n')
    if i==406:
        n=replace(p,'embrace_uncertainty(','embraces_uncertainty(')
        add('normalize-name',n)
        x=xor_axiom(p,'s14','or(pursues_creative_passions')
        add('source-xor-only',x)
        add('normalize-and-source-xor',xor_axiom(n,'s14','or(pursues_creative_passions'))
    if i==419:
        add('source-xor',xor_axiom(p,'s14','or(honors_culture'))
    for name,program,query,note in variants:
        stem=f'case-{i}-{name}'
        candidate=OUT/(stem+'.pl')
        candidate.write_text(":- use_module('../../finite-fol-meta-prover.pl').\n"+program+'\n')
        (OUT/(stem+'-query.txt')).write_text(query+'\n')
        command=['swipl','-q','-s',str(candidate),'-g',query+",write_term(Status,[quoted(true)]),nl,write_term(Package,[quoted(true)]),nl,halt",'-t','halt(2)']
        result=subprocess.run(command,capture_output=True,text=True,timeout=10,cwd=ROOT)
        (OUT/(stem+'-stdout.txt')).write_text(result.stdout)
        (OUT/(stem+'-stderr.txt')).write_text(result.stderr)
        status=result.stdout.splitlines()[0] if result.stdout else None
        row={'id':i,'variant':name,'status':status,'exit_code':result.returncode,'program_sha256':hashlib.sha256(program.encode()).hexdigest(),'query':query,'query_sha256':hashlib.sha256(query.encode()).hexdigest(),'candidate':str(candidate.relative_to(ROOT)),'stdout':str((OUT/(stem+'-stdout.txt')).relative_to(ROOT)),'stderr':str((OUT/(stem+'-stderr.txt')).relative_to(ROOT)),'note':note}
        all_results.append(row)
        print(i,name,status)
report={'status':'post-hoc-offline-counterfactual-probes','scored_as_model_runs':False,'frozen_results_unchanged':True,'source_sha256':SOURCE_SHA,'prover_sha256':hashlib.sha256((ROOT/'finite-fol-meta-prover.pl').read_bytes()).hexdigest(),'timeout_seconds_per_fresh_process':10,'results':all_results}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
