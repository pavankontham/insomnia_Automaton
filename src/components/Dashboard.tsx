"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { daysLeft, usd } from "@/lib/utils";

type Snapshot = {
  serverNow: string;
  readiness?: {
    mocksAllowed: boolean;
    freellmapi: boolean;
    email: boolean;
    payments: boolean;
    canOutreach: boolean;
    canInvoice: boolean;
  };
  epoch: {
    started_at: string;
    ends_at: string;
    survival: string;
    extension_used: number;
    notes: string;
  };
  treasury: {
    owner_cents: number;
    ai_cents: number;
    reserve_cents: number;
    compute_cents: number;
    tools_cents: number;
    experiments_cents: number;
    total_revenue_cents: number;
    total_expense_cents: number;
  };
  controls: {
    paused: number;
    freeze_spending: number;
    freeze_outreach: number;
  };
  capabilities: Array<{
    category: string;
    name: string;
    available: number;
    notes: string;
  }>;
  ideas: Array<{
    id: string;
    title: string;
    niche: string;
    offer: string;
    price_min_cents: number;
    price_max_cents: number;
    channels_json: string;
    strategy: string;
    status: string;
  }>;
  prospects: Array<{
    id: string;
    name: string;
    category: string;
    city: string;
    country: string;
    reviews: number;
    rating: number;
    score: number;
    channel_pref: string;
    website: string | null;
  }>;
  demos: Array<{
    id: string;
    slug: string;
    prospect_name: string;
    qa_score: number;
    status: string;
    pitch_approved?: number;
  }>;
  deals: Array<{
    id: string;
    prospect_name: string;
    stage: string;
    channel: string;
    offered_cents: number | null;
    agreed_cents: number | null;
    payment_cleared: number;
    notes: string;
  }>;
  children: Array<{
    id: string;
    role: string;
    objective: string;
    status: string;
    cost_cents: number;
    revenue_attributed_cents: number;
    kpi_json: string;
    evaluate_by: string;
  }>;
  skills: Array<{ name: string; description: string; enabled: number }>;
  reports: Array<{ id: string; created_at: string; body: string }>;
  messages: Array<{
    id: string;
    created_at: string;
    deal_id: string;
    channel: string;
    direction: string;
    body: string;
    simulated: number;
  }>;
  ledger: Array<{
    id: string;
    created_at: string;
    kind: string;
    amount_cents: number;
    description: string;
  }>;
};

function survivalClass(s: string) {
  if (s === "GREEN") return "badge-green";
  if (s === "YELLOW") return "badge-yellow";
  if (s === "RED") return "badge-red";
  return "badge-boot";
}

export function Dashboard({ initialData }: { initialData?: Snapshot }) {
  const [data, setData] = useState<Snapshot | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");

  const refresh = useCallback(async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch("/api/state", {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Failed to load state (${res.status})`);
      setData(await res.json());
      setError(null);
    } finally {
      clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    // Refresh in background; SSR already painted initialData
    refresh().catch((e) => {
      if (!initialData) setError((e as Error).message);
    });
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, 15_000);
    return () => clearInterval(id);
  }, [refresh, initialData]);

  const day = useMemo(() => {
    if (!data) return 0;
    const start = new Date(data.epoch.started_at).getTime();
    const now = new Date(data.serverNow || data.epoch.started_at).getTime();
    return Math.floor((now - start) / 86400_000) + 1;
  }, [data]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setLog(label);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="muted">
          {error
            ? `Error: ${error}`
            : "Loading owner dashboard… if this sticks, hard-refresh once."}
        </p>
        <button
          className="btn btn-primary mt-4"
          type="button"
          onClick={() =>
            refresh().catch((e) => setError((e as Error).message))
          }
        >
          Retry
        </button>
      </main>
    );
  }

  const pendingIdeas = data.ideas.filter((i) => i.status === "pending");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <header className="fadeup mb-8">
        <p className="muted mono mb-2 tracking-[0.18em] uppercase text-xs">
          Zero-cost · 10-day survival · EN developed markets
        </p>
        <h1
          className="text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          insomnia_Automaton
        </h1>
        <p className="mt-3 max-w-2xl muted">
          You approve ideas. The AI negotiates on live channels only. A deal
          completes only when real payment clears. No mock commercial data.
        </p>
        {data.readiness ? (
          <p className="mt-3 text-sm mono">
            REAL_MODE={!data.readiness.mocksAllowed ? "on" : "off"} · SMTP=
            {data.readiness.email ? "ready" : "missing"} · Stripe=
            {data.readiness.payments ? "ready" : "missing"} · FreeLLM=
            {data.readiness.freellmapi ? "ready" : "missing"}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className={`badge ${survivalClass(data.epoch.survival)}`}>
            {data.epoch.survival}
          </span>
          <span className="badge">Day {day}/10</span>
          <span className="badge">{daysLeft(data.epoch.ends_at)}d left</span>
          {data.controls.paused ? <span className="badge badge-red">Paused</span> : null}
          {data.controls.freeze_outreach ? (
            <span className="badge badge-yellow">Outreach frozen</span>
          ) : null}
        </div>
      </header>

      <section className="fadeup-delay mb-6 flex flex-wrap gap-2">
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            run("heartbeat", async () => {
              const res = await fetch("/api/heartbeat", { method: "POST" });
              const j = await res.json();
              if (!res.ok) throw new Error(j.error || "heartbeat failed");
            })
          }
        >
          Run heartbeat
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            run("idea", async () => {
              await fetch("/api/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create" }),
              });
            })
          }
        >
          Submit idea pack
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            run("pause", async () => {
              await fetch("/api/controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paused: !data.controls.paused }),
              });
            })
          }
        >
          {data.controls.paused ? "Resume" : "Pause all"}
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            run("freeze_spend", async () => {
              await fetch("/api/controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  freeze_spending: !data.controls.freeze_spending,
                }),
              });
            })
          }
        >
          {data.controls.freeze_spending ? "Unfreeze spend" : "Freeze spending"}
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            run("freeze_out", async () => {
              await fetch("/api/controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  freeze_outreach: !data.controls.freeze_outreach,
                }),
              });
            })
          }
        >
          {data.controls.freeze_outreach ? "Unfreeze outreach" : "Freeze outreach"}
        </button>
        <a className="btn" href="/api/export">
          Export data
        </a>
        {log ? <span className="muted mono self-center">last: {log}</span> : null}
        {error ? <span className="badge badge-red">{error}</span> : null}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="panel p-5 md:col-span-1">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Treasury
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="muted">Owner 50%</dt>
              <dd>{usd(data.treasury.owner_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">AI 50%</dt>
              <dd>{usd(data.treasury.ai_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">Reserve</dt>
              <dd>{usd(data.treasury.reserve_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">Compute</dt>
              <dd>{usd(data.treasury.compute_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">Tools</dt>
              <dd>{usd(data.treasury.tools_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">Experiments</dt>
              <dd>{usd(data.treasury.experiments_cents)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--line)] pt-2">
              <dt className="muted">Revenue / Expense</dt>
              <dd>
                {usd(data.treasury.total_revenue_cents)} /{" "}
                {usd(data.treasury.total_expense_cents)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs muted">
            Owner treasury is visible but inaccessible to the agent.
          </p>
        </section>

        <section className="panel p-5 md:col-span-2">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Idea approval
          </h2>
          {pendingIdeas.length === 0 ? (
            <p className="muted text-sm">
              No pending ideas. Run heartbeat or submit an idea pack.
            </p>
          ) : (
            <ul className="space-y-4">
              {pendingIdeas.map((idea) => (
                <li key={idea.id} className="border-t border-[var(--line)] pt-3">
                  <div className="font-medium">{idea.title}</div>
                  <p className="text-sm muted mt-1">{idea.niche}</p>
                  <p className="text-sm mt-2">{idea.offer}</p>
                  <p className="text-sm mono mt-1">
                    {usd(idea.price_min_cents)} – {usd(idea.price_max_cents)} ·{" "}
                    {JSON.parse(idea.channels_json).join(", ")}
                  </p>
                  <p className="text-sm muted mt-2 line-clamp-3">{idea.strategy}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() =>
                        run("approve", async () => {
                          await fetch("/api/ideas", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "approve",
                              id: idea.id,
                            }),
                          });
                        })
                      }
                    >
                      Approve idea
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={busy}
                      onClick={() =>
                        run("reject", async () => {
                          await fetch("/api/ideas", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "reject",
                              id: idea.id,
                              note: "Rejected by owner",
                            }),
                          });
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.ideas.filter((i) => i.status !== "pending").length > 0 ? (
            <div className="mt-4 text-xs muted">
              History:{" "}
              {data.ideas
                .filter((i) => i.status !== "pending")
                .map((i) => `${i.status}`)
                .join(", ")}
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Live deals
          </h2>
          <ul className="space-y-3 text-sm">
            {data.deals.length === 0 ? (
              <li className="muted">No deals yet — approve an idea, then heartbeat.</li>
            ) : (
              data.deals.map((d) => {
                const invoiceMatch =
                  /invoice ((?:inv_|cs_)[A-Za-z0-9_]+)/.exec(d.notes);
                const invoiceId = invoiceMatch?.[1];
                return (
                  <li key={d.id} className="border-t border-[var(--line)] pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{d.prospect_name}</strong>
                      <span className="badge">{d.stage}</span>
                    </div>
                    <p className="muted mono mt-1">
                      {d.channel}
                      {d.offered_cents != null ? ` · offer ${usd(d.offered_cents)}` : ""}
                      {d.payment_cleared ? " · PAID" : ""}
                    </p>
                    {invoiceId && d.stage === "awaiting_payment" ? (
                      <p className="muted mono mt-2">Invoice: {invoiceId}</p>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Children (ROI)
          </h2>
          <ul className="space-y-3 text-sm">
            {data.children.map((c) => {
              const kpi = JSON.parse(c.kpi_json) as Record<string, number>;
              return (
                <li key={c.id} className="border-t border-[var(--line)] pt-3">
                  <div className="flex justify-between gap-2">
                    <strong className="capitalize">{c.role}</strong>
                    <span className="badge">{c.status}</span>
                  </div>
                  <p className="muted mt-1">{c.objective}</p>
                  <p className="mono mt-1">
                    cost {usd(c.cost_cents)} · rev {usd(c.revenue_attributed_cents)} ·
                    leads {kpi.leads ?? 0} · demos {kpi.demos ?? 0} · replies{" "}
                    {kpi.replies ?? 0} · sales {kpi.sales ?? 0}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Prospects
          </h2>
          <ul className="space-y-2 text-sm max-h-80 overflow-auto">
            {data.prospects.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--line)] pt-2"
              >
                <div>
                  <strong>{p.name}</strong>
                  <span className="muted">
                    {" "}
                    · {p.category} · {p.city}, {p.country}
                  </span>
                </div>
                <span className="mono">
                  score {p.score} · {p.reviews} rev · {p.channel_pref}
                  {!p.website ? " · no site" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Demos (review before any email)
          </h2>
          <p className="muted text-sm mb-2">
            No outreach until you approve a pitch. Rebuilds reset approval.
          </p>
          <ul className="space-y-3 text-sm">
            {data.demos.length === 0 ? (
              <li className="muted">No demos yet.</li>
            ) : (
              data.demos.map((d) => (
                <li key={d.id} className="border-t border-[var(--line)] pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      className="underline decoration-[var(--moss)] font-medium"
                      href={`/api/demos/${d.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.prospect_name}
                    </a>
                    <span className="badge">
                      {d.pitch_approved ? "pitch OK" : "awaiting you"}
                    </span>
                  </div>
                  <p className="muted mono mt-1">
                    QA {d.qa_score} · {d.status}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!d.pitch_approved ? (
                      <button
                        className="btn btn-primary"
                        disabled={busy || d.qa_score < 85}
                        onClick={() =>
                          run("pitch", async () => {
                            const res = await fetch("/api/demos/pitch", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                demoId: d.id,
                                approve: true,
                              }),
                            });
                            const j = await res.json();
                            if (!res.ok) throw new Error(j.error || "pitch failed");
                          })
                        }
                      >
                        Approve email pitch
                      </button>
                    ) : (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          run("revoke", async () => {
                            const res = await fetch("/api/demos/pitch", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                demoId: d.id,
                                approve: false,
                              }),
                            });
                            const j = await res.json();
                            if (!res.ok) throw new Error(j.error || "revoke failed");
                          })
                        }
                      >
                        Revoke pitch
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Capability map
          </h2>
          <ul className="space-y-2 text-sm max-h-72 overflow-auto">
            {data.capabilities.map((c) => (
              <li key={`${c.category}-${c.name}`} className="border-t border-[var(--line)] pt-2">
                <span className={c.available ? "text-[var(--moss)]" : "text-[var(--coral)]"}>
                  {c.available ? "●" : "○"}
                </span>{" "}
                <strong>{c.category}</strong> / {c.name}
                <div className="muted text-xs">{c.notes}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Skills
          </h2>
          <ul className="space-y-2 text-sm max-h-72 overflow-auto">
            {data.skills.map((s) => (
              <li key={s.name} className="border-t border-[var(--line)] pt-2">
                <strong>{s.name}</strong>
                <div className="muted">{s.description}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
            CEO report
          </h2>
          <pre className="mono whitespace-pre-wrap text-xs max-h-72 overflow-auto muted">
            {data.reports[0]?.body ?? "No report yet — run heartbeat."}
          </pre>
        </section>
      </div>

      <section className="panel p-5 mt-4">
        <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
          Channel log
        </h2>
        <ul className="space-y-2 text-sm max-h-64 overflow-auto">
          {data.messages.map((m) => (
            <li key={m.id} className="border-t border-[var(--line)] pt-2">
              <span className="badge">{m.direction}</span>{" "}
              <span className="mono muted">
                {m.channel}
                {m.simulated ? " · sim" : ""}
              </span>
              <p className="mt-1">{m.body.slice(0, 280)}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
