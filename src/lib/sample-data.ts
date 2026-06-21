/**
 * Sample normalized model for the demo surface.
 *
 * The live surface reads a real InboxModel produced by the normalizer +
 * extractor. Until Gmail is wired, the page renders from this sample so the
 * generated-surface UX (and the §6 shadow paths) can be designed and reviewed.
 *
 * It deliberately includes a LOW-CONFIDENCE deadline to exercise the
 * "Looks like a deadline — confirm?" flagged state (§6).
 */

import type { InboxModel, Message, Person } from "@/lib/model";

function daysFromNow(days: number, hour = 23, minute = 59): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const profLee: Person = { email: "prof.lee@centennial.edu", name: "Prof. Lee", role_guess: "professor" };
const profGomez: Person = { email: "prof.gomez@centennial.edu", name: "Prof. Gomez", role_guess: "professor" };
const registrar: Person = { email: "registrar@centennial.edu", name: "Registrar", role_guess: "admin" };
const finance: Person = { email: "finance@centennial.edu", name: "Student Finance", role_guess: "admin" };
const devClub: Person = { email: "events@devclub.centennial.edu", name: "Dev Club", role_guess: "club" };

const messages: Message[] = [
  { id: "m1", thread: "t1", from: registrar, subject: "Final exam schedule posted", body: "Your COMP248 final exam is scheduled.", date: daysFromNow(-3), labels: ["INBOX"] },
  { id: "m2", thread: "t2", from: profLee, subject: "Assignment 3 — submission details", body: "Please submit Assignment 3 on the portal.", date: daysFromNow(-2), labels: ["INBOX"] },
  { id: "m3", thread: "t3", from: registrar, subject: "Course feedback survey", body: "Complete the feedback form.", date: daysFromNow(-4), labels: ["INBOX"] },
  { id: "m4", thread: "t4", from: finance, subject: "Tuition payment reminder", body: "Outstanding tuition balance.", date: daysFromNow(-1), labels: ["INBOX"] },
  { id: "m5", thread: "t5", from: devClub, subject: "Club workshop — RSVP needed", body: "Intro-to-React workshop. Please RSVP.", date: daysFromNow(-5), labels: ["INBOX"] },
  { id: "m6", thread: "t6", from: profGomez, subject: "Re: your project topic", body: "Can you confirm whether you will use the dataset we discussed?", date: daysFromNow(-1), labels: ["INBOX"] },
  { id: "m7", thread: "t7", from: registrar, subject: "Possible deadline in attachment?", body: "See attached PDF for important dates.", date: daysFromNow(-1), labels: ["INBOX"] },
];

const people: Person[] = [profLee, profGomez, registrar, finance, devClub];

export const sampleModel: InboxModel = {
  messages,
  people,
  deadlines: [
    { id: "dl_m1", title: "COMP248 final exam", due_at: daysFromNow(4, 9, 0), category: "exam", source_msg_id: "m1", confidence: 0.96 },
    { id: "dl_m2", title: "Assignment 3 submission", due_at: daysFromNow(2), category: "assignment", source_msg_id: "m2", confidence: 0.88 },
    { id: "dl_m3", title: "Course feedback survey", due_at: daysFromNow(6), category: "form", source_msg_id: "m3", confidence: 0.7 },
    { id: "dl_m4", title: "Tuition fee balance", due_at: daysFromNow(20), category: "fee", source_msg_id: "m4", confidence: 0.84 },
    // Low-confidence → flagged "confirm?" state (§6), never silently committed.
    { id: "dl_m7", title: "Possible deadline (from PDF attachment)", due_at: daysFromNow(5), category: "assignment", source_msg_id: "m7", confidence: 0.42 },
  ],
  events: [
    { id: "ev_m5", title: "Dev Club: Intro-to-React workshop", starts_at: daysFromNow(3, 17, 0), source_msg_id: "m5", confidence: 0.8 },
  ],
  actions: [
    {
      id: "act_m6",
      type: "reply",
      status: "proposed",
      source_msg_id: "m6",
      payload: {
        kind: "reply",
        thread: "t6",
        to: profGomez.email,
        subject: "Re: your project topic",
        body: "Hi Prof. Gomez,\n\nYes — I'll use the dataset we discussed. I'll have the updated proposal to you by Friday.\n\nThanks!",
      },
    },
  ],
};

/** Confidence below this is shown flagged ("confirm?"), not as committed (§6). */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
