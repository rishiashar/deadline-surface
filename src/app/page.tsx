import { Surface } from "@/components/Surface";
import { sampleModel } from "@/lib/sample-data";
import { readAuthConfig } from "@/lib/gmail/client";
import { buildLiveModel } from "@/lib/gmail/live";
import type { InboxModel } from "@/lib/model";

export const dynamic = "force-dynamic";

function ConnectBanner({ configured }: { configured: boolean }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-medium text-slate-800">Showing sample data</p>
      <p className="mt-0.5 text-sm text-slate-600">
        Connect Gmail to generate this surface from your real inbox. Read-only access
        (<code className="text-xs">gmail.readonly</code>) — nothing is ever sent.
      </p>
      {configured ? (
        <a
          href="/api/gmail/auth"
          className="mt-3 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          Connect Gmail (read-only)
        </a>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and{" "}
          <code>GOOGLE_REDIRECT_URI</code> to enable the connect flow.
        </p>
      )}
    </div>
  );
}

function ConnectedBanner({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div>
        <p className="text-sm font-medium text-slate-800">Connected to Gmail (read-only)</p>
        <p className="mt-0.5 text-sm text-slate-600">
          Generated from {count} recent message{count === 1 ? "" : "s"}. Read-only — nothing is sent.
        </p>
      </div>
      <form action="/api/gmail/disconnect" method="post">
        <button
          type="submit"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Disconnect
        </button>
      </form>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-800">Couldn’t read your inbox</p>
      <p className="mt-0.5 text-sm text-rose-600">{message}</p>
      <a
        href="/api/gmail/auth"
        className="mt-3 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        Reconnect Gmail
      </a>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ gmail_error?: string }>;
}) {
  const { gmail_error } = await searchParams;
  const configured = readAuthConfig() !== null;

  let liveModel: InboxModel | null = null;
  let liveError: string | null = gmail_error ?? null;
  if (configured && !liveError) {
    try {
      liveModel = await buildLiveModel({ query: "newer_than:60d", max: 40 });
    } catch (err) {
      liveError = err instanceof Error ? err.message : "Failed to read inbox.";
    }
  }

  const isLive = liveModel !== null;
  const model = liveModel ?? sampleModel;

  const banner = liveError ? (
    <ErrorBanner message={liveError} />
  ) : isLive ? (
    <ConnectedBanner count={model.messages.length} />
  ) : (
    <ConnectBanner configured={configured} />
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Surface model={model} source={isLive ? "live" : "sample"} banner={banner} />
    </main>
  );
}
