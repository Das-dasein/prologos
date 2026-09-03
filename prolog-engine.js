const pl = require("tau-prolog");

function consult(program, limit = 20000) {
  const session = pl.create(limit);
  return new Promise((resolve, reject) => {
    session.consult(program, { success: () => resolve(session), error: reject });
  });
}

function query(session, goal) {
  return new Promise((resolve, reject) => {
    const answers = [];
    session.query(goal, {
      success() {
        session.answers(answer => {
          if (answer === false) return resolve(answers);
          if (answer === null) return reject(new Error("Prolog limit exceeded"));
          answers.push(session.format_answer(answer));
        });
      },
      error: reject,
    });
  });
}

module.exports = { consult, query };

