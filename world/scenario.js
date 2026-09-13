"use strict";
const { WorldAgent } = require("./agent");
const IDEAS = {
  version: "release-domain-v0",
  core: "agent-world-core-v0",
  predicates: [
    { name: "release", arity: 1 }, { name: "main_down", arity: 1 },
    { name: "backup_ready", arity: 1 }, { name: "certified_route", arity: 1 },
    { name: "note", arity: 1 },
  ],
};
const GOAL = {
  id: "release_episode", text: "Основной сервис упал. Можно ли выпустить orion?",
  query: "release(orion)", action: "request_release_orion",
  questions: [{ id: "backup", text: "Резерв для orion готов?", literal: "backup_ready(orion)", cost: 1 }],
};
async function seed(directory, { independent = false, agentId = "traveller", ruleId = "old_release_rule", omitRule = false, extraHistory = false, budget = {} } = {}) {
  const agent = new WorldAgent(directory, { agent_id: agentId, ideas: IDEAS, startTime: 0 });
  const ruleText = independent
    ? "При отказе основного сервиса выпуск разрешён через подтверждённый независимый маршрут."
    : "При отказе основного сервиса выпуск разрешён при готовности резерва.";
  const old = agent.observe(ruleText, { at: 1, kind: "operator_rule" });
  if (!omitRule) {
    const proposal = agent.propose(old, [{ id: ruleId, program: independent ? "release(X) :- main_down(X), certified_route(X)." : "release(X) :- main_down(X), backup_ready(X)." }]);
    await agent.admit(proposal, { admit: true, by: "fixture_operator", reason: "Explicit rule in the synthetic episode; semantic mapping authored by the fixture." });
  }
  const route = agent.observe("Для orion подтверждён независимый маршрут.", { at: 2, kind: "operator_observation" });
  await agent.admit(agent.propose(route, [{ id: "route_observation", program: "certified_route(orion)." }]), { admit: true, by: "fixture_operator", reason: "Explicit synthetic observation." });
  for (let i = 0; i < 12; i++) agent.observe(`Промежуточное событие ${i + 1}: просмотрен журнал обслуживания.`, { at: 3 + i, kind: "background" });
  if (extraHistory) {
    const extra = agent.observe("В журнал добавлена заметка о цвете метки.", { at: 30 });
    await agent.admit(agent.propose(extra, [{ id: "irrelevant", program: "note(blue)." }]), { admit: true, by: "fixture_operator", reason: "Irrelevant control observation." });
  }
  const current = agent.observe("Основной сервис orion сейчас недоступен.", { at: 100, kind: "operator_observation" });
  await agent.admit(agent.propose(current, [{ id: "outage", program: "main_down(orion)." }]), { admit: true, by: "fixture_operator", reason: "Explicit current synthetic observation." });
  await agent.startGoal({ ...GOAL, budget }); return agent;
}
module.exports = { IDEAS, GOAL, seed };
