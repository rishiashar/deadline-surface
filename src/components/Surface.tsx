"use client";

import { useMemo, useRef, useState } from "react";
import type { InboxModel, Message, Deadline, Action, ReplyPayload } from "@/lib/model";
import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/sample-data";
import { AuditLog, approve, commit, undo } from "@/lib/actions/rails";
import { formatDue, relativeDue, urgency } from "@/lib/format";
import { CategoryTag, ConfidenceBadge } from "./ConfidenceBadge";
import { Provenance } from "./Provenance";
import { EmptyState } from "./EmptyState";

const URGENCY_BAR: Record<ReturnType<typeof urgency>, string> = {
  overdue: "bg-rose-400",
  soon: "bg-amber-400",
  upcoming: "bg-slate-300",
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {typeof count === "number" ? (
          <span className="text-xs text-slate-400">{count}</span>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function Surface({
  model,
  source = "sample",
  banner,
}: {
  model: InboxModel;
  source?: "sample" | "live";
  banner?: React.ReactNode;
}) {
  const messageById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of model.messages) map.set(m.id, m);
    return map;
  }, [model.messages]);

  // §6: dismissed low-confidence items disappear ("agent learns"); confirmed
  // ones are promoted to normal. Tracked locally for the demo.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const auditRef = useRef(new AuditLog());
  const [actions, setActions] = useState<Action[]>(model.actions);

  const deadlines = model.deadlines
    .filter((d) => !dismissed.has(d.id))
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  const confident = deadlines.filter(
    (d) => d.confidence >= LOW_CONFIDENCE_THRESHOLD || confirmed.has(d.id),
  );
  const needsConfirm = deadlines.filter(
    (d) => d.confidence < LOW_CONFIDENCE_THRESHOLD && !confirmed.has(d.id),
  );

  function runAction(id: string, fn: (a: Action, log: AuditLog) => Action) {
    setActions((prev) => prev.map((a) => (a.id === id ? fn(a, auditRef.current) : a)));
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      {banner ? <div className="mb-6">{banner}</div> : null}
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">
          Deadline surface
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Never miss an emailed deadline, form, or professor reply.
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generated over your Gmail — email-derived due dates only. Each item links back to its
          source email.
        </p>
      </header>

      {/* Due soon */}
      <Section title="Due soon" count={confident.length}>
        {confident.length === 0 ? (
          <EmptyState
            title="Nothing due in the next 7 days"
            hint="A quiet week is a designed state — not a blank screen."
          />
        ) : (
          confident.map((d) => <DeadlineRow key={d.id} d={d} message={messageById.get(d.source_msg_id)} />)
        )}
      </Section>

      {/* Needs confirmation (low-confidence, §6) */}
      {needsConfirm.length > 0 ? (
        <Section title="Looks like a deadline — confirm?" count={needsConfirm.length}>
          {needsConfirm.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{d.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{formatDue(d.due_at)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <CategoryTag category={d.category} />
                    <ConfidenceBadge confidence={d.confidence} />
                    <Provenance message={messageById.get(d.source_msg_id)} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirmed((s) => new Set(s).add(d.id))}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Yes, add it
                </button>
                <button
                  onClick={() => setDismissed((s) => new Set(s).add(d.id))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Not a deadline
                </button>
              </div>
            </div>
          ))}
        </Section>
      ) : null}

      {/* Events */}
      <Section title="Events" count={model.events.length}>
        {model.events.length === 0 ? (
          <EmptyState title="No events detected" />
        ) : (
          model.events.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{e.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{formatDue(e.starts_at)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ConfidenceBadge confidence={e.confidence} />
                    <Provenance message={messageById.get(e.source_msg_id)} />
                  </div>
                </div>
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                  Add to calendar
                </button>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Needs a reply */}
      <Section title="Needs a reply" count={actions.length}>
        {actions.length === 0 ? (
          <EmptyState title="No threads waiting on you" />
        ) : (
          actions.map((a) => (
            <ReplyRow
              key={a.id}
              action={a}
              message={messageById.get(a.source_msg_id)}
              onApprove={() => runAction(a.id, approve)}
              onSend={() => runAction(a.id, commit)}
              onUndo={() => runAction(a.id, undo)}
            />
          ))
        )}
      </Section>

      <p className="mt-10 text-center text-xs text-slate-300">
        {source === "live" ? "Live data from your connected inbox (read-only)" : "Sample data"} ·
        surface generated from the internal model (§5). No email is sent without preview + approval
        + undo (§6).
      </p>
    </div>
  );
}

function DeadlineRow({ d, message }: { d: Deadline; message: Message | undefined }) {
  const u = urgency(d.due_at);
  return (
    <div className="flex items-stretch gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className={`w-1 rounded-full ${URGENCY_BAR[u]}`} aria-hidden />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-slate-800">{d.title}</p>
          <span
            className={`text-xs font-medium ${u === "overdue" ? "text-rose-600" : u === "soon" ? "text-amber-600" : "text-slate-400"}`}
          >
            {relativeDue(d.due_at)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{formatDue(d.due_at)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CategoryTag category={d.category} />
          <ConfidenceBadge confidence={d.confidence} />
          <Provenance message={message} />
        </div>
      </div>
    </div>
  );
}

function ReplyRow({
  action,
  message,
  onApprove,
  onSend,
  onUndo,
}: {
  action: Action;
  message: Message | undefined;
  onApprove: () => void;
  onSend: () => void;
  onUndo: () => void;
}) {
  const payload = action.payload as ReplyPayload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-slate-800">{message?.subject ?? payload.subject}</p>
        <Provenance message={message} />
      </div>
      {message ? <p className="mt-1 text-sm text-slate-500">{message.body}</p> : null}

      {/* Preview the exact payload before any write (§6). */}
      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Drafted reply</p>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{payload.body}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {action.status === "proposed" ? (
          <button
            onClick={onApprove}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            Review &amp; approve
          </button>
        ) : null}
        {action.status === "approved" ? (
          <button
            onClick={onSend}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Send
          </button>
        ) : null}
        {action.status === "done" ? (
          <>
            <span className="text-xs font-medium text-emerald-600">Sent</span>
            <button
              onClick={onUndo}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Undo
            </button>
          </>
        ) : null}
        {action.status === "undone" ? (
          <span className="text-xs font-medium text-slate-400">Undone — nothing was sent</span>
        ) : null}
        <span className="ml-auto text-xs text-slate-300">Nothing auto-sends</span>
      </div>
    </div>
  );
}
