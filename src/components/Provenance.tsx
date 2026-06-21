import type { Message } from "@/lib/model";

/**
 * Provenance link back to the source email (§3, §5). Every extracted item must
 * be traceable to the message it came from — this is the trust anchor.
 */
export function Provenance({ message }: { message: Message | undefined }) {
  if (!message) return null;
  return (
    <a
      href={`https://mail.google.com/mail/u/0/#inbox/${message.thread}`}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
      title="Open the source email in Gmail"
    >
      <span className="underline decoration-dotted underline-offset-2">
        from {message.from.name}
      </span>
      <span aria-hidden>↗</span>
    </a>
  );
}
