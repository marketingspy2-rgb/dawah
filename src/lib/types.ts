export type Role = "admin" | "supervisor" | "caller";
export type Gender = "m" | "f";
export type UiLang = "ar" | "en";

/** Languages the center works in with beneficiaries. */
export type Lang = "es" | "fil" | "ur" | "bn" | "hi" | "fr";
export const LANGS: Lang[] = ["es", "fil", "ur", "bn", "hi", "fr"];

/** Part one (dawah) runs new → learning; "muslim" moves the person to part two. */
export type Stage = "new" | "contacted" | "interested" | "learning" | "muslim" | "paused" | "closed";
export const STAGES: Stage[] = ["new", "contacted", "interested", "learning", "muslim", "paused", "closed"];
export const DAWAH_FUNNEL: Stage[] = ["new", "contacted", "interested", "learning", "muslim"];

export type User = {
  id: string;
  name: string;
  role: Role;
  gender: Gender;
  languages: Lang[];
  teamId: string | null;
  status: "available" | "leave" | "left";
  lastSeenAt: string | null;
};

export type Team = { id: string; name: string; supervisorId: string };

export type Beneficiary = {
  id: string;
  name: string;
  /** Shown instead of the name to anyone but the assigned caller and supervisor when sensitive. */
  alias: string;
  gender: Gender;
  language: Lang;
  country: string;
  timezone: string;
  phone: string;
  /** Preferred local hour (0-23) for lessons and messages. */
  preferredHour: number;
  stage: Stage;
  stageHistory: { stage: Stage; at: string }[];
  assignedTo: string;
  sensitive: boolean;
  background: string;
  needs: string;
  objections: string[];
  source: string;
  createdAt: string;
  convertedAt: string | null;
  summary: { text: string; generatedAt: string; reviewed: boolean } | null;
  optedOut: boolean;
};

export type MessageKind = "text" | "template" | "lesson" | "quiz" | "imported";

export type Message = {
  id: string;
  beneficiaryId: string;
  direction: "in" | "out";
  text: string;
  /** Arabic translation shown under the bubble for the caller. */
  translation: string | null;
  at: string;
  authorId: string | null;
  status: "sent" | "delivered" | "read" | null;
  kind: MessageKind;
};

export type Note = {
  id: string;
  beneficiaryId: string;
  authorId: string;
  text: string;
  at: string;
  needsContact: boolean;
};

export type TaskKind = "followup" | "first_contact" | "checkin";

export type Task = {
  id: string;
  beneficiaryId: string;
  assigneeId: string;
  title: string;
  kind: TaskKind;
  due: string;
  createdAt: string;
  doneAt: string | null;
};

export type Lesson = {
  id: string;
  order: number;
  title: { ar: string; en: string };
  question: { ar: string; en: string };
};

export type LessonEvent = {
  lesson: number;
  sentAt: string;
  startedAt: string | null;
  completedAt: string | null;
  correct: boolean | null;
};

export type Progress = {
  beneficiaryId: string;
  events: LessonEvent[];
};

export type Assignment = {
  id: string;
  beneficiaryId: string;
  fromId: string | null;
  toId: string;
  byId: string;
  reason: string;
  at: string;
};

export type AuditEntry = {
  id: string;
  userId: string;
  action: string;
  target: string;
  at: string;
};

export type DB = {
  version: number;
  seededAt: string;
  users: User[];
  teams: Team[];
  beneficiaries: Beneficiary[];
  messages: Message[];
  notes: Note[];
  tasks: Task[];
  lessons: Lesson[];
  progress: Progress[];
  assignments: Assignment[];
  audit: AuditEntry[];
};
