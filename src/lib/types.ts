/**
 * Who does what:
 * - admin: the whole center.
 * - supervisor: one team of callers and teachers, and every file they hold.
 * - caller (داعية): part one, inviting people to Islam.
 * - teacher (معلم): part two, teaching and following up new Muslims.
 * Beneficiaries never log in: they use WhatsApp and a one-page lesson link.
 */
export type Role = "admin" | "supervisor" | "caller" | "teacher";
export type StaffRole = "caller" | "teacher";
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

/** 0 = Sunday … 6 = Saturday, in the learner's own time zone. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Group = {
  id: string;
  name: string;
  ownerId: string;
  kind: "dawah" | "learning";
  language: Lang;
  /** Learning groups follow one track of lessons. */
  trackId: string | null;
  schedule: {
    days: Weekday[];
    /** Local hour for every member, or null to use each member's preferred hour. */
    hour: number | null;
    paused: boolean;
  };
  createdAt: string;
};

export type Beneficiary = {
  id: string;
  name: string;
  /** Shown instead of the name to anyone but the assigned person and their supervisor when sensitive. */
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
  /** The caller who brought them to Islam keeps read access after the handover to a teacher. */
  introducedBy: string | null;
  groupId: string | null;
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
  /** Arabic translation shown under the bubble for staff. */
  translation: string | null;
  at: string;
  authorId: string | null;
  status: "sent" | "delivered" | "read" | null;
  kind: MessageKind;
  /** Lesson link carried by a lesson message. */
  eventId?: string;
  /** Sent by the staff member from their own phone's WhatsApp, opened from the platform. */
  via?: "phone";
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
  /** Set when a follow-up rule created the task, so it is never created twice. */
  rule?: string;
};

/** Text in Arabic and English for staff, plus each beneficiary language. */
export type Multi = { ar: string; en: string } & Partial<Record<Lang, string>>;

export type Track = {
  id: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

export type Lesson = {
  id: string;
  trackId: string;
  order: number;
  status: "ready" | "draft";
  title: Multi;
  /** The one idea of the lesson, in a sentence or two. */
  point: Multi;
  /** A true-or-false statement: two big buttons, nothing to type. */
  question: Multi;
  answer: boolean;
  /** One small thing to do today. */
  practice: Multi;
  /** Length of the voice note in seconds (0 = none yet). */
  audioSec: number;
  updatedAt: string;
  updatedBy: string;
};

export type LessonEvent = {
  /** Also the hard-to-guess link token sent to the learner. */
  id: string;
  beneficiaryId: string;
  lessonId: string;
  sentAt: string;
  sentBy: string | null;
  remindedAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  correct: boolean | null;
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

/**
 * A contact the staff member records with one tap. It covers conversations that happen
 * outside the platform, such as on a caller's personal WhatsApp or a voice call.
 */
export type TouchKind = "chat" | "call" | "no_reply" | "question" | "lesson";
export const TOUCH_KINDS: TouchKind[] = ["chat", "call", "no_reply", "question", "lesson"];

export type Touch = {
  id: string;
  beneficiaryId: string;
  userId: string;
  kind: TouchKind;
  at: string;
  /** What the tap changed on its own, so "undo" can put it back. */
  movedStage?: boolean;
  /** Follow-up tasks due today that this contact settled. */
  closedTasks?: string[];
};

/** One upload of WhatsApp messages into a file: an exported chat, a share or a paste. */
export type ChatImport = {
  id: string;
  beneficiaryId: string;
  userId: string;
  source: "file" | "share" | "paste";
  added: number;
  at: string;
};

/** Text or a chat export shared from the phone, waiting for the staff member to pick the beneficiary. */
export type PendingShare = {
  /** Random, since the phone sends the share before the platform knows who is signed in. */
  id: string;
  userId: string | null;
  text: string;
  fileName: string | null;
  at: string;
};

/** Follow-up rules: the platform creates these tasks on its own. Managed on the rules page. */
export type RuleSettings = {
  /** After any contact with someone in the dawah stages, follow up after this many days. */
  afterContact: { on: boolean; contacted: number; interested: number; learning: number };
  /** After "no answer", try again after this many days; after `tries` in a row, raise it. */
  noAnswer: { on: boolean; days: number; tries: number };
  /** Check in on a new Muslim on these days after embracing Islam. */
  newMuslim: { on: boolean; days: number[] };
  /** A learner who has gone silent gets a check-in. */
  silentLearner: { on: boolean };
  /** Someone new with no contact after this many hours gets a first-contact task. */
  newCase: { on: boolean; hours: number };
};

export type Settings = { rules: RuleSettings; rulesUpdatedAt: string | null; rulesUpdatedBy: string | null };

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
  groups: Group[];
  beneficiaries: Beneficiary[];
  messages: Message[];
  notes: Note[];
  tasks: Task[];
  tracks: Track[];
  lessons: Lesson[];
  events: LessonEvent[];
  assignments: Assignment[];
  touches: Touch[];
  imports: ChatImport[];
  shares: PendingShare[];
  settings: Settings;
  audit: AuditEntry[];
};
