import { staffUnder } from "./logic";
import type { DB, Question, User } from "./types";

/** Questions this person can see: their own, or their team's when they lead it. */
export function visibleQuestions(db: DB, user: User): Question[] {
  const ids = new Set(staffUnder(db, user).map((u) => u.id));
  ids.add(user.id);
  return db.questions.filter((q) => ids.has(q.askedBy)).sort((a, c) => Number(!!a.answer) - Number(!!c.answer) || c.at.localeCompare(a.at));
}

/** Whether this person answers questions: management for everyone, a supervisor for their team. */
export function canAnswer(db: DB, user: User, q: Question) {
  if (user.role === "admin") return true;
  const asker = db.users.find((u) => u.id === q.askedBy);
  return user.role === "supervisor" && !!asker && asker.teamId === user.teamId;
}

export function waitingQuestions(db: DB, user: User) {
  return visibleQuestions(db, user).filter((q) => !q.answer && canAnswer(db, user, q));
}
