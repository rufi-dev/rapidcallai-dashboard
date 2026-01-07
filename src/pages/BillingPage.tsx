import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "../components/ui";
import { CreditCard, ExternalLink } from "lucide-react";
import { getBillingSummary, getBillingUsage, type BillingSummary, type BillingUsageResponse } from "../lib/api";
import { toast } from "sonner";

type InvoiceRow = {
  id: string;
  createdAt: string;
  amount: string;
  status: "paid" | "ongoing";
};

const MOCK_INVOICES: InvoiceRow[] = [
  { id: "2026-01-03", createdAt: "3 Jan 2026", amount: "$15.00", status: "paid" },
  { id: "2025-12-24", createdAt: "24 Dec 2025", amount: "$13.41", status: "paid" },
];

export function BillingPage() {
  const [tab, setTab] = useState<"history" | "usage">("history");
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingErr, setBillingErr] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const [usageBucket, setUsageBucket] = useState<"day" | "week">("day");
  const [usageFrom, setUsageFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [usageTo, setUsageTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageErr, setUsageErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const b = await getBillingSummary();
        if (!mounted) return;
        setBilling(b);
        setBillingErr(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load billing summary";
        if (!mounted) return;
        setBilling(null);
        setBillingErr(msg);
        toast.error(msg);
      } finally {
        if (mounted) setBillingLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadUsage() {
    setUsageLoading(true);
    setUsageErr(null);
    try {
      const from = new Date(`${usageFrom}T00:00:00.000Z`).getTime();
      const to = new Date(`${usageTo}T23:59:59.999Z`).getTime();
      const u = await getBillingUsage({ from, to, bucket: usageBucket });
      setUsage(u);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load billing usage";
      setUsage(null);
      setUsageErr(msg);
      toast.error(msg);
    } finally {
      setUsageLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "usage") return;
    // load on first open
    if (!usage && !usageLoading) void loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const rows = useMemo(() => {
    const upcoming = {
      id: "upcoming",
      createdAt: "Upcoming invoice",
      amount:
        billing?.upcomingInvoiceUsd != null
          ? `$${billing.upcomingInvoiceUsd.toFixed(2)}`
          : billingLoading
            ? "Loading…"
            : "—",
      status: "ongoing" as const,
    };
    return [upcoming, ...MOCK_INVOICES];
  }, [billing?.upcomingInvoiceUsd, billingLoading]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight">Billing</div>
          <div className="mt-2 max-w-2xl text-sm text-slate-300">
            This page is Stripe-ready. You’ll manage subscriptions, invoices, and usage here.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <ExternalLink size={16} /> Change payment methods
          </Button>
          <Button>
            <CreditCard size={16} /> Manage billing
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("history")}
              className={[
                "rounded-xl px-3 py-2 text-sm transition",
                tab === "history" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              Billing history
            </button>
            <button
              onClick={() => setTab("usage")}
              className={[
                "rounded-xl px-3 py-2 text-sm transition",
                tab === "usage" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              Usage
            </button>
          </div>
        </div>

        {tab === "history" ? (
          <div className="p-4">
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3 font-medium">Invoice created</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <>
                      <tr
                        key={r.id}
                        className="border-b border-white/5 last:border-b-0 cursor-pointer hover:bg-white/5"
                        onClick={() => setExpandedInvoice((cur) => (cur === r.id ? null : r.id))}
                        title="Toggle details"
                      >
                        <td className="px-3 py-3 text-slate-200">{r.createdAt}</td>
                        <td className="px-3 py-3 text-slate-200">{r.amount}</td>
                        <td className="px-3 py-3">
                          <span
                            className={[
                              "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs",
                              r.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-200"
                                : "bg-white/5 text-slate-200",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1.5 w-1.5 rounded-full",
                                r.status === "paid" ? "bg-emerald-400" : "bg-slate-300",
                              ].join(" ")}
                            />
                            {r.status === "paid" ? "Paid" : "Ongoing"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button variant="secondary">{expandedInvoice === r.id ? "Hide" : "Details"}</Button>
                        </td>
                      </tr>

                      {expandedInvoice === r.id ? (
                        <tr className="border-b border-white/5 last:border-b-0">
                          <td colSpan={4} className="px-3 pb-4">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                              <div className="text-sm font-semibold text-white">Included charges</div>
                              <div className="mt-3 space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-slate-300">LLM</div>
                                  <div className="font-semibold text-white">
                                    {billing?.breakdown?.llmUsd != null ? `$${billing.breakdown.llmUsd.toFixed(2)}` : "—"}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-slate-300">STT</div>
                                  <div className="font-semibold text-white">
                                    {billing?.breakdown?.sttUsd != null ? `$${billing.breakdown.sttUsd.toFixed(2)}` : "—"}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-slate-300">TTS</div>
                                  <div className="font-semibold text-white">
                                    {billing?.breakdown?.ttsUsd != null ? `$${billing.breakdown.ttsUsd.toFixed(2)}` : "—"}
                                  </div>
                                </div>
                                {typeof billing?.breakdown?.phoneNumbersUsd === "number" && billing.breakdown.phoneNumbersUsd > 0 ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-slate-300">Phone numbers</div>
                                    <div className="font-semibold text-white">${billing.breakdown.phoneNumbersUsd.toFixed(2)}</div>
                                  </div>
                                ) : null}
                                {typeof billing?.breakdown?.platformUsageUsd === "number" && billing.breakdown.platformUsageUsd > 0 ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-slate-300">Platform usage</div>
                                    <div className="font-semibold text-white">${billing.breakdown.platformUsageUsd.toFixed(2)}</div>
                                  </div>
                                ) : null}
                                {typeof billing?.breakdown?.platformBaseUsd === "number" && billing.breakdown.platformBaseUsd > 0 ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-slate-300">Platform base</div>
                                    <div className="font-semibold text-white">${billing.breakdown.platformBaseUsd.toFixed(2)}</div>
                                  </div>
                                ) : null}
                                {typeof billing?.otherUsd === "number" && billing.otherUsd > 0 ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-slate-300">Other</div>
                                    <div className="font-semibold text-white">${billing.otherUsd.toFixed(2)}</div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-4 text-xs text-slate-500">
                                {billing?.upcomingInvoiceUsd != null ? `Estimated total: $${billing.upcomingInvoiceUsd.toFixed(2)}` : "Estimated total: —"}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              {billingErr
                ? `Billing summary unavailable: ${billingErr}`
                : billing && (!billing.pricingConfigured.llm || !billing.pricingConfigured.stt || !billing.pricingConfigured.tts)
                  ? "Set LLM/STT/TTS pricing on the server to enable accurate usage-based billing."
                  : "Billing history will be powered by Stripe later; upcoming invoice is estimated from usage."}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Usage period</div>
                <input
                  type="date"
                  value={usageFrom}
                  onChange={(e) => setUsageFrom(e.target.value)}
                  className="date-input-brand rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                />
                <div className="text-slate-500">→</div>
                <input
                  type="date"
                  value={usageTo}
                  onChange={(e) => setUsageTo(e.target.value)}
                  className="date-input-brand rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
                  <button
                    onClick={() => setUsageBucket("day")}
                    className={[
                      "rounded-lg px-3 py-1.5 transition",
                      usageBucket === "day" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setUsageBucket("week")}
                    className={[
                      "rounded-lg px-3 py-1.5 transition",
                      usageBucket === "week" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    Week
                  </button>
                </div>
                <Button variant="secondary" onClick={() => void loadUsage()} disabled={usageLoading}>
                  {usageLoading ? "Loading…" : "Apply"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Total cost</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {usage?.totals?.totalUsd != null ? `$${Number(usage.totals.totalUsd).toFixed(2)}` : usageLoading ? "Loading…" : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {usage?.range ? `From ${new Date(usage.range.from).toLocaleDateString()} to ${new Date(usage.range.to).toLocaleDateString()}` : ""}
                </div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Call minutes</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {usage?.totals?.callMinutes != null ? `${Number(usage.totals.callMinutes).toFixed(2)} mins` : usageLoading ? "Loading…" : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">{usage?.totals?.calls != null ? `${usage.totals.calls} calls` : ""}</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Billed minutes</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {(usage?.totals as any)?.billedCallMinutes != null
                    ? `${Number((usage?.totals as any).billedCallMinutes).toFixed(2)} mins`
                    : usageLoading
                      ? "Loading…"
                      : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">After rounding/minimums</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Average cost per minute</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {usage?.totals?.totalUsd != null && (usage?.totals as any)?.billedCallMinutes
                    ? `$${(Number(usage.totals.totalUsd) / Math.max(0.0001, Number((usage.totals as any).billedCallMinutes))).toFixed(2)}`
                    : usage?.totals?.totalUsd != null && usage?.totals?.callMinutes
                      ? `$${(Number(usage.totals.totalUsd) / Math.max(0.0001, Number(usage.totals.callMinutes))).toFixed(2)}`
                    : usageLoading
                      ? "Loading…"
                      : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">Includes fixed fees in this range</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">COGS per minute</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {usage?.totals?.callMinutes && (usage.totals as any).cogsUsd != null
                    ? `$${(Number((usage.totals as any).cogsUsd) / Math.max(0.0001, Number(usage.totals.callMinutes))).toFixed(3)}`
                    : usageLoading
                      ? "Loading…"
                      : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">Internal (includes overhead allocation)</div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">Total cost over time</div>
                  <div className="text-xs text-slate-500">{usageBucket === "week" ? "Weekly" : "Daily"}</div>
                </div>
                <div className="mt-3 h-56">
                  {usage?.series?.length ? (
                    <svg width="100%" height="100%" viewBox="0 0 600 220" preserveAspectRatio="none">
                      {(() => {
                        const pts = usage.series.map((p, i) => ({ x: i, y: Number(p.totalUsd || 0) }));
                        const maxY = Math.max(1e-6, ...pts.map((p) => p.y));
                        const minY = Math.min(0, ...pts.map((p) => p.y));
                        const w = 600;
                        const h = 220;
                        const padX = 20;
                        const padY = 16;
                        const spanX = Math.max(1, pts.length - 1);
                        const scaleX = (w - padX * 2) / spanX;
                        const scaleY = (h - padY * 2) / Math.max(1e-6, maxY - minY);
                        const d = pts
                          .map((p) => {
                            const x = padX + p.x * scaleX;
                            const y = h - padY - (p.y - minY) * scaleY;
                            return `${p.x === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
                          })
                          .join(" ");
                        return (
                          <>
                            <path d={d} fill="none" stroke="rgba(56,189,248,0.9)" strokeWidth="3" className="auth-chart-line-draw" />
                            <path d={d} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="10" className="auth-chart-line-draw" />
                          </>
                        );
                      })()}
                    </svg>
                  ) : usageLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No data in range</div>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-950/30 p-4">
                <div className="text-xs text-slate-400">Cost by category</div>
                {usage?.totals ? (
                  <div className="mt-3 space-y-3 text-sm">
                    {(() => {
                      const minutes = Math.max(0.0001, Number(usage.totals.callMinutes || 0));
                      const retailTotal = Number((usage.totals as any).retailUsd || 0);
                      const breakdown = ((usage.totals as any).retailBreakdownUsd || null) as null | Record<string, number>;

                      const items = breakdown
                        ? Object.entries(breakdown)
                            .map(([k, v]) => ({ k, v: Number(v || 0) }))
                            .filter((it) => it.v > 0.00001)
                            .sort((a, b) => b.v - a.v)
                        : [
                            { k: "LLM", v: Number((usage.totals as any).llmUsd || 0) },
                            { k: "STT", v: Number((usage.totals as any).sttUsd || 0) },
                            { k: "TTS", v: Number((usage.totals as any).ttsUsd || 0) },
                            { k: "Phone numbers", v: Number(usage.totals.phoneNumbersUsd || 0) },
                            { k: "Platform base", v: Number(usage.totals.platformBaseUsd || 0) },
                          ].filter((it) => it.v > 0.00001);

                      const denom = Math.max(1e-6, retailTotal || Number(usage.totals.totalUsd || 0));
                      const max = Math.max(1e-6, ...items.map((i) => i.v));

                      return items.map((it) => {
                        const usdPerMin = it.v / minutes;
                        const pct = (it.v / denom) * 100;
                        return (
                          <div key={it.k}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-slate-300">{it.k}</div>
                              <div className="text-right">
                                <div className="font-semibold text-white">${it.v.toFixed(2)}</div>
                                <div className="text-xs text-slate-400">${usdPerMin.toFixed(4)}/min · {pct.toFixed(0)}%</div>
                              </div>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white/5">
                              <div className="h-2 rounded-full bg-sky-400/70" style={{ width: `${Math.max(2, Math.round((it.v / max) * 100))}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : usageLoading ? (
                  <div className="mt-3 text-sm text-slate-400">Loading…</div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">No data</div>
                )}
              </Card>
            </div>

            {usageErr ? <div className="mt-4 text-xs text-rose-200">Failed to load usage: {usageErr}</div> : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Plan</div>
                <div className="mt-2 text-lg font-semibold text-white">Pay as you go</div>
                <div className="mt-1 text-sm text-slate-300">Stripe integration coming next.</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Upcoming invoice</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {billing?.upcomingInvoiceUsd != null ? `$${billing.upcomingInvoiceUsd.toFixed(2)}` : billingLoading ? "Loading…" : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">This month (estimated)</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Recommended price per minute</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {billing?.totals?.retail?.recommendedRetailUsdPerMin != null
                    ? `$${Number(billing.totals.retail.recommendedRetailUsdPerMin).toFixed(3)}/min`
                    : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-300">Recommended sell price (COGS + buffer + target margin)</div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">LiveKit metering (debug)</div>
                <div className="mt-2 text-sm text-slate-200">
                  Webhook participant minutes:{" "}
                  <span className="font-semibold text-white">
                    {billing?.totals?.participantMinutes != null ? Number(billing.totals.participantMinutes).toFixed(2) : "—"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-200">
                  Agent-estimated participant minutes:{" "}
                  <span className="font-semibold text-white">
                    {billing?.totals?.participantMinutesEstimated != null
                      ? Number(billing.totals.participantMinutesEstimated).toFixed(2)
                      : "—"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Webhook coverage:{" "}
                  {billing?.totals?.livekitWebhookCalls != null && billing?.totals?.calls != null
                    ? `${billing.totals.livekitWebhookCalls}/${billing.totals.calls} calls`
                    : "—"}
                </div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">What should these mean?</div>
                <div className="mt-2 text-sm text-slate-300">
                  Webhook minutes are derived from LiveKit participant join/leave events with per-session rounding (matches LiveKit billing shape).
                  Estimated minutes come from agent participant sampling and are a fallback/validation signal.
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Charges breakdown</div>
                {billing?.breakdown ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-slate-300">LLM</div>
                      <div className="font-semibold text-white">${billing.breakdown.llmUsd.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-slate-300">STT</div>
                      <div className="font-semibold text-white">${billing.breakdown.sttUsd.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-slate-300">TTS</div>
                      <div className="font-semibold text-white">${billing.breakdown.ttsUsd.toFixed(2)}</div>
                    </div>
                    {typeof billing.breakdown.phoneNumbersUsd === "number" && billing.breakdown.phoneNumbersUsd > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Phone numbers</div>
                        <div className="font-semibold text-white">${billing.breakdown.phoneNumbersUsd.toFixed(2)}</div>
                      </div>
                    ) : null}
                    {typeof billing.breakdown.platformUsageUsd === "number" && billing.breakdown.platformUsageUsd > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Platform usage</div>
                        <div className="font-semibold text-white">${billing.breakdown.platformUsageUsd.toFixed(2)}</div>
                      </div>
                    ) : null}
                    {typeof billing.breakdown.platformBaseUsd === "number" && billing.breakdown.platformBaseUsd > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Platform base</div>
                        <div className="font-semibold text-white">${billing.breakdown.platformBaseUsd.toFixed(2)}</div>
                      </div>
                    ) : null}
                    {typeof billing.otherUsd === "number" && billing.otherUsd > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Other</div>
                        <div className="font-semibold text-white">${billing.otherUsd.toFixed(2)}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-300">
                    {billingLoading ? "Loading…" : "No breakdown yet (missing pricing or no completed calls in range)."}
                  </div>
                )}
                <div className="mt-3 text-xs text-slate-500">
                  Usage-based estimate. Final invoices will be issued via Stripe later.
                </div>
              </Card>

              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Usage totals (this month)</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">LLM prompt tokens</div>
                    <div className="mt-1 font-semibold text-white">{billing?.usageTotals.llmPromptTokens ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">LLM completion tokens</div>
                    <div className="mt-1 font-semibold text-white">{billing?.usageTotals.llmCompletionTokens ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">STT audio seconds</div>
                    <div className="mt-1 font-semibold text-white">
                      {billing?.usageTotals.sttAudioSeconds != null ? Number(billing.usageTotals.sttAudioSeconds).toFixed(2) : "0.00"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">TTS characters</div>
                    <div className="mt-1 font-semibold text-white">{billing?.usageTotals.ttsCharacters ?? 0}</div>
                  </div>
                </div>
              </Card>
            </div>

            {billingErr ? (
              <div className="mt-4 text-xs text-rose-200">
                Billing summary unavailable: {billingErr}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}


